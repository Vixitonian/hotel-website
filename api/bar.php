<?php
/**
 * api/bar.php
 * CRUD for bar menu categories and items.
 * Data stored in ../data/bar.json
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

define('DATA_FILE', __DIR__ . '/../data/bar.json');
define('UPLOAD_DIR', __DIR__ . '/../images/bar/');

function readData(): array {
    if (!file_exists(DATA_FILE)) return ['categories' => [], 'items' => []];
    $data = json_decode(file_get_contents(DATA_FILE), true) ?? [];
    if (!isset($data['categories'])) $data['categories'] = [];
    if (!isset($data['items']))      $data['items']      = [];
    return $data;
}

function writeData(array $data): void {
    file_put_contents(DATA_FILE, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

function respond(array $payload, int $status = 200): void {
    http_response_code($status);
    echo json_encode($payload);
    exit;
}

function handleImageUpload(): ?string {
    if (empty($_FILES['image']['tmp_name'])) return null;
    $file    = $_FILES['image'];
    $allowed = ['image/jpeg', 'image/png', 'image/webp'];
    $mime    = mime_content_type($file['tmp_name']);
    if (!in_array($mime, $allowed)) return null;
    $ext      = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = uniqid('bar_') . '.' . strtolower($ext);
    $dest     = UPLOAD_DIR . $filename;
    if (!is_dir(UPLOAD_DIR)) mkdir(UPLOAD_DIR, 0755, true);
    return move_uploaded_file($file['tmp_name'], $dest) ? $filename : null;
}

function sortedCategories(array $cats): array {
    $arr = array_values($cats);
    usort($arr, fn($a, $b) => ($a['order'] ?? 99) <=> ($b['order'] ?? 99));
    return $arr;
}

$method = $_SERVER['REQUEST_METHOD'];

// GET
if ($method === 'GET') {
    $action   = $_GET['action'] ?? 'list';
    $data     = readData();

    if ($action === 'list') {
        $cats  = sortedCategories($data['categories']);
        $items = array_values($data['items']);
        respond(['categories' => $cats, 'items' => $items]);
    }
    if ($action === 'list_categories') {
        respond(['categories' => sortedCategories($data['categories'])]);
    }
    respond(['error' => 'Unknown action'], 400);
}

// POST
if ($method === 'POST') {
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    if (str_contains($contentType, 'application/json')) {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
    } else {
        $input = $_POST;
    }
    $action = $input['action'] ?? 'add';
    $data   = readData();

    // ── Category actions ──────────────────────────────────────────
    if ($action === 'add_category') {
        if (empty($input['name'])) respond(['error' => 'Category name required'], 422);
        $id = strtolower(preg_replace('/[^a-z0-9]+/i', '-', trim($input['name']))) . '-' . uniqid();
        $maxOrder = empty($data['categories']) ? 0 : max(array_column(array_values($data['categories']), 'order'));
        $cat = [
            'id'    => $id,
            'name'  => trim($input['name']),
            'order' => (int)($input['order'] ?? $maxOrder + 1),
        ];
        $data['categories'][$id] = $cat;
        writeData($data);
        respond(['success' => true, 'category' => $cat], 201);
    }

    if ($action === 'update_category') {
        $id = $input['id'] ?? null;
        if (!$id || !isset($data['categories'][$id])) respond(['error' => 'Category not found'], 404);
        if (!empty($input['name']))  $data['categories'][$id]['name']  = trim($input['name']);
        if (isset($input['order']))  $data['categories'][$id]['order'] = (int)$input['order'];
        writeData($data);
        respond(['success' => true, 'category' => $data['categories'][$id]]);
    }

    if ($action === 'delete_category') {
        $id = $input['id'] ?? null;
        if (!$id || !isset($data['categories'][$id])) respond(['error' => 'Category not found'], 404);
        $hasItems = !empty(array_filter($data['items'], fn($i) => ($i['category_id'] ?? '') === $id));
        if ($hasItems) respond(['error' => 'Cannot delete category with items. Remove items first.'], 409);
        unset($data['categories'][$id]);
        writeData($data);
        respond(['success' => true]);
    }

    // ── Item actions ──────────────────────────────────────────────
    if ($action === 'add') {
        if (empty($input['name'])) respond(['error' => 'Item name required'], 422);
        if (!isset($input['price'])) respond(['error' => 'Price required'], 422);
        $catId = $input['category_id'] ?? '';
        if (!isset($data['categories'][$catId])) respond(['error' => 'Invalid category'], 422);
        $image = handleImageUpload();
        $item = [
            'id'          => 'bar_' . uniqid(),
            'name'        => trim($input['name']),
            'category_id' => $catId,
            'price'       => (float)$input['price'],
            'description' => trim($input['description'] ?? ''),
            'image'       => $image,
            'available'   => true,
            'created_at'  => date('c'),
        ];
        $data['items'][$item['id']] = $item;
        writeData($data);
        respond(['success' => true, 'item' => $item], 201);
    }

    if ($action === 'update') {
        $id = $input['id'] ?? null;
        if (!$id || !isset($data['items'][$id])) respond(['error' => 'Item not found'], 404);
        $updatable = ['name', 'category_id', 'price', 'description', 'available'];
        foreach ($updatable as $f) {
            if (array_key_exists($f, $input)) $data['items'][$id][$f] = $input[$f];
        }
        if (isset($data['items'][$id]['price'])) $data['items'][$id]['price'] = (float)$data['items'][$id]['price'];
        $image = handleImageUpload();
        if ($image) $data['items'][$id]['image'] = $image;
        $data['items'][$id]['updated_at'] = date('c');
        writeData($data);
        respond(['success' => true, 'item' => $data['items'][$id]]);
    }

    if ($action === 'toggle_availability') {
        $id = $input['id'] ?? null;
        if (!$id || !isset($data['items'][$id])) respond(['error' => 'Item not found'], 404);
        $data['items'][$id]['available'] = !$data['items'][$id]['available'];
        writeData($data);
        respond(['success' => true, 'available' => $data['items'][$id]['available']]);
    }

    respond(['error' => 'Unknown action'], 400);
}

// DELETE
if ($method === 'DELETE') {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $id    = $input['id'] ?? $_GET['id'] ?? null;
    if (!$id) respond(['error' => 'Item ID required'], 422);
    $data = readData();
    if (!isset($data['items'][$id])) respond(['error' => 'Item not found'], 404);
    $imgFile = UPLOAD_DIR . ($data['items'][$id]['image'] ?? '');
    if (!empty($data['items'][$id]['image']) && file_exists($imgFile)) unlink($imgFile);
    unset($data['items'][$id]);
    writeData($data);
    respond(['success' => true]);
}

respond(['error' => 'Method not allowed'], 405);
