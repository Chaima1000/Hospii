<?php
function handleStaffRequest($method, $input, $pdo) {
    switch($method) {
        case 'GET':
            // Get all staff or filter by role/search
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
            
            // Remove password hashes from results
            foreach ($staff as &$member) {
                if (isset($member['password'])) {
                    unset($member['password']);
                }
            }
            
            jsonResponse(true, $staff);
            break;
            
        case 'POST':
            // Add new staff member
            // This should be restricted to admin users
            
            $required = ['username', 'password', 'full_name', 'email', 'role'];
            foreach($required as $field) {
                if(empty($input[$field])) {
                    jsonResponse(false, null, "Missing required field: $field");
                }
            }
            
            // Validate role
            if (!in_array($input['role'], ['admin', 'doctor', 'nurse'])) {
                jsonResponse(false, null, "Invalid role. Must be one of: admin, doctor, nurse");
            }
            
            $pdo->beginTransaction();
            
            try {
                // Add user
                $stmt = $pdo->prepare("INSERT INTO users (username, password, role, full_name, email) VALUES (?, ?, ?, ?, ?)");
                $hashedPassword = password_hash($input['password'], PASSWORD_DEFAULT);
                $stmt->execute([$input['username'], $hashedPassword, $input['role'], $input['full_name'], $input['email']]);
                $userId = $pdo->lastInsertId();
                
                // Add staff details if doctor or nurse
                if (in_array($input['role'], ['doctor', 'nurse'])) {
                    $stmt = $pdo->prepare("INSERT INTO staff (user_id, specialization, shift) VALUES (?, ?, ?)");
                    $stmt->execute([$userId, $input['specialization'] ?? null, $input['shift'] ?? null]);
                }
                
                $pdo->commit();
                
                jsonResponse(true, ['id' => $userId]);
            } catch(Exception $e) {
                $pdo->rollBack();
                jsonResponse(false, null, 'Failed to add staff: ' . $e->getMessage());
            }
            break;
            
        case 'PUT':
            // Update staff
            if(empty($input['id'])) {
                jsonResponse(false, null, "Staff ID is required");
            }
            
            $pdo->beginTransaction();
            
            try {
                // Update user
                $fields = ['username', 'full_name', 'email', 'role'];
                $updates = [];
                $params = [];
                
                foreach($fields as $field) {
                    if(isset($input[$field])) {
                        $updates[] = "$field = ?";
                        $params[] = $input[$field];
                    }
                }
                
                // Handle password update
                if(!empty($input['password'])) {
                    $updates[] = "password = ?";
                    $params[] = password_hash($input['password'], PASSWORD_DEFAULT);
                }
                
                if(!empty($updates)) {
                    $params[] = $input['id'];
                    $sql = "UPDATE users SET " . implode(', ', $updates) . " WHERE id = ?";
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute($params);
                }
                
                // Update staff details if doctor or nurse
                if (isset($input['role']) && in_array($input['role'], ['doctor', 'nurse'])) {
                    $stmt = $pdo->prepare("SELECT id FROM staff WHERE user_id = ?");
                    $stmt->execute([$input['id']]);
                    $staffExists = $stmt->fetch();
                    
                    if($staffExists) {
                        // Update existing staff record
                        $fields = ['specialization', 'shift'];
                        $updates = [];
                        $params = [];
                        
                        foreach($fields as $field) {
                            if(isset($input[$field])) {
                                $updates[] = "$field = ?";
                                $params[] = $input[$field];
                            }
                        }
                        
                        if(!empty($updates)) {
                            $params[] = $input['id'];
                            $sql = "UPDATE staff SET " . implode(', ', $updates) . " WHERE user_id = ?";
                            $stmt = $pdo->prepare($sql);
                            $stmt->execute($params);
                        }
                    } else {
                        // Insert new staff record
                        $stmt = $pdo->prepare("INSERT INTO staff (user_id, specialization, shift) VALUES (?, ?, ?)");
                        $stmt->execute([$input['id'], $input['specialization'] ?? null, $input['shift'] ?? null]);
                    }
                }
                
                $pdo->commit();
                
                jsonResponse(true);
            } catch(Exception $e) {
                $pdo->rollBack();
                jsonResponse(false, null, 'Failed to update staff: ' . $e->getMessage());
            }
            break;
            
        case 'DELETE':
            // Delete staff
            $id = $_GET['id'] ?? null;
            if(!$id) {
                jsonResponse(false, null, "Staff ID is required");
            }
            
            $pdo->beginTransaction();
            
            try {
                // Delete staff record if exists
                $stmt = $pdo->prepare("DELETE FROM staff WHERE user_id = ?");
                $stmt->execute([$id]);
                
                // Delete user
                $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
                $stmt->execute([$id]);
                
                $pdo->commit();
                
                jsonResponse(true);
            } catch(Exception $e) {
                $pdo->rollBack();
                jsonResponse(false, null, 'Failed to delete staff: ' . $e->getMessage());
            }
            break;
            
        default:
            jsonResponse(false, null, "Method not allowed");
    }
}
?>