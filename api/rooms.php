<?php
/**
 * api/rooms.php
 * CRUD for room categories and rooms.
 * Data stored in ../data/rooms.json
 * Shape: { "categories": {...}, "rooms": {...} }
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

define('DATA_FILE', __DIR__ . '/../data/rooms.json');
define('UPLOAD_DIR', __DIR__ . '/../images/rooms/');

function readData(): array {
    if (!file_exists(DATA_FILE)) return ['categories' => [], 'rooms' => []];
    $data = json_decode(file_get_contents(DATA_FILE), true) ?? [];
    if (!isset($data['categories'])) $data['categories'] = [];
    if (!isset($data['rooms']))      $data['rooms']      = [];
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
    $filename = uniqid('room_') . '.' . strtolower($ext);
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
    $action = $_GET['action'] ?? 'list';
    $data   = readData();

    if ($action === 'list') {
        $cats  = sortedCategories($data['categories']);
        $rooms = array_values($data['rooms']);
        usort($rooms, fn($a, $b) => ($a['number'] ?? '') <=> ($b['number'] ?? ''));
        respond(['categories' => $cats, 'rooms' => $rooms]);
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
            'id'          => $id,
            'name'        => trim($input['name']),
            'description' => trim($input['description'] ?? ''),
            'order'       => (int)($input['order'] ?? $maxOrder + 1),
        ];
        $data['categories'][$id] = $cat;
        writeData($data);
        respond(['success' => true, 'category' => $cat], 201);
    }

    if ($action === 'update_category') {
        $id = $input['id'] ?? null;
        if (!$id || !isset($data['categories'][$id])) respond(['error' => 'Category not found'], 404);
        if (isset($input['name']))        $data['categories'][$id]['name']        = trim($input['name']);
        if (isset($input['description'])) $data['categories'][$id]['description'] = trim($input['description']);
        if (isset($input['order']))       $data['categories'][$id]['order']       = (int)$input['order'];
        writeData($data);
        respond(['success' => true, 'category' => $data['categories'][$id]]);
    }

    if ($action === 'delete_category') {
        $id = $input['id'] ?? null;
        if (!$id || !isset($data['categories'][$id])) respond(['error' => 'Category not found'], 404);
        $hasRooms = !empty(array_filter($data['rooms'], fn($r) => ($r['category_id'] ?? '') === $id));
        if ($hasRooms) respond(['error' => 'Cannot delete category with rooms. Remove rooms first.'], 409);
        unset($data['categories'][$id]);
        writeData($data);
        respond(['success' => true]);
    }

    // ── Room actions ──────────────────────────────────────────────
    if ($action === 'add') {
        $required = ['name', 'price', 'number', 'category_id'];
        foreach ($required as $f) {
            if (empty($input[$f])) respond(['error' => "Field '$f' is required"], 422);
        }
        if (!isset($data['categories'][$input['category_id']])) respond(['error' => 'Invalid category'], 422);

        $image = handleImageUpload();
        $amenStr = $input['amenities'] ?? '';
        $amenities = is_array($amenStr) ? $amenStr : array_filter(array_map('trim', explode(',', $amenStr)));

        $room = [
            'id'               => 'room_' . uniqid(),
            'number'           => trim($input['number']),
            'name'             => trim($input['name']),
            'category_id'      => trim($input['category_id']),
            'price'            => (float)$input['price'],
            'discounted_price' => isset($input['discounted_price']) && $input['discounted_price'] !== ''
                                    ? (float)$input['discounted_price'] : null,
            'description'      => trim($input['description'] ?? ''),
            'amenities'        => array_values($amenities),
            'images'           => [],
            'available'        => true,
            'created_at'       => date('c'),
        ];
        if ($image) $room['images'][] = $image;

        $data['rooms'][$room['id']] = $room;
        writeData($data);
        respond(['success' => true, 'room' => $room], 201);
    }

    if ($action === 'update') {
        $id = $input['id'] ?? null;
        if (!$id || !isset($data['rooms'][$id])) respond(['error' => 'Room not found'], 404);

        $updatable = ['number', 'name', 'category_id', 'price', 'discounted_price', 'description', 'amenities', 'available'];
        foreach ($updatable as $f) {
            if (!array_key_exists($f, $input)) continue;
            if ($f === 'price')            $data['rooms'][$id][$f] = (float)$input[$f];
            elseif ($f === 'discounted_price') $data['rooms'][$id][$f] = $input[$f] !== '' ? (float)$input[$f] : null;
            elseif ($f === 'amenities') {
                $a = $input[$f];
                $data['rooms'][$id][$f] = is_array($a)
                    ? array_values($a)
                    : array_values(array_filter(array_map('trim', explode(',', $a))));
            }
            else $data['rooms'][$id][$f] = $input[$f];
        }

        $image = handleImageUpload();
        if ($image) $data['rooms'][$id]['images'][] = $image;
        $data['rooms'][$id]['updated_at'] = date('c');
        writeData($data);
        respond(['success' => true, 'room' => $data['rooms'][$id]]);
    }

    if ($action === 'toggle_availability') {
        $id = $input['id'] ?? null;
        if (!$id || !isset($data['rooms'][$id])) respond(['error' => 'Room not found'], 404);
        $data['rooms'][$id]['available'] = !$data['rooms'][$id]['available'];
        writeData($data);
        respond(['success' => true, 'available' => $data['rooms'][$id]['available']]);
    }

    respond(['error' => 'Unknown action'], 400);
}

// DELETE
if ($method === 'DELETE') {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $id    = $input['id'] ?? $_GET['id'] ?? null;
    if (!$id) respond(['error' => 'Room ID required'], 422);
    $data = readData();
    if (!isset($data['rooms'][$id])) respond(['error' => 'Room not found'], 404);
    foreach ($data['rooms'][$id]['images'] ?? [] as $img) {
        $f = UPLOAD_DIR . $img;
        if (file_exists($f)) unlink($f);
    }
    unset($data['rooms'][$id]);
    writeData($data);
    respond(['success' => true]);
}

respond(['error' => 'Method not allowed'], 405);
