// Global variables
let currentUser = null;
let authToken = null;



// API Configuration
const API_BASE = 'api.php';

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const usernameDisplay = document.getElementById('username-display');
const dashboardTitle = document.getElementById('dashboard-title');
const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.getElementById('sidebar');
const navItems = document.querySelectorAll('.nav-item');
const contentSections = document.querySelectorAll('.content-section');


// Modal elements
const modals = document.querySelectorAll('.modal');
const closeButtons = document.querySelectorAll('.close-btn, .modal-close');
const roomModal = document.getElementById('room-modal');
const patientModal = document.getElementById('patient-modal');
const staffModal = document.getElementById('staff-modal');
const patientDetailsModal = document.getElementById('patient-details-modal');
const diseaseModal = document.getElementById('disease-modal');
const treatmentModal = document.getElementById('treatment-modal');
const confirmModal = document.getElementById('confirm-modal');

// Form elements
const roomForm = document.getElementById('room-form');
const patientForm = document.getElementById('patient-form');
const staffForm = document.getElementById('staff-form');
const diseaseForm = document.getElementById('disease-form');
const treatmentForm = document.getElementById('treatment-form');

// Buttons
const addRoomBtn = document.getElementById('add-room-btn');
const addPatientBtn = document.getElementById('add-patient-btn');
const addStaffBtn = document.getElementById('add-staff-btn');
const addDiseaseBtn = document.getElementById('add-disease-btn');
const addTreatmentBtn = document.getElementById('add-treatment-btn');

// Tables
const roomsTable = document.getElementById('rooms-table');
const patientsTable = document.getElementById('patients-table');
const staffTable = document.getElementById('staff-table');
const myPatientsTable = document.getElementById('my-patients-table');
const diseasesTable = document.getElementById('diseases-table');
const treatmentsTable = document.getElementById('treatments-table');

// Chart elements
const roomOccupancyChartCtx = document.getElementById('room-occupancy-chart');
const severityChartCtx = document.getElementById('severity-chart');
const reportChartCtx = document.getElementById('report-chart');

// Initialize charts
let roomOccupancyChart, severityChart, reportChart;
// Chart data management
let lastDataUpdate = null;

// Main data loading function
async function loadData() {
    try {
        const [stats, occupancyData, severityData] = await Promise.all([
            callApi('getDashboardStats'),
            callApi('dashboard-room-occupancy'),
            callApi('dashboard-patient-severity')
        ]);
        
        updateStatsCards(stats);
        updateRoomOccupancyChart(occupancyData);
        updateSeverityChart(severityData);
        
        lastDataUpdate = new Date();
        updateLastUpdatedDisplay();
    } catch (error) {
        console.error("Data loading failed:", error);
        showError("Failed to load dashboard data");
    }
}

function updateCharts(roomData, severityData) {
    if (roomOccupancyChart) {
        roomOccupancyChart.data.datasets[0].data = [
            roomData.occupied,
            roomData.available,
            roomData.maintenance
        ];
        roomOccupancyChart.update();
    }

    if (severityChart) {
        severityChart.data.datasets[0].data = severityData;
        severityChart.update();
    }
}

function updateLastUpdatedDisplay() {
    if (lastDataUpdate) {
        const el = document.getElementById('last-updated');
        if (el) {
            el.textContent = `Last updated: ${lastDataUpdate.toLocaleTimeString()}`;
        }
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Authentication and UI event listeners
    loginForm.addEventListener('submit', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);
    menuToggle.addEventListener('click', toggleSidebar);
    
    // Navigation items
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const section = item.getAttribute('data-section');
            showSection(section);
        });
    });
    
    // Modal controls
    closeButtons.forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });
    
    modals.forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeAllModals();
            }
        });
    });
    
    // Form controls
    addRoomBtn?.addEventListener('click', () => openRoomModal());
    addPatientBtn?.addEventListener('click', () => openPatientModal());
    addStaffBtn?.addEventListener('click', () => openStaffModal());
    addDiseaseBtn?.addEventListener('click', () => openDiseaseModal());
    addTreatmentBtn?.addEventListener('click', () => openTreatmentModal());
    
    roomForm?.addEventListener('submit', handleRoomFormSubmit);
    patientForm?.addEventListener('submit', handlePatientFormSubmit);
    staffForm?.addEventListener('submit', handleStaffFormSubmit);
    diseaseForm?.addEventListener('submit', handleDiseaseFormSubmit);
    treatmentForm?.addEventListener('submit', handleTreatmentFormSubmit);
    
    // Initialize dashboard
    initDashboard();
    
    // Check authentication status
    checkAuth();
});

function initDashboard() {
    // Initialize empty charts first
    initCharts();
    
    // Load initial data
    loadData();
    
    // Set up auto-refresh every 30 seconds
    const refreshInterval = setInterval(() => {
        if (document.getElementById('dashboard')?.classList.contains('active')) {
            loadData();
        }
    }, 30000);
    
    // Store interval reference for cleanup if needed
    window.dashboardRefreshInterval = refreshInterval;
    
    // Set up manual refresh buttons
    setupRefreshButtons();
}

function setupRefreshButtons() {
    document.getElementById('refresh-room-btn')?.addEventListener('click', async function() {
        await refreshChart('refresh-room-btn', updateRoomOccupancyChart);
    });
    
    document.getElementById('refresh-severity-btn')?.addEventListener('click', async function() {
        await refreshChart('refresh-severity-btn', updateSeverityChart);
    });
}
    
    // Load initial data
    loadData();
    
    // Set up auto-refresh every 30 seconds
    const refreshInterval = setInterval(() => {
        if (document.getElementById('dashboard').classList.contains('active')) {
            loadData();
        }
    }, 30000);
    
    // Store interval reference for cleanup if needed
    window.dashboardRefreshInterval = refreshInterval;
    
    // Set up manual refresh buttons with loading states
    document.getElementById('refresh-room-btn')?.addEventListener('click', async function() {
        const btn = this;
        const icon = btn.querySelector('i') || document.createElement('i');
        icon.className = 'fas fa-spinner fa-spin';
        btn.innerHTML = '';
        btn.appendChild(icon);
        btn.disabled = true;
        
        try {
            await updateRoomOccupancyChart();
            updateChartTimestamp('room');
        } catch (error) {
            console.error('Room chart refresh failed:', error);
        } finally {
            icon.className = 'fas fa-sync-alt';
            btn.disabled = false;
        }
    });
    
    document.getElementById('refresh-severity-btn')?.addEventListener('click', async function() {
        const btn = this;
        const icon = btn.querySelector('i') || document.createElement('i');
        icon.className = 'fas fa-spinner fa-spin';
        btn.innerHTML = '';
        btn.appendChild(icon);
        btn.disabled = true;
        
        try {
            await updateSeverityChart();
            updateChartTimestamp('severity');
        } catch (error) {
            console.error('Severity chart refresh failed:', error);
        } finally {
            icon.className = 'fas fa-sync-alt';
            btn.disabled = false;
        }
    });


// Update timestamp for charts
function updateChartTimestamp(chartType) {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const element = document.getElementById(`${chartType}-chart-update-time`);
    if (element) {
        element.textContent = timeString;
        lastDataUpdate = now;
    }
}

// NEW: Generic chart refresh function with loading state
// Generic chart refresh function
async function refreshChart(buttonId, chartFunction) {
    const btn = document.getElementById(buttonId);
    if (!btn) return;
    
    try {
        // Set loading state
        const icon = btn.querySelector('i') || document.createElement('i');
        icon.className = 'fas fa-spinner fa-spin';
        btn.innerHTML = '';
        btn.appendChild(icon);
        btn.disabled = true;
        
        // Update the chart
        await chartFunction();
    } catch (error) {
        console.error('Chart refresh failed:', error);
        showError('Failed to refresh chart');
    } finally {
        // Restore button state
        const icon = btn.querySelector('i');
        if (icon) {
            icon.className = 'fas fa-sync-alt';
        }
        btn.disabled = false;
    }
}

// API Functions
// In script.js, modify the callApi function to specifically target dashboard endpoints:
async function callApi(endpoint, method = 'GET', data = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        }
    };
    
    if (data) {
        options.body = JSON.stringify(data);
    }
    
    try {
        // Use dashboard.php for dashboard-specific endpoints
        const url = endpoint.startsWith('dashboard-') 
            ? `dashboard.php?action=${endpoint.replace('dashboard-', '')}`
            : `api.php?endpoint=${endpoint}`;
            
        const response = await fetch(url, options);
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Request failed');
        }
        
        return result.data;
    } catch (error) {
        console.error('API Error:', error);
        showError(error.message);
        throw error;
    }
}

// UI Functions
function showError(message) {
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 5000);
    } else {
        alert(`Error: ${message}`);
    }
}

function showSuccess(message) {
    const successElement = document.getElementById('success-message');
    if (successElement) {
        successElement.textContent = message;
        successElement.style.display = 'block';
        setTimeout(() => {
            successElement.style.display = 'none';
        }, 5000);
    } else {
        alert(`Success: ${message}`);
    }
}

// Authentication Functions
function checkAuth() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const token = localStorage.getItem('authToken');
    
    if (user && token) {
        currentUser = user;
        authToken = token;
        showDashboard();
    } else {
        showLogin();
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await callApi('login', 'POST', { username, password });
        
        currentUser = response.user;
        authToken = response.token;
        
        localStorage.setItem('currentUser', JSON.stringify(response.user));
        localStorage.setItem('authToken', response.token);
        
        showDashboard();
        showSuccess('Login successful');
    } catch (error) {
        showError('Invalid credentials');
    }
}

function handleLogout() {
    currentUser = null;
    authToken = null;
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    showLogin();
}

function showLogin() {
    loginScreen.classList.add('active');
    dashboard.classList.remove('active');
    loginForm.reset();
}

function showDashboard() {
    loginScreen.classList.remove('active');
    dashboard.classList.add('active');
    updateUserUI();
    loadDashboardData();
    showSection('overview');
}

function updateUserUI() {
    if (!currentUser) return;
    
    usernameDisplay.textContent = currentUser.full_name;
    document.body.classList.remove('user-admin', 'user-doctor', 'user-nurse');
    document.body.classList.add(`user-${currentUser.role}`);
    
    let title = 'Dashboard';
    if (currentUser.role === 'admin') title = 'Admin Dashboard';
    else if (currentUser.role === 'doctor') title = 'Doctor Dashboard';
    else if (currentUser.role === 'nurse') title = 'Nurse Dashboard';
    dashboardTitle.textContent = title;
}

// Navigation Functions
function toggleSidebar() {
    sidebar.classList.toggle('collapsed');
}

function showSection(sectionId) {
    contentSections.forEach(section => {
        section.classList.remove('active');
    });
    
    navItems.forEach(item => {
        item.classList.remove('active');
    });
    
    const section = document.getElementById(`${sectionId}-section`);
    if (section) {
        section.classList.add('active');
        
        const navItem = document.querySelector(`.nav-item[data-section="${sectionId}"]`);
        if (navItem) {
            navItem.classList.add('active');
        }
        
        switch(sectionId) {
            case 'rooms':
                loadRooms();
                break;
            case 'patients':
                loadPatients();
                break;
            case 'staff':
                loadStaff();
                break;
            case 'my-patients':
                loadMyPatients();
                break;
            case 'reports':
                initReportSection();
                break;
        }
    }
}

// Data Loading Functions
async function loadDashboardData() {
    try {
        const stats = await callApi('dashboard-stats');
        updateStatsCards(stats);
        
        // Initialize charts with empty data first
        initEmptyCharts();
        
        // Then update with real data
        await updateRoomOccupancyChart();
        await updateSeverityChart();
        
        loadRecentActivity();
    } catch (error) {
        console.error('Failed to load dashboard data:', error);
    }
}

function initEmptyCharts() {
    // Initialize empty charts to prevent errors
    roomOccupancyChart = new Chart(roomOccupancyChartCtx, {
        type: 'doughnut',
        data: { labels: [], datasets: [] }
    });
    
    severityChart = new Chart(severityChartCtx, {
        type: 'bar',
        data: { labels: [], datasets: [] }
    });
}

function updateStatsCards(stats) {
    document.getElementById('total-rooms').textContent = stats.total_rooms;
    document.getElementById('total-patients').textContent = stats.total_patients;
    document.getElementById('total-doctors').textContent = stats.total_doctors;
    document.getElementById('total-nurses').textContent = stats.total_nurses;
}


async function updateRoomOccupancyChart(data = null) {
    try {
        const chartData = data || await callApi('dashboard-room-occupancy');
        
        if (roomOccupancyChart) {
            roomOccupancyChart.data = {
                labels: ['Occupied', 'Available', 'Maintenance'],
                datasets: [{
                    data: [chartData.occupied, chartData.available, chartData.maintenance],
                    backgroundColor: [
                        'rgba(52, 152, 219, 0.8)',
                        'rgba(46, 204, 113, 0.8)',
                        'rgba(241, 196, 15, 0.8)'
                    ],
                    borderWidth: 1
                }]
            };
            roomOccupancyChart.update();
        }
        
        updateChartTimestamp('room');
    } catch (error) {
        console.error('Failed to update room chart:', error);
        showError('Failed to load room occupancy data');
    }
}

async function updateSeverityChart(data = null) {
    try {
        const chartData = data || await callApi('dashboard-patient-severity');
        
        if (severityChart) {
            severityChart.data = {
                labels: ['Low', 'Medium', 'High', 'Critical'],
                datasets: [{
                    label: 'Patients by Severity',
                    data: [chartData.low, chartData.medium, chartData.high, chartData.critical],
                    backgroundColor: [
                        'rgba(46, 204, 113, 0.8)',
                        'rgba(52, 152, 219, 0.8)',
                        'rgba(241, 196, 15, 0.8)',
                        'rgba(231, 76, 60, 0.8)'
                    ],
                    borderWidth: 1
                }]
            };
            severityChart.update();
        }
        
        updateChartTimestamp('severity');
    } catch (error) {
        console.error('Failed to update severity chart:', error);
        showError('Failed to load patient severity data');
    }
}



async function loadRecentActivity() {
    try {
        const activities = await callApi('recent-activity');
        const activityList = document.getElementById('activity-list');
        activityList.innerHTML = '';
        
        activities.forEach(activity => {
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';
            
            activityItem.innerHTML = `
                <div class="activity-icon">
                    <i class="fas fa-${activity.icon}"></i>
                </div>
                <div class="activity-info">
                    <h4>${activity.message}</h4>
                    <p>${activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}</p>
                </div>
                <div class="activity-time">${activity.time}</div>
            `;
            
            activityList.appendChild(activityItem);
        });
    } catch (error) {
        console.error('Failed to load recent activity:', error);
    }
}

// Room Operations
async function loadRooms() {
    try {
        const rooms = await callApi('rooms');
        renderRoomsTable(rooms);
    } catch (error) {
        console.error('Failed to load rooms:', error);
    }
}

function renderRoomsTable(rooms) {
    const tbody = roomsTable.querySelector('tbody');
    tbody.innerHTML = '';
    
    rooms.forEach(room => {
        const row = document.createElement('tr');
        
        // Status badge
        let statusBadge;
        if (room.status === 'available') {
            statusBadge = '<span class="badge badge-success">Available</span>';
        } else if (room.status === 'occupied') {
            statusBadge = '<span class="badge badge-danger">Occupied</span>';
        } else {
            statusBadge = '<span class="badge badge-warning">Maintenance</span>';
        }
        
        // Patients list
        const patientsList = room.patients.length > 0 
            ? room.patients.map(p => `<span class="badge badge-primary">${p}</span>`).join(' ') 
            : '<span class="text-muted">None</span>';
        
        // Action buttons (only for admin)
        let actions = '';
        if (currentUser.role === 'admin') {
            actions = `
                <button class="action-btn edit" data-id="${room.id}"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete" data-id="${room.id}"><i class="fas fa-trash"></i></button>
            `;
        }
        
        row.innerHTML = `
            <td>${room.room_number}</td>
            <td>${room.room_type.charAt(0).toUpperCase() + room.room_type.slice(1)}</td>
            <td>${room.capacity}</td>
            <td>${statusBadge}</td>
            <td>${patientsList}</td>
            <td class="admin-only">${actions}</td>
        `;
        
        tbody.appendChild(row);
    });
    
    // Add event listeners to action buttons
    document.querySelectorAll('.action-btn.edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const roomId = e.currentTarget.getAttribute('data-id');
            openRoomModal(roomId);
        });
    });
    
    document.querySelectorAll('.action-btn.delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const roomId = e.currentTarget.getAttribute('data-id');
            confirmAction('Delete Room', 'Are you sure you want to delete this room?', async () => {
                try {
                    await deleteRoom(roomId);
                    showSuccess('Room deleted successfully');
                } catch (error) {
                    showError('Failed to delete room');
                }
            });
        });
    });
}

async function addRoom(roomData) {
    try {
        await callApi('rooms', 'POST', roomData);
        await loadRooms();
        showSuccess('Room added successfully');
    } catch (error) {
        console.error('Failed to add room:', error);
        throw error;
    }
}

async function updateRoom(id, roomData) {
    try {
        await callApi('rooms', 'PUT', { id, ...roomData });
        await loadRooms();
        showSuccess('Room updated successfully');
    } catch (error) {
        console.error('Failed to update room:', error);
        throw error;
    }
}

async function deleteRoom(id) {
    try {
        await callApi('rooms', 'DELETE', { id });
        await loadRooms();
        showSuccess('Room deleted successfully');
    } catch (error) {
        console.error('Failed to delete room:', error);
        throw error;
    }
}

// Patient Operations
async function loadPatients() {
    try {
        const patients = await callApi('patients');
        renderPatientsTable(patients);
    } catch (error) {
        console.error('Failed to load patients:', error);
    }
}

async function loadMyPatients() {
    try {
        const patients = await callApi('my-patients');
        renderMyPatientsTable(patients);
    } catch (error) {
        console.error('Failed to load my patients:', error);
    }
}

function renderPatientsTable(patients) {
    const tbody = patientsTable.querySelector('tbody');
    tbody.innerHTML = '';
    
    patients.forEach(patient => {
        const row = document.createElement('tr');
        const age = calculateAge(patient.dob);
        
        // Severity badge
        let severityBadge;
        if (patient.severity === 'low') {
            severityBadge = '<span class="badge badge-success">Low</span>';
        } else if (patient.severity === 'medium') {
            severityBadge = '<span class="badge badge-primary">Medium</span>';
        } else if (patient.severity === 'high') {
            severityBadge = '<span class="badge badge-warning">High</span>';
        } else {
            severityBadge = '<span class="badge badge-danger">Critical</span>';
        }
        
        // Room info
        const roomInfo = patient.room 
            ? `${patient.room.room_number} (${patient.room.id})` 
            : '<span class="text-muted">Not assigned</span>';
        
        // Status
        const status = patient.discharge_date 
            ? '<span class="badge badge-secondary">Discharged</span>' 
            : '<span class="badge badge-success">Admitted</span>';
        
        // Action buttons (only for doctors and nurses)
        let actions = '';
        if (currentUser.role === 'doctor' || currentUser.role === 'nurse') {
            actions = `
                <button class="action-btn view" data-id="${patient.id}"><i class="fas fa-eye"></i></button>
                <button class="action-btn edit" data-id="${patient.id}"><i class="fas fa-edit"></i></button>
                <button class="action-btn discharge" data-id="${patient.id}"><i class="fas fa-sign-out-alt"></i></button>
            `;
        }
        
        row.innerHTML = `
            <td>${patient.patient_id}</td>
            <td>${patient.first_name} ${patient.last_name}</td>
            <td>${age}</td>
            <td>${patient.blood_type}</td>
            <td>${severityBadge}</td>
            <td>${roomInfo}</td>
            <td>${status}</td>
            <td class="doctor-nurse-only">${actions}</td>
        `;
        
        tbody.appendChild(row);
    });
    
    // Add event listeners to action buttons
    document.querySelectorAll('.action-btn.view').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const patientId = e.currentTarget.getAttribute('data-id');
            openPatientDetailsModal(patientId);
        });
    });
    
    document.querySelectorAll('.action-btn.edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const patientId = e.currentTarget.getAttribute('data-id');
            openPatientModal(patientId);
        });
    });
    
    document.querySelectorAll('.action-btn.discharge').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const patientId = e.currentTarget.getAttribute('data-id');
            confirmAction('Discharge Patient', 'Are you sure you want to discharge this patient?', async () => {
                try {
                    await dischargePatient(patientId);
                    showSuccess('Patient discharged successfully');
                } catch (error) {
                    showError('Failed to discharge patient');
                }
            });
        });
    });
}

function renderMyPatientsTable(patients) {
    const tbody = myPatientsTable.querySelector('tbody');
    tbody.innerHTML = '';
    
    patients.forEach(patient => {
        const row = document.createElement('tr');
        const age = calculateAge(patient.dob);
        
        // Severity badge
        let severityBadge;
        if (patient.severity === 'low') {
            severityBadge = '<span class="badge badge-success">Low</span>';
        } else if (patient.severity === 'medium') {
            severityBadge = '<span class="badge badge-primary">Medium</span>';
        } else if (patient.severity === 'high') {
            severityBadge = '<span class="badge badge-warning">High</span>';
        } else {
            severityBadge = '<span class="badge badge-danger">Critical</span>';
        }
        
        row.innerHTML = `
            <td>${patient.patient_id}</td>
            <td>${patient.first_name} ${patient.last_name}</td>
            <td>${age}</td>
            <td>${severityBadge}</td>
            <td>
                <button class="action-btn view" data-id="${patient.id}"><i class="fas fa-eye"></i></button>
                <button class="action-btn edit" data-id="${patient.id}"><i class="fas fa-edit"></i></button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    // Add event listeners to action buttons
    document.querySelectorAll('.action-btn.view').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const patientId = e.currentTarget.getAttribute('data-id');
            openPatientDetailsModal(patientId);
        });
    });
    
    document.querySelectorAll('.action-btn.edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const patientId = e.currentTarget.getAttribute('data-id');
            openPatientModal(patientId);
        });
    });
}

async function addPatient(patientData) {
    try {
        await callApi('patients', 'POST', patientData);
        await loadPatients();
        showSuccess('Patient added successfully');
    } catch (error) {
        console.error('Failed to add patient:', error);
        throw error;
    }
}

async function updatePatient(id, patientData) {
    try {
        await callApi('patients', 'PUT', { id, ...patientData });
        await loadPatients();
        showSuccess('Patient updated successfully');
    } catch (error) {
        console.error('Failed to update patient:', error);
        throw error;
    }
}

async function dischargePatient(id) {
    try {
        await callApi('discharge-patient', 'POST', { id });
        await loadPatients();
        showSuccess('Patient discharged successfully');
    } catch (error) {
        console.error('Failed to discharge patient:', error);
        throw error;
    }
}

// Staff Operations
async function loadStaff() {
    try {
        const staff = await callApi('staff');
        renderStaffTable(staff);
    } catch (error) {
        console.error('Failed to load staff:', error);
    }
}

function renderStaffTable(staff) {
    const tbody = staffTable.querySelector('tbody');
    tbody.innerHTML = '';
    
    staff.forEach(staffMember => {
        const row = document.createElement('tr');
        
        // Role badge
        let roleBadge;
        if (staffMember.role === 'admin') {
            roleBadge = '<span class="badge badge-danger">Admin</span>';
        } else if (staffMember.role === 'doctor') {
            roleBadge = '<span class="badge badge-primary">Doctor</span>';
        } else {
            roleBadge = '<span class="badge badge-success">Nurse</span>';
        }
        
        // Shift badge
        let shiftBadge = '';
        if (staffMember.shift) {
            if (staffMember.shift === 'morning') {
                shiftBadge = '<span class="badge badge-info">Morning</span>';
            } else if (staffMember.shift === 'afternoon') {
                shiftBadge = '<span class="badge badge-warning">Afternoon</span>';
            } else {
                shiftBadge = '<span class="badge badge-secondary">Night</span>';
            }
        }
        
        // Action buttons (only for admin)
        let actions = '';
        if (currentUser.role === 'admin') {
            actions = `
                <button class="action-btn edit" data-id="${staffMember.id}"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete" data-id="${staffMember.id}"><i class="fas fa-trash"></i></button>
            `;
        }
        
        row.innerHTML = `
            <td>${staffMember.full_name}</td>
            <td>${roleBadge}</td>
            <td>${staffMember.email}</td>
            <td>${staffMember.specialization || '-'}</td>
            <td>${shiftBadge || '-'}</td>
            <td class="admin-only">${actions}</td>
        `;
        
        tbody.appendChild(row);
    });
    
    // Add event listeners to action buttons
    document.querySelectorAll('.action-btn.edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const staffId = e.currentTarget.getAttribute('data-id');
            openStaffModal(staffId);
        });
    });
    
    document.querySelectorAll('.action-btn.delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const staffId = e.currentTarget.getAttribute('data-id');
            confirmAction('Delete Staff', 'Are you sure you want to delete this staff member?', async () => {
                try {
                    await deleteStaff(staffId);
                    showSuccess('Staff member deleted successfully');
                } catch (error) {
                    showError('Failed to delete staff member');
                }
            });
        });
    });
}

async function addStaff(staffData) {
    try {
        await callApi('staff', 'POST', staffData);
        await loadStaff();
        showSuccess('Staff member added successfully');
    } catch (error) {
        console.error('Failed to add staff:', error);
        throw error;
    }
}

async function updateStaff(id, staffData) {
    try {
        await callApi('staff', 'PUT', { id, ...staffData });
        await loadStaff();
        showSuccess('Staff member updated successfully');
    } catch (error) {
        console.error('Failed to update staff:', error);
        throw error;
    }
}

async function deleteStaff(id) {
    try {
        await callApi('staff', 'DELETE', { id });
        await loadStaff();
        showSuccess('Staff member deleted successfully');
    } catch (error) {
        console.error('Failed to delete staff:', error);
        throw error;
    }
}

// Modal Functions
function openRoomModal(roomId = null) {
    if (roomId) {
        document.getElementById('room-modal-title').textContent = 'Edit Room';
        document.getElementById('room-id').value = roomId;
        
        // Fetch room data
        callApi(`rooms/${roomId}`)
            .then(room => {
                document.getElementById('room-number').value = room.room_number;
                document.getElementById('room-type').value = room.room_type;
                document.getElementById('room-capacity').value = room.capacity;
                document.getElementById('room-status').value = room.status;
            })
            .catch(error => {
                console.error('Failed to fetch room data:', error);
                showError('Failed to load room data');
            });
    } else {
        document.getElementById('room-modal-title').textContent = 'Add New Room';
        document.getElementById('room-id').value = '';
        roomForm.reset();
    }
    
    roomModal.classList.add('active');
}

function openPatientModal(patientId = null) {
    if (patientId) {
        document.getElementById('patient-modal-title').textContent = 'Edit Patient';
        document.getElementById('patient-id-field').value = patientId;
        
        // Fetch patient data
        callApi(`patients/${patientId}`)
            .then(patient => {
                document.getElementById('patient-firstname').value = patient.first_name;
                document.getElementById('patient-lastname').value = patient.last_name;
                document.getElementById('patient-dob').value = patient.dob;
                document.getElementById('patient-gender').value = patient.gender;
                document.getElementById('patient-blood-type').value = patient.blood_type;
                document.getElementById('patient-severity').value = patient.severity;
                document.getElementById('patient-room').value = patient.room_id;
                document.getElementById('patient-isolated').checked = patient.is_isolated;
                document.getElementById('patient-contagious').checked = patient.is_contagious;
                document.getElementById('patient-notes').value = patient.notes;
            })
            .catch(error => {
                console.error('Failed to fetch patient data:', error);
                showError('Failed to load patient data');
            });
    } else {
        document.getElementById('patient-modal-title').textContent = 'Add New Patient';
        document.getElementById('patient-id-field').value = '';
        patientForm.reset();
    }
    
    // Load available rooms
    loadAvailableRoomsForPatient();
    
    patientModal.classList.add('active');
}

async function openPatientDetailsModal(patientId) {
    try {
        const patient = await callApi(`patients/${patientId}/details`);
        
        document.getElementById('patient-details-title').textContent = 'Patient Details';
        document.getElementById('detail-patient-id').textContent = patient.patient_id;
        document.getElementById('detail-patient-name').textContent = `${patient.first_name} ${patient.last_name}`;
        document.getElementById('detail-patient-age').textContent = calculateAge(patient.dob);
        document.getElementById('detail-patient-gender').textContent = patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1);
        document.getElementById('detail-patient-blood').textContent = patient.blood_type;
        document.getElementById('detail-patient-severity').textContent = patient.severity.charAt(0).toUpperCase() + patient.severity.slice(1);
        document.getElementById('detail-patient-room').textContent = patient.room ? `${patient.room.room_number} (${patient.room.room_type})` : 'Not assigned';
        document.getElementById('detail-patient-status').textContent = patient.discharge_date ? 'Discharged' : 'Admitted';
        document.getElementById('detail-patient-isolated').textContent = patient.is_isolated ? 'Yes' : 'No';
        document.getElementById('detail-patient-contagious').textContent = patient.is_contagious ? 'Yes' : 'No';
        
        // Populate diseases table
        const diseasesTbody = diseasesTable.querySelector('tbody');
        diseasesTbody.innerHTML = '';
        
        patient.diseases.forEach(disease => {
            const row = document.createElement('tr');
            
            // Status badge
            let statusBadge;
            if (disease.status === 'chronic') {
                statusBadge = '<span class="badge badge-warning">Chronic</span>';
            } else if (disease.status === 'treated') {
                statusBadge = '<span class="badge badge-success">Treated</span>';
            } else {
                statusBadge = '<span class="badge badge-danger">Active</span>';
            }
            
            // Action buttons (only for doctors and nurses)
            let actions = '';
            if (currentUser.role === 'doctor' || currentUser.role === 'nurse') {
                actions = `
                    <button class="action-btn edit" data-id="${disease.id}"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" data-id="${disease.id}"><i class="fas fa-trash"></i></button>
                `;
            }
            
            row.innerHTML = `
                <td>${disease.name}</td>
                <td>${formatDate(disease.diagnosis_date)}</td>
                <td>${statusBadge}</td>
                <td class="doctor-nurse-only">${actions}</td>
            `;
            
            diseasesTbody.appendChild(row);
        });
        
        // Populate treatments table
        const treatmentsTbody = treatmentsTable.querySelector('tbody');
        treatmentsTbody.innerHTML = '';
        
        patient.treatments.forEach(treatment => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${formatDate(treatment.date)}</td>
                <td>${treatment.type}</td>
                <td>${treatment.doctor}</td>
                <td>${treatment.notes}</td>
            `;
            
            treatmentsTbody.appendChild(row);
        });
        
        patientDetailsModal.classList.add('active');
    } catch (error) {
        console.error('Failed to load patient details:', error);
        showError('Failed to load patient details');
    }
}

function openStaffModal(staffId = null) {
    if (staffId) {
        document.getElementById('staff-modal-title').textContent = 'Edit Staff Member';
        document.getElementById('staff-id').value = staffId;
        
        // Fetch staff data
        callApi(`staff/${staffId}`)
            .then(staff => {
                document.getElementById('staff-fullname').value = staff.full_name;
                document.getElementById('staff-email').value = staff.email;
                document.getElementById('staff-username').value = staff.username;
                document.getElementById('staff-role').value = staff.role;
                document.getElementById('staff-specialization').value = staff.specialization || '';
                document.getElementById('staff-shift').value = staff.shift || '';
            })
            .catch(error => {
                console.error('Failed to fetch staff data:', error);
                showError('Failed to load staff data');
            });
    } else {
        document.getElementById('staff-modal-title').textContent = 'Add New Staff Member';
        document.getElementById('staff-id').value = '';
        staffForm.reset();
    }
    
    staffModal.classList.add('active');
}

function openDiseaseModal(diseaseId = null) {
    if (diseaseId) {
        document.getElementById('disease-modal-title').textContent = 'Edit Disease/Condition';
        document.getElementById('disease-id').value = diseaseId;
        
        // Fetch disease data
        callApi(`diseases/${diseaseId}`)
            .then(disease => {
                document.getElementById('disease-name').value = disease.name;
                document.getElementById('disease-date').value = disease.diagnosis_date;
                document.getElementById('disease-status').value = disease.status;
                document.getElementById('disease-notes').value = disease.notes;
            })
            .catch(error => {
                console.error('Failed to fetch disease data:', error);
                showError('Failed to load disease data');
            });
    } else {
        document.getElementById('disease-modal-title').textContent = 'Add Disease/Condition';
        document.getElementById('disease-id').value = '';
        diseaseForm.reset();
    }
    
    diseaseModal.classList.add('active');
}

function openTreatmentModal(treatmentId = null) {
    if (treatmentId) {
        document.getElementById('treatment-modal-title').textContent = 'Edit Treatment';
        document.getElementById('treatment-id').value = treatmentId;
        
        // Fetch treatment data
        callApi(`treatments/${treatmentId}`)
            .then(treatment => {
                document.getElementById('treatment-date').value = treatment.date;
                document.getElementById('treatment-type').value = treatment.type;
                document.getElementById('treatment-doctor').value = treatment.doctor_id;
                document.getElementById('treatment-notes').value = treatment.notes;
            })
            .catch(error => {
                console.error('Failed to fetch treatment data:', error);
                showError('Failed to load treatment data');
            });
    } else {
        document.getElementById('treatment-modal-title').textContent = 'Add Treatment';
        document.getElementById('treatment-id').value = '';
        treatmentForm.reset();
    }
    
    // Load doctors for dropdown
    loadDoctorsForTreatment();
    
    treatmentModal.classList.add('active');
}

async function loadAvailableRoomsForPatient() {
    try {
        const rooms = await callApi('available-rooms');
        const roomSelect = document.getElementById('patient-room');
        roomSelect.innerHTML = '<option value="">Select a room...</option>';
        
        rooms.forEach(room => {
            const option = document.createElement('option');
            option.value = room.id;
            option.textContent = `${room.room_number} (${room.room_type}, ${room.available_beds} beds available)`;
            roomSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to load available rooms:', error);
        showError('Failed to load available rooms');
    }
}

async function loadDoctorsForTreatment() {
    try {
        const doctors = await callApi('doctors');
        const doctorSelect = document.getElementById('treatment-doctor');
        doctorSelect.innerHTML = '<option value="">Select a doctor...</option>';
        
        doctors.forEach(doctor => {
            const option = document.createElement('option');
            option.value = doctor.id;
            option.textContent = doctor.full_name;
            doctorSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to load doctors:', error);
        showError('Failed to load doctors');
    }
}

// Form Handlers
async function handleRoomFormSubmit(e) {
    e.preventDefault();
    
    const roomId = document.getElementById('room-id').value;
    const isEdit = !!roomId;
    
    const roomData = {
        room_number: document.getElementById('room-number').value,
        room_type: document.getElementById('room-type').value,
        capacity: document.getElementById('room-capacity').value,
        status: document.getElementById('room-status').value
    };
    
    try {
        if (isEdit) {
            await updateRoom(roomId, roomData);
        } else {
            await addRoom(roomData);
        }
        closeAllModals();
    } catch (error) {
        console.error('Room operation failed:', error);
    }
}

async function handlePatientFormSubmit(e) {
    e.preventDefault();
    
    const patientId = document.getElementById('patient-id-field').value;
    const isEdit = !!patientId;
    
    const patientData = {
        first_name: document.getElementById('patient-firstname').value,
        last_name: document.getElementById('patient-lastname').value,
        dob: document.getElementById('patient-dob').value,
        gender: document.getElementById('patient-gender').value,
        blood_type: document.getElementById('patient-blood-type').value,
        severity: document.getElementById('patient-severity').value,
        room_id: document.getElementById('patient-room').value,
        is_isolated: document.getElementById('patient-isolated').checked,
        is_contagious: document.getElementById('patient-contagious').checked,
        notes: document.getElementById('patient-notes').value
    };
    
    try {
        if (isEdit) {
            await updatePatient(patientId, patientData);
        } else {
            await addPatient(patientData);
        }
        closeAllModals();
    } catch (error) {
        console.error('Patient operation failed:', error);
    }
}

async function handleStaffFormSubmit(e) {
    e.preventDefault();
    
    const staffId = document.getElementById('staff-id').value;
    const isEdit = !!staffId;
    
    const staffData = {
        full_name: document.getElementById('staff-fullname').value,
        email: document.getElementById('staff-email').value,
        username: document.getElementById('staff-username').value,
        password: document.getElementById('staff-password').value,
        role: document.getElementById('staff-role').value,
        specialization: document.getElementById('staff-specialization').value,
        shift: document.getElementById('staff-shift').value
    };
    
    try {
        if (isEdit) {
            await updateStaff(staffId, staffData);
        } else {
            await addStaff(staffData);
        }
        closeAllModals();
    } catch (error) {
        console.error('Staff operation failed:', error);
    }
}

async function handleDiseaseFormSubmit(e) {
    e.preventDefault();
    
    const diseaseId = document.getElementById('disease-id').value;
    const isEdit = !!diseaseId;
    
    const diseaseData = {
        name: document.getElementById('disease-name').value,
        diagnosis_date: document.getElementById('disease-date').value,
        status: document.getElementById('disease-status').value,
        notes: document.getElementById('disease-notes').value
    };
    
    try {
        if (isEdit) {
            await callApi(`diseases/${diseaseId}`, 'PUT', diseaseData);
            showSuccess('Disease updated successfully');
        } else {
            await callApi('diseases', 'POST', diseaseData);
            showSuccess('Disease added successfully');
        }
        closeAllModals();
    } catch (error) {
        console.error('Disease operation failed:', error);
        showError('Failed to save disease');
    }
}

async function handleTreatmentFormSubmit(e) {
    e.preventDefault();
    
    const treatmentId = document.getElementById('treatment-id').value;
    const isEdit = !!treatmentId;
    
    const treatmentData = {
        date: document.getElementById('treatment-date').value,
        type: document.getElementById('treatment-type').value,
        doctor_id: document.getElementById('treatment-doctor').value,
        notes: document.getElementById('treatment-notes').value
    };
    
    try {
        if (isEdit) {
            await callApi(`treatments/${treatmentId}`, 'PUT', treatmentData);
            showSuccess('Treatment updated successfully');
        } else {
            await callApi('treatments', 'POST', treatmentData);
            showSuccess('Treatment added successfully');
        }
        closeAllModals();
    } catch (error) {
        console.error('Treatment operation failed:', error);
        showError('Failed to save treatment');
    }
}

// Utility Functions
function closeAllModals() {
    modals.forEach(modal => modal.classList.remove('active'));
}

function confirmAction(title, message, callback) {
    document.getElementById('confirm-modal-title').textContent = title;
    document.getElementById('confirm-modal-message').textContent = message;
    
    const yesBtn = document.getElementById('confirm-yes');
    const noBtn = document.getElementById('confirm-no');
    
    // Remove previous event listeners
    yesBtn.replaceWith(yesBtn.cloneNode(true));
    noBtn.replaceWith(noBtn.cloneNode(true));
    
    // Add new event listeners
    document.getElementById('confirm-yes').addEventListener('click', () => {
        closeAllModals();
        callback();
    });
    
    document.getElementById('confirm-no').addEventListener('click', closeAllModals);
    
    confirmModal.classList.add('active');
}

function calculateAge(dob) {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age;
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Report Functions
function initReportSection() {
    reportChart = new Chart(reportChartCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: '',
                data: [],
                backgroundColor: 'rgba(52, 152, 219, 0.8)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
    
    document.getElementById('generate-report-btn').addEventListener('click', generateReport);
    document.getElementById('export-report-btn').addEventListener('click', exportReport);
}

async function generateReport() {
    const reportType = document.getElementById('report-type').value;
    const reportPeriod = document.getElementById('report-period').value;
    
    try {
        const reportData = await callApi('reports', 'POST', {
            type: reportType,
            period: reportPeriod
        });
        
        updateReportChart(reportType, reportData);
        showSuccess('Report generated successfully');
    } catch (error) {
        console.error('Failed to generate report:', error);
        showError('Failed to generate report');
    }
}

function updateReportChart(reportType, data) {
    if (reportChart) {
        reportChart.destroy();
    }
    
    let chartConfig = {};
    
    switch(reportType) {
        case 'occupancy':
            chartConfig = {
                type: 'bar',
                data: {
                    labels: data.labels,
                    datasets: [{
                        label: 'Room Occupancy',
                        data: data.values,
                        backgroundColor: 'rgba(52, 152, 219, 0.8)'
                    }]
                }
            };
            break;
        case 'admissions':
            chartConfig = {
                type: 'line',
                data: {
                    labels: data.labels,
                    datasets: [{
                        label: 'Patient Admissions',
                        data: data.values,
                        backgroundColor: 'rgba(46, 204, 113, 0.2)',
                        borderColor: 'rgba(46, 204, 113, 1)',
                        borderWidth: 2,
                        fill: true
                    }]
                }
            };
            break;
        case 'diseases':
            chartConfig = {
                type: 'pie',
                data: {
                    labels: data.labels,
                    datasets: [{
                        label: 'Disease Cases',
                        data: data.values,
                        backgroundColor: [
                            'rgba(52, 152, 219, 0.8)',
                            'rgba(46, 204, 113, 0.8)',
                            'rgba(241, 196, 15, 0.8)',
                            'rgba(231, 76, 60, 0.8)',
                            'rgba(155, 89, 182, 0.8)'
                        ]
                    }]
                }
            };
            break;
    }
    
    reportChart = new Chart(reportChartCtx, {
        ...chartConfig,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function exportReport() {
    // In a real app, this would generate a PDF or Excel file
    alert('Exporting report...');
}

function updateTimestamps() {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Safely update both timestamps with null checks
    const roomTimeElement = document.getElementById('room-chart-update-time');
    const severityTimeElement = document.getElementById('severity-chart-update-time');
    
    if (roomTimeElement) roomTimeElement.textContent = timeString;
    if (severityTimeElement) severityTimeElement.textContent = timeString;
}

// Add event listeners with null checks (optional chaining)
document.getElementById('refresh-room-btn')?.addEventListener('click', function() {
    // ... your existing refresh code ...
    updateTimestamps(); // Update timestamps after refresh
});

document.getElementById('refresh-severity-btn')?.addEventListener('click', function() {
    // ... your existing refresh code ...
    updateTimestamps(); // Update timestamps after refresh
});

// Initialize timestamps when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // ... your existing code ...
    updateTimestamps(); // Set initial timestamps
});