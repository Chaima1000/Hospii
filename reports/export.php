<?php
require_once __DIR__.'/../../includes/config.php';
require_once __DIR__.'/../../includes/auth.php';

// Verify admin access
verifyAdminAccess();

// Include TCPDF library
require_once __DIR__.'/../../vendor/tecnickcom/tcpdf/tcpdf.php';

class HospitalPDF extends TCPDF {
    // Header
    public function Header() {
        $this->SetFont('helvetica', 'B', 12);
        $this->Cell(0, 10, 'Hospital Management System Report', 0, 1, 'C');
        $this->SetFont('helvetica', '', 10);
        $this->Cell(0, 10, date('F j, Y'), 0, 1, 'C');
        $this->Ln(5);
    }
    
    // Footer
    public function Footer() {
        $this->SetY(-15);
        $this->SetFont('helvetica', 'I', 8);
        $this->Cell(0, 10, 'Page '.$this->getAliasNumPage().'/'.$this->getAliasNbPages(), 0, 0, 'C');
    }
}

// Create new PDF document
$pdf = new HospitalPDF(PDF_PAGE_ORIENTATION, PDF_UNIT, PDF_PAGE_FORMAT, true, 'UTF-8', false);

// Process report request
$reportType = $_GET['type'] ?? 'occupancy';
$startDate = $_GET['start'] ?? date('Y-m-01');
$endDate = $_GET['end'] ?? date('Y-m-d');

try {
    // Set document information
    $pdf->SetCreator('Hospital Management System');
    $pdf->SetAuthor('Hospital Admin');
    $pdf->SetTitle('Hospital Report - '.ucfirst($reportType));
    $pdf->SetSubject('Hospital Statistics');
    
    // Add a page
    $pdf->AddPage();
    
    // Generate report content based on type
    switch ($reportType) {
        case 'occupancy':
            generateOccupancyReport($pdf, $pdo, $startDate, $endDate);
            break;
        case 'admissions':
            generateAdmissionsReport($pdf, $pdo, $startDate, $endDate);
            break;
        // Add more report types
        default:
            throw new Exception("Invalid report type");
    }
    
    // Close and output PDF document
    $pdf->Output('hospital_report_'.$reportType.'_'.date('Ymd').'.pdf', 'D');
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}

function generateOccupancyReport($pdf, $pdo, $startDate, $endDate) {
    // Query database for room occupancy data
    $stmt = $pdo->prepare("
        SELECT r.room_type, r.status, COUNT(*) as count 
        FROM rooms r
        LEFT JOIN room_assignments ra ON r.id = ra.room_id
        WHERE ra.assignment_date BETWEEN ? AND ?
        GROUP BY r.room_type, r.status
    ");
    $stmt->execute([$startDate, $endDate]);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Generate report content
    $pdf->SetFont('helvetica', 'B', 14);
    $pdf->Cell(0, 10, 'Room Occupancy Report ('.date('M j, Y', strtotime($startDate)).' - '.date('M j, Y', strtotime($endDate)).')', 0, 1);
    $pdf->Ln(5);
    
    // Add table
    $pdf->SetFont('helvetica', 'B', 10);
    $pdf->Cell(60, 7, 'Room Type', 1, 0, 'C');
    $pdf->Cell(60, 7, 'Status', 1, 0, 'C');
    $pdf->Cell(60, 7, 'Count', 1, 1, 'C');
    
    $pdf->SetFont('helvetica', '', 10);
    foreach ($data as $row) {
        $pdf->Cell(60, 7, ucfirst($row['room_type']), 1);
        $pdf->Cell(60, 7, ucfirst($row['status']), 1);
        $pdf->Cell(60, 7, $row['count'], 1, 1, 'C');
    }
    
    // Add summary statistics
    $pdf->Ln(10);
    $pdf->SetFont('helvetica', 'B', 12);
    $pdf->Cell(0, 10, 'Summary Statistics', 0, 1);
    
    // Add more report content as needed
}
