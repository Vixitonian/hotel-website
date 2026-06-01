<?php
/**
 * api/config.php
 * Handles admin authentication and hotel config read/write.
 * Credentials stored in ../data/config.json — never exposed to client.
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

define('CONFIG_FILE', __DIR__ . '/../data/config.json');

function readConfig(): array {
    if (!file_exists(CONFIG_FILE)) return [];
    return json_decode(file_get_contents(CONFIG_FILE), true) ?? [];
}

function writeConfig(array $config): void {
    file_put_contents(CONFIG_FILE, json_encode($config, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

function respond(array $payload, int $status = 200): void {
    http_response_code($status);
    echo json_encode($payload);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

// GET — return public hotel info only (never password)
if ($method === 'GET') {
    $action = $_GET['action'] ?? 'hotel';
    if ($action === 'hotel') {
        $config = readConfig();
        respond(['hotel' => $config['hotel'] ?? []]);
    }
    respond(['error' => 'Unknown action'], 400);
}

// POST — auth or update
if ($method === 'POST') {
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    if (str_contains($contentType, 'application/json')) {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
    } else {
        $input = $_POST;
    }

    $action = $input['action'] ?? '';

    // Verify password
    if ($action === 'auth') {
        $submitted = $input['password'] ?? '';
        $config    = readConfig();
        $stored    = $config['admin']['password'] ?? '';

        if ($submitted === $stored) {
            respond(['success' => true]);
        } else {
            respond(['success' => false, 'error' => 'Incorrect password'], 401);
        }
    }

    // Update admin password
    if ($action === 'update_password') {
        $current = $input['current_password'] ?? '';
        $newPass = trim($input['new_password'] ?? '');
        $config  = readConfig();
        $stored  = $config['admin']['password'] ?? '';

        if ($current !== $stored) {
            respond(['success' => false, 'error' => 'Current password is incorrect'], 401);
        }
        if (strlen($newPass) < 8) {
            respond(['success' => false, 'error' => 'New password must be at least 8 characters'], 422);
        }

        $config['admin']['password'] = $newPass;
        writeConfig($config);
        respond(['success' => true]);
    }

    // Update hotel info
    if ($action === 'update_hotel') {
        $config = readConfig();
        $hotel  = $config['hotel'] ?? [];

        $updatable = ['name', 'phone', 'whatsapp', 'email', 'address'];
        foreach ($updatable as $field) {
            if (isset($input[$field])) $hotel[$field] = trim($input[$field]);
        }
        if (isset($input['social']) && is_array($input['social'])) {
            $hotel['social'] = $input['social'];
        }

        $config['hotel'] = $hotel;
        writeConfig($config);
        respond(['success' => true, 'hotel' => $hotel]);
    }

    respond(['error' => 'Unknown action'], 400);
}

respond(['error' => 'Method not allowed'], 405);
