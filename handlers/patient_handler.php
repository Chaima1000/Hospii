<?php
function handlePatientRequest($method, $input, $pdo) {
    switch($method) {
        case 'GET':
            // Get all patients or filter by search/severity
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
            break;
            
        case 'POST':
            // Add new patient
            $required = ['first_name', 'last_name', 'dob', 'gender', 'blood_type', 'severity'];
            foreach($required as $field) {
                if(empty($input[$field])) {
                    jsonResponse(false, null, "Missing required field: $field");
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
                    $input['first_name'],
                    $input['last_name'],
                    $input['dob'],
                    $input['gender'],
                    $input['blood_type'],
                    $input['severity'],
                    $input['is_isolated'] ?? false,
                    $input['is_contagious'] ?? false,
                    $input['notes'] ?? null,
                    1 // Replace with actual user ID when authentication is implemented
                ]);
                
                $newPatientId = $pdo->lastInsertId();
                
                // Assign to room if specified
                if (!empty($input['room_id'])) {
                    $stmt = $pdo->prepare("INSERT INTO room_assignments (patient_id, room_id, assigned_by) VALUES (?, ?, ?)");
                    $stmt->execute([$newPatientId, $input['room_id'], 1]); // Replace with actual user ID
                }
                
                $pdo->commit();
                
                jsonResponse(true, ['id' => $newPatientId, 'patient_id' => $patientId]);
            } catch(Exception $e) {
                $pdo->rollBack();
                jsonResponse(false, null, 'Failed to add patient: ' . $e->getMessage());
            }
            break;
            
        case 'PUT':
            // Update patient
            if(empty($input['id'])) {
                jsonResponse(false, null, "Patient ID is required");
            }
            
            $fields = ['first_name', 'last_name', 'dob', 'gender', 'blood_type', 'severity', 'is_isolated', 'is_contagious', 'notes'];
            $updates = [];
            $params = [];
            
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
            
            $pdo->beginTransaction();
            
            try {
                // Update patient
                $sql = "UPDATE patients SET " . implode(', ', $updates) . " WHERE id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);
                
                // Handle room assignment if changed
                if (isset($input['room_id'])) {
                    // Check if patient already has a room assignment
                    $stmt = $pdo->prepare("SELECT id FROM room_assignments WHERE patient_id = ? AND discharge_date IS NULL");
                    $stmt->execute([$input['id']]);
                    $assignment = $stmt->fetch();
                    
                    if ($input['room_id']) {
                        // Assign to new room
                        if ($assignment) {
                            // Discharge from current room
                            $stmt = $pdo->prepare("UPDATE room_assignments SET discharge_date = CURRENT_TIMESTAMP WHERE id = ?");
                            $stmt->execute([$assignment['id']]);
                        }
                        
                        // Assign to new room
                        $stmt = $pdo->prepare("INSERT INTO room_assignments (patient_id, room_id, assigned_by) VALUES (?, ?, ?)");
                        $stmt->execute([$input['id'], $input['room_id'], 1]); // Replace with actual user ID
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
            break;
            
        case 'DELETE':
            // Delete patient
            $id = $_GET['id'] ?? null;
            if(!$id) {
                jsonResponse(false, null, "Patient ID is required");
            }
            
            $pdo->beginTransaction();
            
            try {
                // Discharge from room if assigned
                $stmt = $pdo->prepare("UPDATE room_assignments SET discharge_date = CURRENT_TIMESTAMP WHERE patient_id = ? AND discharge_date IS NULL");
                $stmt->execute([$id]);
                
                // Delete patient
                $stmt = $pdo->prepare("DELETE FROM patients WHERE id = ?");
                $stmt->execute([$id]);
                
                $pdo->commit();
                
                jsonResponse(true);
            } catch(Exception $e) {
                $pdo->rollBack();
                jsonResponse(false, null, 'Failed to delete patient: ' . $e->getMessage());
            }
            break;
            
        default:
            jsonResponse(false, null, "Method not allowed");
    }
}
?>