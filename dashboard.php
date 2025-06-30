<?php
// dashboard.php
require_once __DIR__.'/config.php';

header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

try {
    $dsn = "pgsql:host=".DB_HOST.";port=".DB_PORT.";dbname=".DB_NAME;
    $pdo = new PDO($dsn, DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Including functions from api.php
    require_once __DIR__.'/api.php';
    
    verifyAuthenticated();
    
    $action = $_GET['action'] ?? '';
    // Time period for dynamic data (default to last 7 days)
    $period = $_GET['period'] ?? '7'; // 7, 30, 90, 365 days
    $periodDays = intval($period);
    
    switch ($action) {
        case 'chart-data':
            // Combined data endpoint with time period filter
            $data = [];
            
            // Room occupancy data
            $stmt = $pdo->query("
                SELECT 
                    SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) as occupied,
                    SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
                    SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance
                FROM rooms
            ");
            $data['room_occupancy'] = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // Patient severity data with time filter
            $stmt = $pdo->prepare("
                SELECT 
                    SUM(CASE WHEN severity = 'Low' THEN 1 ELSE 0 END) as low,
                    SUM(CASE WHEN severity = 'Medium' THEN 1 ELSE 0 END) as medium,
                    SUM(CASE WHEN severity = 'High' THEN 1 ELSE 0 END) as high,
                    SUM(CASE WHEN severity = 'Critical' THEN 1 ELSE 0 END) as critical
                FROM patients
                WHERE discharge_date IS NULL
                AND created_at >= CURRENT_DATE - INTERVAL '? days'
            ");
            $stmt->execute([$periodDays]);
            $data['patient_severity'] = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // New admissions over time (by day for the selected period)
            $stmt = $pdo->prepare("
                SELECT 
                    TO_CHAR(created_at, 'YYYY-MM-DD') as date,
                    COUNT(*) as count
                FROM patients
                WHERE created_at >= CURRENT_DATE - INTERVAL '? days'
                GROUP BY date
                ORDER BY date
            ");
            $stmt->execute([$periodDays]);
            $data['admissions_trend'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Room utilization trend
            $stmt = $pdo->prepare("
                SELECT 
                    TO_CHAR(ra.created_at, 'YYYY-MM-DD') as date,
                    COUNT(*) as assignments
                FROM room_assignments ra
                WHERE ra.created_at >= CURRENT_DATE - INTERVAL '? days'
                GROUP BY date
                ORDER BY date
            ");
            $stmt->execute([$periodDays]);
            $data['room_utilization_trend'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            jsonResponse(true, $data);
            break;
            
        case 'room-occupancy':
            // Individual endpoint for room occupancy
            $stmt = $pdo->query("
                SELECT 
                    SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) as occupied,
                    SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
                    SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance
                FROM rooms
            ");
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            jsonResponse(true, [
                'labels' => ['Occupied', 'Available', 'Maintenance'],
                'datasets' => [
                    [
                        'data' => [$result['occupied'], $result['available'], $result['maintenance']],
                        'backgroundColor' => [
                            'rgba(52, 152, 219, 0.8)',
                            'rgba(46, 204, 113, 0.8)',
                            'rgba(241, 196, 15, 0.8)'
                        ]
                    ]
                ]
            ]);
            break;
            
        case 'patient-severity':
            // Individual endpoint for patient severity with time period filter
            $stmt = $pdo->prepare("
                SELECT 
                    SUM(CASE WHEN severity = 'Low' THEN 1 ELSE 0 END) as low,
                    SUM(CASE WHEN severity = 'Medium' THEN 1 ELSE 0 END) as medium,
                    SUM(CASE WHEN severity = 'High' THEN 1 ELSE 0 END) as high,
                    SUM(CASE WHEN severity = 'Critical' THEN 1 ELSE 0 END) as critical
                FROM patients
                WHERE discharge_date IS NULL
                AND created_at >= CURRENT_DATE - INTERVAL '? days'
            ");
            $stmt->execute([$periodDays]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            jsonResponse(true, [
                'labels' => ['Low', 'Medium', 'High', 'Critical'],
                'datasets' => [
                    [
                        'label' => 'Patients by Severity',
                        'data' => [$result['low'], $result['medium'], $result['high'], $result['critical']],
                        'backgroundColor' => [
                            'rgba(46, 204, 113, 0.8)',
                            'rgba(52, 152, 219, 0.8)',
                            'rgba(241, 196, 15, 0.8)',
                            'rgba(231, 76, 60, 0.8)'
                        ]
                    ]
                ],
                'period' => $periodDays
            ]);
            break;
            
        case 'admissions-trend':
            // New endpoint for admissions trend over time
            $stmt = $pdo->prepare("
                SELECT 
                    TO_CHAR(created_at, 'YYYY-MM-DD') as date,
                    COUNT(*) as count
                FROM patients
                WHERE created_at >= CURRENT_DATE - INTERVAL '? days'
                GROUP BY date
                ORDER BY date
            ");
            $stmt->execute([$periodDays]);
            $admissions = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Format data for chart.js line chart
            $dates = [];
            $counts = [];
            foreach ($admissions as $row) {
                $dates[] = $row['date'];
                $counts[] = $row['count'];
            }
            
            jsonResponse(true, [
                'labels' => $dates,
                'datasets' => [
                    [
                        'label' => 'New Patient Admissions',
                        'data' => $counts,
                        'borderColor' => 'rgba(52, 152, 219, 1)',
                        'backgroundColor' => 'rgba(52, 152, 219, 0.2)',
                        'fill' => true,
                        'tension' => 0.4
                    ]
                ],
                'period' => $periodDays
            ]);
            break;
            
        case 'dashboard-stats':
            // Endpoint for dashboard statistics
            $stats = [];
            
            // Total rooms
            $stmt = $pdo->query("SELECT COUNT(*) FROM rooms");
            $stats['total_rooms'] = $stmt->fetchColumn();
            
            // Total patients (currently admitted)
            $stmt = $pdo->query("SELECT COUNT(*) FROM patients WHERE discharge_date IS NULL");
            $stats['total_patients'] = $stmt->fetchColumn();
            
            // New patients in selected period
            $stmt = $pdo->prepare("
                SELECT COUNT(*) 
                FROM patients 
                WHERE created_at >= CURRENT_DATE - INTERVAL '? days'
            ");
            $stmt->execute([$periodDays]);
            $stats['new_patients'] = $stmt->fetchColumn();
            
            // Total doctors
            $stmt = $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'doctor'");
            $stats['total_doctors'] = $stmt->fetchColumn();
            
            // Total nurses
            $stmt = $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'nurse'");
            $stats['total_nurses'] = $stmt->fetchColumn();
            
            // Room occupancy percentage
            $stmt = $pdo->query("
                SELECT 
                    (SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) * 100.0 / COUNT(*))::numeric(10,2) as occupancy_rate
                FROM rooms
            ");
            $stats['room_occupancy_rate'] = $stmt->fetchColumn() ?: 0;
            
            jsonResponse(true, $stats);
            break;
            
        default:
            throw new Exception('Invalid action specified');
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>