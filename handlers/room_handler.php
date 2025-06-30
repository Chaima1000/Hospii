<?php
function handleRoomRequest($method, $input, $pdo) {
    switch($method) {
        case 'GET':
            // Get all rooms
            $stmt = $pdo->query("SELECT * FROM rooms");
            $rooms = $stmt->fetchAll(PDO::FETCH_ASSOC);
            jsonResponse(true, $rooms);
            break;
            
        case 'POST':
            // Add new room
            $required = ['room_number', 'room_type', 'capacity'];
            foreach($required as $field) {
                if(empty($input[$field])) {
                    jsonResponse(false, null, "Missing required field: $field");
                }
            }
            
            $stmt = $pdo->prepare("INSERT INTO rooms (room_number, room_type, capacity, status) VALUES (?, ?, ?, ?)");
            $stmt->execute([
                $input['room_number'],
                $input['room_type'],
                $input['capacity'],
                $input['status'] ?? 'available'
            ]);
            
            jsonResponse(true, ['id' => $pdo->lastInsertId()]);
            break;
            
        case 'PUT':
            // Update room
            if(empty($input['id'])) {
                jsonResponse(false, null, "Room ID is required");
            }
            
            $updates = [];
            $params = [];
            $fields = ['room_number', 'room_type', 'capacity', 'status'];
            
            foreach($fields as $field) {
                if(isset($input[$field])) {
                    $updates[] = "$field = ?";
                    $params[] = $input[$field];
                }
            }
            
            if(empty($updates)) {
                jsonResponse(false, null, "No fields to update");
            }
            
            $params[] = $input['id'];
            $sql = "UPDATE rooms SET " . implode(', ', $updates) . " WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            
            jsonResponse(true);
            break;
            
        case 'DELETE':
            // Delete room
            $id = $_GET['id'] ?? null;
            if(!$id) {
                jsonResponse(false, null, "Room ID is required");
            }
            
            // Check if room has patients first
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM room_assignments WHERE room_id = ? AND discharge_date IS NULL");
            $stmt->execute([$id]);
            if($stmt->fetchColumn() > 0) {
                jsonResponse(false, null, "Cannot delete room with assigned patients");
            }
            
            $stmt = $pdo->prepare("DELETE FROM rooms WHERE id = ?");
            $stmt->execute([$id]);
            
            jsonResponse(true);
            break;
            
        default:
            jsonResponse(false, null, "Method not allowed");
    }
}
