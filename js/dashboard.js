// Dashboard.js - Handle dynamic dashboard functionality

document.addEventListener('DOMContentLoaded', function() {
    // Default to 7-day period
    let selectedPeriod = '7';
    
    // Set up period selector
    const periodSelector = document.getElementById('time-period-selector');
    if (periodSelector) {
        periodSelector.addEventListener('change', function() {
            selectedPeriod = this.value;
            loadDashboardData();
        });
    }
    
    // Initial data load
    loadDashboardData();
    
    // Function to load all dashboard data based on selected period
    function loadDashboardData() {
        // Update stats
        loadDashboardStats();
        
        // Update charts
        loadRoomOccupancy();
        loadPatientSeverity();
        loadAdmissionsTrend();
        
        // Update any other dynamic elements
        updateLastRefreshed();
    }
    
    // Load dashboard statistics
    function loadDashboardStats() {
        fetch(`/dashboard.php?action=dashboard-stats&period=${selectedPeriod}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const stats = data.data;
                    
                    // Update stat cards
                    document.querySelector('#total-patients .count').textContent = stats.total_patients;
                    document.querySelector('#total-doctors .count').textContent = stats.total_doctors;
                    document.querySelector('#total-nurses .count').textContent = stats.total_nurses;
                    document.querySelector('#total-rooms .count').textContent = stats.total_rooms;
                    
                    // Update new patients stat with period label
                    document.querySelector('#new-patients .count').textContent = stats.new_patients;
                    document.querySelector('#new-patients .period').textContent = `in last ${selectedPeriod} days`;
                    
                    // Update occupancy rate with percentage
                    document.querySelector('#occupancy-rate .count').textContent = `${stats.room_occupancy_rate}%`;
                }
            })
            .catch(error => console.error('Error loading dashboard stats:', error));
    }
    
    // Load room occupancy chart
    function loadRoomOccupancy() {
        fetch('/dashboard.php?action=room-occupancy')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const chartData = data.data;
                    const ctx = document.getElementById('room-occupancy-chart').getContext('2d');
                    
                    // Destroy existing chart if exists
                    if (window.roomOccupancyChart) {
                        window.roomOccupancyChart.destroy();
                    }
                    
                    // Create new chart
                    window.roomOccupancyChart = new Chart(ctx, {
                        type: 'pie',
                        data: {
                            labels: chartData.labels,
                            datasets: chartData.datasets
                        },
                        options: {
                            responsive: true,
                            plugins: {
                                legend: {
                                    position: 'right',
                                }
                            }
                        }
                    });
                }
            })
            .catch(error => console.error('Error loading room occupancy chart:', error));
    }
    
    // Load patient severity chart
    function loadPatientSeverity() {
        fetch(`/dashboard.php?action=patient-severity&period=${selectedPeriod}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const chartData = data.data;
                    const ctx = document.getElementById('patient-severity-chart').getContext('2d');
                    
                    // Destroy existing chart if exists
                    if (window.patientSeverityChart) {
                        window.patientSeverityChart.destroy();
                    }
                    
                    // Create new chart
                    window.patientSeverityChart = new Chart(ctx, {
                        type: 'bar',
                        data: {
                            labels: chartData.labels,
                            datasets: chartData.datasets
                        },
                        options: {
                            responsive: true,
                            scales: {
                                y: {
                                    beginAtZero: true
                                }
                            }
                        }
                    });
                    
                    // Update period label if available
                    const periodLabel = document.querySelector('#patient-severity-period');
                    if (periodLabel) {
                        periodLabel.textContent = `Last ${selectedPeriod} days`;
                    }
                }
            })
            .catch(error => console.error('Error loading patient severity chart:', error));
    }
    
    // Load admissions trend chart
    function loadAdmissionsTrend() {
        fetch(`/dashboard.php?action=admissions-trend&period=${selectedPeriod}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const chartData = data.data;
                    const ctx = document.getElementById('admissions-trend-chart').getContext('2d');
                    
                    // Destroy existing chart if exists
                    if (window.admissionsTrendChart) {
                        window.admissionsTrendChart.destroy();
                    }
                    
                    // Create new chart
                    window.admissionsTrendChart = new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: chartData.labels,
                            datasets: chartData.datasets
                        },
                        options: {
                            responsive: true,
                            scales: {
                                y: {
                                    beginAtZero: true
                                }
                            }
                        }
                    });
                    
                    // Update period label if available
                    const periodLabel = document.querySelector('#admissions-trend-period');
                    if (periodLabel) {
                        periodLabel.textContent = `Last ${selectedPeriod} days`;
                    }
                }
            })
            .catch(error => console.error('Error loading admissions trend chart:', error));
    }
    
    // Update last refreshed timestamp
    function updateLastRefreshed() {
        const now = new Date();
        const formattedTime = now.toLocaleTimeString();
        const lastRefreshedEl = document.getElementById('last-refreshed');
        if (lastRefreshedEl) {
            lastRefreshedEl.textContent = `Last updated: ${formattedTime}`;
        }
    }
    
    // Set up refresh button if it exists
    const refreshBtn = document.getElementById('refresh-dashboard');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            loadDashboardData();
        });
    }
    
    // Set up auto-refresh interval (every 5 minutes)
    setInterval(loadDashboardData, 300000);
});