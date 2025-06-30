<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

require_once 'config.php';

// Unified response function
function jsonResponse($success, $data = [], $error = null) {
    echo json_encode([
        'success' => $success,
        'data' => $data,
        'error' => $error
    ]);
    exit;
}

try {
    $dsn = "pgsql:host=".DB_HOST.";port=".DB_PORT.";dbname=".DB_NAME;
    $pdo = new PDO($dsn, DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Get the request method and input data
    $method = $_SERVER['REQUEST_METHOD'];
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Handle different endpoints
    $endpoint = $_GET['endpoint'] ?? '';
    $action = $_GET['action'] ?? '';
    
    if (!empty($endpoint)) {
        // Handle endpoints using handlers
        switch($endpoint) {
            case 'rooms':
                require_once 'handlers/room_handler.php';
                handleRoomRequest($method, $input, $pdo);
                break;
                
            case 'patients':
                require_once 'handlers/patient_handler.php';
                handlePatientRequest($method, $input, $pdo);
                break;
                
            case 'staff':
                require_once 'handlers/staff_handler.php';
                handleStaffRequest($method, $input, $pdo);
                break;
                
            default:
                jsonResponse(false, null, 'Invalid endpoint');
        }
    } else if (!empty($action)) {
        // Handle legacy actions
        switch($action) {
            case 'login':
                handleLogin($pdo);
                break;
            case 'getRooms':
                getRooms($pdo);
                break;
            case 'getPatients':
                getPatients($pdo);
                break;
            case 'getStaff':
                getStaff($pdo);
                break;
            case 'addRoom':
                addRoom($pdo);
                break;
            case 'addPatient':
                addPatient($pdo);
                break;
            case 'addStaff':
                addStaff($pdo);
                break;
            case 'updateRoom':
                updateRoom($pdo);
                break;
            case 'updatePatient':
                updatePatient($pdo);
                break;
            case 'updateStaff':
                updateStaff($pdo);
                break;
            case 'deleteRoom':
                deleteRoom($pdo);
                break;
            case 'deletePatient':
                deletePatient($pdo);
                break;
            case 'deleteStaff':
                deleteStaff($pdo);
                break;
            case 'getDashboardStats':
                getDashboardStats($pdo);
                break;
            default:
                jsonResponse(false, null, 'Invalid action');
        }
    } else {
        jsonResponse(false, null, 'No endpoint or action specified');
    }
} catch(PDOException $e) {
    jsonResponse(false, null, 'Database error: ' . $e->getMessage());
}

// Authentication functions
function verifyAuthenticated() {
    $headers = getallheaders();
    $token = $headers['Authorization'] ?? str_replace('Bearer ', '', $_SERVER['HTTP_AUTHORIZATION'] ?? '');
    
    if (empty($token)) {
        jsonResponse(false, null, 'Authorization token required');
    }
    
    global $pdo;
    
    $stmt = $pdo->prepare("SELECT u.* FROM user_tokens ut JOIN users u ON ut.user_id = u.id WHERE ut.token = ? AND ut.expires_at > CURRENT_TIMESTAMP");
    $stmt->execute([$token]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        jsonResponse(false, null, 'Invalid or expired token');
    }
    
    return $user;
}

function verifyAdminAccess() {
    $user = verifyAuthenticated();
    
    if ($user['role'] !== 'admin') {
        jsonResponse(false, null, 'Admin access required');
    }
    
    return $user;
}

function verifyMedicalStaffAccess() {
    $user = verifyAuthenticated();
    
    if (!in_array($user['role'], ['admin', 'doctor', 'nurse'])) {
        jsonResponse(false, null, 'Medical staff access required');
    }
    
    return $user;
}

function getUserIdFromToken() {
    $headers = getallheaders();
    $token = $headers['Authorization'] ?? str_replace('Bearer ', '', $_SERVER['HTTP_AUTHORIZATION'] ?? '');
    
    if (empty($token)) {
        return null;
    }
    
    global $pdo;
    
    $stmt = $pdo->prepare("SELECT user_id FROM user_tokens WHERE token = ? AND expires_at > CURRENT_TIMESTAMP");
    $stmt->execute([$token]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    return $result ? $result['user_id'] : null;
}

// Legacy action handlers
function handleLogin($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    $username = $data['username'] ?? '';
    $password = $data['password'] ?? '';
    
    if (empty($username) || empty($password)) {
        jsonResponse(false, null, 'Username and password are required');
    }
    
    $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user || !password_verify($password, $user['password'])) {
        jsonResponse(false, null, 'Invalid username or password');
    }
    
    // Generate token
    $token = bin2hex(random_bytes(32));
    $expires = date('Y-m-d H:i:s', strtotime('+1 day'));
    
    // Store token in database
    $stmt = $pdo->prepare("INSERT INTO user_tokens (user_id, token, expires_at) VALUES (?, ?, ?)");
    $stmt->execute([$user['id'], $token, $expires]);
    
    // Remove sensitive data before returning
    unset($user['password']);
    
    jsonResponse(true, [
        'token' => $token,
        'user' => $user
    ]);
}

function getRooms($pdo) {
    $type = $_GET['type'] ?? null;
    $status = $_GET['status'] ?? null;
    
    $sql = "SELECT * FROM rooms WHERE 1=1";
    $params = [];
    
    if ($type) {
        $sql .= " AND room_type = ?";
        $params[] = $type;
    }
    
    if ($status) {
        $sql .= " AND status = ?";
        $params[] = $status;
    }
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rooms = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get patient counts for each room
    foreach ($rooms as &$room) {
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM room_assignments WHERE room_id = ? AND discharge_date IS NULL");
        $stmt->execute([$room['id']]);
        $room['patient_count'] = $stmt->fetchColumn();
    }
    
    jsonResponse(true, $rooms);
}

function getPatients($pdo) {
    $search = $_GET['search'] ?? null;
    $severity = $_GET['severity'] ?? null;
    
    $sql = "SELECT p.*, 
                   r.room_number, 
                   CONCAT(p.first_name, ' ', p.last_name) AS full_name,
                   EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.dob)) AS age
            FROM patients p
            LEFT JOIN room_assignments ra ON p.id = ra.patient_id AND ra.discharge_date IS NULL
            LEFT JOIN rooms r ON ra.room_id = r.id
            WHERE 1=1";
    $params = [];
    
    if ($search) {
        $sql .= " AND (p.first_name ILIKE ? OR p.last_name ILIKE ? OR p.patient_id ILIKE ?)";
        $searchTerm = "%$search%";
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
    }
    
    if ($severity) {
        $sql .= " AND p.severity = ?";
        $params[] = $severity;
    }
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $patients = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    jsonResponse(true, $patients);
}

function getStaff($pdo) {
    $role = $_GET['role'] ?? null;
    $search = $_GET['search'] ?? null;
    
    $sql = "SELECT u.*, s.specialization, s.shift 
            FROM users u
            LEFT JOIN staff s ON u.id = s.user_id
            WHERE u.role IN ('doctor', 'nurse', 'admin')";
    $params = [];
    
    if ($role) {
        $sql .= " AND u.role = ?";
        $params[] = $role;
    }
    
    if ($search) {
        $sql .= " AND (u.full_name ILIKE ? OR u.email ILIKE ?)";
        $searchTerm = "%$search%";
        $params[] = $searchTerm;
        $params[] = $searchTerm;
    }
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $staff = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    jsonResponse(true, $staff);
}

function addRoom($pdo) {
    verifyAdminAccess();
    
    $data = json_decode(file_get_contents('php://input'), true);
    
    $required = ['room_number', 'room_type', 'capacity', 'status'];
    foreach ($required as $field) {
        if (empty($data[$field])) {
            jsonResponse(false, null, "$field is required");
        }
    }
    
    $stmt = $pdo->prepare("INSERT INTO rooms (room_number, room_type, capacity, status) VALUES (?, ?, ?, ?)");
    $stmt->execute([$data['room_number'], $data['room_type'], $data['capacity'], $data['status']]);
    
    jsonResponse(true, ['id' => $pdo->lastInsertId()]);
}

function addPatient($pdo) {
    verifyMedicalStaffAccess();
    
    $data = json_decode(file_get_contents('php://input'), true);
    
    $required = ['first_name', 'last_name', 'dob', 'gender', 'blood_type', 'severity'];
    foreach ($required as $field) {
        if (empty($data[$field])) {
            jsonResponse(false, null, "$field is required");
        }
    }
    
    // Generate patient ID
    $patientId = 'P-' . strtoupper(substr(md5(uniqid()), 0, 6));
    
    $pdo->beginTransaction();
    
    try {
        $stmt = $pdo->prepare("INSERT INTO patients (
            patient_id, first_name, last_name, dob, gender, blood_type, 
            severity, is_isolated, is_contagious, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        
        $stmt->execute([
            $patientId,
            $data['first_name'],
            $data['last_name'],
            $data['dob'],
            $data['gender'],
            $data['blood_type'],
            $data['severity'],
            $data['is_isolated'] ?? false,
            $data['is_contagious'] ?? false,
            $data['notes'] ?? null,
            getUserIdFromToken()
        ]);
        
        $patientId = $pdo->lastInsertId();
        
        // Assign to room if specified
        if (!empty($data['room_id'])) {
            $stmt = $pdo->prepare("INSERT INTO room_assignments (patient_id, room_id, assigned_by) VALUES (?, ?, ?)");
            $stmt->execute([$patientId, $data['room_id'], getUserIdFromToken()]);
        }
        
        $pdo->commit();
        
        jsonResponse(true, ['id' => $patientId]);
    } catch(Exception $e) {
        $pdo->rollBack();
        jsonResponse(false, null, 'Failed to add patient: ' . $e->getMessage());
    }
}

function addStaff($pdo) {
    verifyAdminAccess();
    
    $data = json_decode(file_get_contents('php://input'), true);
    
    $required = ['username', 'password', 'full_name', 'email', 'role'];
    foreach ($required as $field) {
        if (empty($data[$field])) {
            jsonResponse(false, null, "$field is required");
        }
    }
    
    $pdo->beginTransaction();
    
    try {
        // Add user
        $stmt = $pdo->prepare("INSERT INTO users (username, password, role, full_name, email) VALUES (?, ?, ?, ?, ?)");
        $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);
        $stmt->execute([$data['username'], $hashedPassword, $data['role'], $data['full_name'], $data['email']]);
        $userId = $pdo->lastInsertId();
        
        // Add staff details if doctor or nurse
        if (in_array($data['role'], ['doctor', 'nurse'])) {
            $stmt = $pdo->prepare("INSERT INTO staff (user_id, specialization, shift) VALUES (?, ?, ?)");
            $stmt->execute([$userId, $data['specialization'] ?? null, $data['shift'] ?? null]);
        }
        
        $pdo->commit();
        
        jsonResponse(true, ['id' => $userId]);
    } catch(Exception $e) {
        $pdo->rollBack();
        jsonResponse(false, null, 'Failed to add staff: ' . $e->getMessage());
    }
}

function updateRoom($pdo) {
    verifyAdminAccess();
    
    $data = json_decode(file_get_contents('php://input'), true);
    $roomId = $_GET['id'] ?? null;
    
    if (!$roomId) {
        jsonResponse(false, null, 'Room ID is required');
    }
    
    $fields = ['room_number', 'room_type', 'capacity', 'status'];
    $updates = [];
    $params = [];
    
    foreach ($fields as $field) {
        if (isset($data[$field])) {
            $updates[] = "$field = ?";
            $params[] = $data[$field];
        }
    }
    
    if (empty($updates)) {
        jsonResponse(false, null, 'No fields to update');
    }
    
    $params[] = $roomId;
    
    $sql = "UPDATE rooms SET " . implode(', ', $updates) . " WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    
    jsonResponse(true);
}

function updatePatient($pdo) {
    verifyMedicalStaffAccess();
    
    $data = json_decode(file_get_contents('php://input'), true);
    $patientId = $_GET['id'] ?? null;
    
    if (!$patientId) {
        jsonResponse(false, null, 'Patient ID is required');
    }
    
    $fields = ['first_name', 'last_name', 'dob', 'gender', 'blood_type', 'severity', 'is_isolated', 'is_contagious', 'notes'];
    $updates = [];
    $params = [];
    
    foreach ($fields as $field) {
        if (isset($data[$field])) {
            $updates[] = "$field = ?";
            $params[] = $data[$field];
        }
    }
    
    if (empty($updates)) {
        jsonResponse(false, null, 'No fields to update');
    }
    
    $params[] = $patientId;
    
    $pdo->beginTransaction();
    
    try {
        // Update patient
        $sql = "UPDATE patients SET " . implode(', ', $updates) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        // Handle room assignment if changed
        if (isset($data['room_id'])) {
            // Check if patient already has a room assignment
            $stmt = $pdo->prepare("SELECT id FROM room_assignments WHERE patient_id = ? AND discharge_date IS NULL");
            $stmt->execute([$patientId]);
            $assignment = $stmt->fetch();
            
            if ($data['room_id']) {
                // Assign to new room
                if ($assignment) {
                    // Discharge from current room
                    $stmt = $pdo->prepare("UPDATE room_assignments SET discharge_date = CURRENT_TIMESTAMP WHERE id = ?");
                    $stmt->execute([$assignment['id']]);
                }
                
                // Assign to new room
                $stmt = $pdo->prepare("INSERT INTO room_assignments (patient_id, room_id, assigned_by) VALUES (?, ?, ?)");
                $stmt->execute([$patientId, $data['room_id'], getUserIdFromToken()]);
            } else if ($assignment) {
                // Discharge from current room
                $stmt = $pdo->prepare("UPDATE room_assignments SET discharge_date = CURRENT_TIMESTAMP WHERE id = ?");
                $stmt->execute([$assignment['id']]);
            }
        }
        
        $pdo->commit();
        
        jsonResponse(true);
    } catch(Exception $e) {
        $pdo->rollBack();
        jsonResponse(false, null, 'Failed to update patient: ' . $e->getMessage());
    }
}

function updateStaff($pdo) {
    verifyAdminAccess();
    
    $data = json_decode(file_get_contents('php://input'), true);
    $staffId = $_GET['id'] ?? null;
    
    if (!$staffId) {
        jsonResponse(false, null, 'Staff ID is required');
    }
    
    $pdo->beginTransaction();
    
    try {
        // Update user
        $fields = ['username', 'full_name', 'email', 'role'];
        $updates = [];
        $params = [];
        
        foreach ($fields as $field) {
            if (isset($data[$field])) {
                $updates[] = "$field = ?";
                $params[] = $data[$field];
            }
        }
        
        // Handle password update
        if (!empty($data['password'])) {
            $updates[] = "password = ?";
            $params[] = password_hash($data['password'], PASSWORD_DEFAULT);
        }
        
        if (!empty($updates)) {
            $params[] = $staffId;
            $sql = "UPDATE users SET " . implode(', ', $updates) . " WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
        }
        
        // Update staff details if doctor or nurse
        if (in_array($data['role'], ['doctor', 'nurse'])) {
            $stmt = $pdo->prepare("SELECT id FROM staff WHERE user_id = ?");
            $stmt->execute([$staffId]);
            $staffExists = $stmt->fetch();
            
            $fields = ['specialization', 'shift'];
            $updates = [];
            $params = [];
            
            foreach ($fields as $field) {
                if (isset($data[$field])) {
                    $updates[] = "$field = ?";
                    $params[] = $data[$field];
                }
            }
            
            if ($staffExists) {
                // Update existing staff record
                if (!empty($updates)) {
                    $params[] = $staffId;
                    $sql = "UPDATE staff SET " . implode(', ', $updates) . " WHERE user_id = ?";
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute($params);
                }
            } else {
                // Insert new staff record
                $stmt = $pdo->prepare("INSERT INTO staff (user_id, specialization, shift) VALUES (?, ?, ?)");
                $stmt->execute([$staffId, $data['specialization'] ?? null, $data['shift'] ?? null]);
            }
        }
        
        $pdo->commit();
        
        jsonResponse(true);
    } catch(Exception $e) {
        $pdo->rollBack();
        jsonResponse(false, null, 'Failed to update staff: ' . $e->getMessage());
    }
}

function deleteRoom($pdo) {
    verifyAdminAccess();
    
    $roomId = $_GET['id'] ?? null;
    
    if (!$roomId) {
        jsonResponse(false, null, 'Room ID is required');
    }
    
    // Check if room has patients
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM room_assignments WHERE room_id = ? AND discharge_date IS NULL");
    $stmt->execute([$roomId]);
    $patientCount = $stmt->fetchColumn();
    
    if ($patientCount > 0) {
        jsonResponse(false, null, 'Cannot delete room with assigned patients');
    }
    
    $stmt = $pdo->prepare("DELETE FROM rooms WHERE id = ?");
    $stmt->execute([$roomId]);
    
    jsonResponse(true);
}

function deletePatient($pdo) {
    verifyMedicalStaffAccess();
    
    $patientId = $_GET['id'] ?? null;
    
    if (!$patientId) {
        jsonResponse(false, null, 'Patient ID is required');
    }
    
    $pdo->beginTransaction();
    
    try {
        // Discharge from room if assigned
        $stmt = $pdo->prepare("UPDATE room_assignments SET discharge_date = CURRENT_TIMESTAMP WHERE patient_id = ? AND discharge_date IS NULL");
        $stmt->execute([$patientId]);
        
        // Delete patient
        $stmt = $pdo->prepare("DELETE FROM patients WHERE id = ?");
        $stmt->execute([$patientId]);
        
        $pdo->commit();
        
        jsonResponse(true);
    } catch(Exception $e) {
        $pdo->rollBack();
        jsonResponse(false, null, 'Failed to delete patient: ' . $e->getMessage());
    }
}

function deleteStaff($pdo) {
    verifyAdminAccess();
    
    $staffId = $_GET['id'] ?? null;
    
    if (!$staffId) {
        jsonResponse(false, null, 'Staff ID is required');
    }
    
    $pdo->beginTransaction();
    
    try {
        // Delete staff record if exists
        $stmt = $pdo->prepare("DELETE FROM staff WHERE user_id = ?");
        $stmt->execute([$staffId]);
        
        // Delete user
        $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
        $stmt->execute([$staffId]);
        
        $pdo->commit();
        
        jsonResponse(true);
    } catch(Exception $e) {
        $pdo->rollBack();
        jsonResponse(false, null, 'Failed to delete staff: ' . $e->getMessage());
    }
}

function getDashboardStats($pdo) {
    verifyAuthenticated();
    
    $stats = [];
    
    // Total rooms
    $stmt = $pdo->query("SELECT COUNT(*) FROM rooms");
    $stats['total_rooms'] = $stmt->fetchColumn();
    
    // Total patients
    $stmt = $pdo->query("SELECT COUNT(*) FROM patients WHERE discharge_date IS NULL");
    $stats['total_patients'] = $stmt->fetchColumn();
    
    // Total doctors
    $stmt = $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'doctor'");
    $stats['total_doctors'] = $stmt->fetchColumn();
    
    // Total nurses
    $stmt = $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'nurse'");
    $stats['total_nurses'] = $stmt->fetchColumn();
    
    // Room occupancy
    $stmt = $pdo->query("SELECT room_type, status, COUNT(*) as count FROM rooms GROUP BY room_type, status");
    $stats['room_occupancy'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Patient severity
    $stmt = $pdo->query("SELECT severity, COUNT(*) as count FROM patients WHERE discharge_date IS NULL GROUP BY severity");
    $stats['patient_severity'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    jsonResponse(true, $stats);
}
?>