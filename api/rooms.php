<?php
/**
 * api/rooms.php
 * Handles GET (list), POST (add), DELETE for rooms.
 * Data stored in ../data/rooms.json
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

define('DATA_FILE', __DIR__ . '/../data/rooms.json');
define('UPLOAD_DIR', __DIR__ . '/../images/rooms/');

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
    return 'room_' . uniqid();
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

// ── Route ─────────────────────────────────────────────────────
$method = $_SERVER['REQUEST_METHOD'];

// GET — list rooms
if ($method === 'GET') {
    $action = $_GET['action'] ?? 'list';
    if ($action !== 'list') respond(['error' => 'Unknown action'], 400);

    $rooms = readData();
    respond(['rooms' => array_values($rooms)]);
}

// POST — add / update room
if ($method === 'POST') {
    // Support JSON body or multipart form-data
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
        // Validate required fields
        $required = ['name', 'price'];
        foreach ($required as $field) {
            if (empty($input[$field])) {
                respond(['error' => "Field '$field' is required"], 422);
            }
        }

        $image = handleImageUpload();

        $room = [
            'id'          => generateId(),
            'name'        => trim($input['name']),
            'type'        => trim($input['type'] ?? 'Deluxe'),
            'price'       => (float) $input['price'],
            'capacity'    => (int) ($input['capacity'] ?? 2),
            'size'        => trim($input['size'] ?? ''),
            'bed'         => trim($input['bed'] ?? 'King'),
            'description' => trim($input['description'] ?? ''),
            'amenities'   => isset($input['amenities'])
                                ? (is_array($input['amenities']) ? $input['amenities'] : explode(',', $input['amenities']))
                                : [],
            'image'       => $image,
            'available'   => true,
            'created_at'  => date('c'),
        ];

        $rooms      = readData();
        $rooms[$room['id']] = $room;
        writeData($rooms);

        respond(['success' => true, 'room' => $room], 201);
    }

    if ($action === 'update') {
        $id    = $input['id'] ?? null;
        $rooms = readData();

        if (!$id || !isset($rooms[$id])) respond(['error' => 'Room not found'], 404);

        $updatable = ['name', 'type', 'price', 'capacity', 'size', 'bed', 'description', 'amenities', 'available'];
        foreach ($updatable as $field) {
            if (array_key_exists($field, $input)) $rooms[$id][$field] = $input[$field];
        }

        $image = handleImageUpload();
        if ($image) $rooms[$id]['image'] = $image;

        $rooms[$id]['updated_at'] = date('c');
        writeData($rooms);

        respond(['success' => true, 'room' => $rooms[$id]]);
    }

    respond(['error' => 'Unknown action'], 400);
}

// DELETE — remove room
if ($method === 'DELETE') {
    $body  = file_get_contents('php://input');
    $input = json_decode($body, true) ?? [];
    $id    = $input['id'] ?? $_GET['id'] ?? null;

    if (!$id) respond(['error' => 'Room ID required'], 422);

    $rooms = readData();
    if (!isset($rooms[$id])) respond(['error' => 'Room not found'], 404);

    // Optionally delete image file
    $imgFile = UPLOAD_DIR . ($rooms[$id]['image'] ?? '');
    if (!empty($rooms[$id]['image']) && file_exists($imgFile)) unlink($imgFile);

    unset($rooms[$id]);
    writeData($rooms);

    respond(['success' => true]);
}

respond(['error' => 'Method not allowed'], 405);
