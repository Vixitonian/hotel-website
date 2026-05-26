<?php
/**
 * api/menu.php
 * Handles GET (list), POST (add), DELETE for menu items.
 * Data stored in ../data/menu.json
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

define('DATA_FILE', __DIR__ . '/../data/menu.json');
define('UPLOAD_DIR', __DIR__ . '/../images/food/');

// ── Helpers ──────────────────────────────────────────────────
function readData(): array {
    if (!file_exists(DATA_FILE)) return [];
    $json = file_get_contents(DATA_FILE);
    return json_decode($json, true) ?? [];
}

function writeData(array $data): void {
    file_put_contents(DATA_FILE, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

function respond(array $payload, int $status = 200): void {
    http_response_code($status);
    echo json_encode($payload);
    exit;
}

function generateId(): string {
    return 'item_' . uniqid();
}

function handleImageUpload(): ?string {
    if (empty($_FILES['image']['tmp_name'])) return null;

    $file    = $_FILES['image'];
    $allowed = ['image/jpeg', 'image/png', 'image/webp'];
    $mime    = mime_content_type($file['tmp_name']);

    if (!in_array($mime, $allowed)) return null;

    $ext      = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = uniqid('food_') . '.' . strtolower($ext);
    $dest     = UPLOAD_DIR . $filename;

    if (!is_dir(UPLOAD_DIR)) mkdir(UPLOAD_DIR, 0755, true);

    return move_uploaded_file($file['tmp_name'], $dest) ? $filename : null;
}

// ── Route ─────────────────────────────────────────────────────
$method = $_SERVER['REQUEST_METHOD'];

// GET — list menu items
if ($method === 'GET') {
    $action   = $_GET['action'] ?? 'list';
    $category = $_GET['category'] ?? null;

    if ($action !== 'list') respond(['error' => 'Unknown action'], 400);

    $items = array_values(readData());

    if ($category) {
        $items = array_filter($items, fn($i) => ($i['category'] ?? '') === $category);
        $items = array_values($items);
    }

    respond(['items' => $items]);
}

// POST — add / update menu item
if ($method === 'POST') {
    $input = [];
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';

    if (str_contains($contentType, 'application/json')) {
        $body  = file_get_contents('php://input');
        $input = json_decode($body, true) ?? [];
    } else {
        $input = $_POST;
    }

    $action = $input['action'] ?? 'add';

    if ($action === 'add') {
        $required = ['name', 'price'];
        foreach ($required as $field) {
            if (empty($input[$field])) respond(['error' => "Field '$field' is required"], 422);
        }

        $image = handleImageUpload();

        $categories = ['Breakfast', 'Starters', 'Main', 'Dessert', 'Drinks'];
        $cat = in_array($input['category'] ?? '', $categories) ? $input['category'] : 'Main';

        $item = [
            'id'          => generateId(),
            'name'        => trim($input['name']),
            'category'    => $cat,
            'price'       => (float) $input['price'],
            'description' => trim($input['description'] ?? ''),
            'image'       => $image,
            'available'   => true,
            'created_at'  => date('c'),
        ];

        $items          = readData();
        $items[$item['id']] = $item;
        writeData($items);

        respond(['success' => true, 'item' => $item], 201);
    }

    if ($action === 'update') {
        $id    = $input['id'] ?? null;
        $items = readData();

        if (!$id || !isset($items[$id])) respond(['error' => 'Item not found'], 404);

        $updatable = ['name', 'category', 'price', 'description', 'available'];
        foreach ($updatable as $field) {
            if (array_key_exists($field, $input)) $items[$id][$field] = $input[$field];
        }

        $image = handleImageUpload();
        if ($image) $items[$id]['image'] = $image;

        $items[$id]['updated_at'] = date('c');
        writeData($items);

        respond(['success' => true, 'item' => $items[$id]]);
    }

    respond(['error' => 'Unknown action'], 400);
}

// DELETE — remove menu item
if ($method === 'DELETE') {
    $body  = file_get_contents('php://input');
    $input = json_decode($body, true) ?? [];
    $id    = $input['id'] ?? $_GET['id'] ?? null;

    if (!$id) respond(['error' => 'Item ID required'], 422);

    $items = readData();
    if (!isset($items[$id])) respond(['error' => 'Item not found'], 404);

    $imgFile = UPLOAD_DIR . ($items[$id]['image'] ?? '');
    if (!empty($items[$id]['image']) && file_exists($imgFile)) unlink($imgFile);

    unset($items[$id]);
    writeData($items);

    respond(['success' => true]);
}

respond(['error' => 'Method not allowed'], 405);
