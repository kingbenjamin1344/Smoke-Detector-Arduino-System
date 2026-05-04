document.addEventListener('DOMContentLoaded', function() {
    // Live "EKG" Monitoring Chart (Multi-Device with EXPLICIT X-Axis Labels)
    const ctx = document.getElementById('smokeChart');
    let smokeChart = null;
    const deviceDatasets = {}; 
    const MAX_POINTS = 10; // Reduced to 10 columns as requested

    if (ctx) {
        smokeChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array(MAX_POINTS).fill('Initializing...'), 
                datasets: [] 
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 400,
                    easing: 'linear'
                },
                layout: {
                    padding: { bottom: 20 }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#888',
                            font: { size: 12, family: 'Montserrat' },
                            usePointStyle: true
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        grid: { color: 'rgba(0, 0, 0, 0.05)' },
                        ticks: { color: '#333' }
                    },
                    x: {
                        grid: { display: true, color: 'rgba(0, 0, 0, 0.03)' },
                        ticks: { 
                            color: '#333',
                            font: { size: 11, weight: '500' },
                            maxRotation: 45,
                            minRotation: 45,
                            autoSkip: false // Force it to show the labels we provide
                        }
                    }
                }
            }
        });

        // Hook into the global system update
        window.onSystemUpdate = function(data) {
            if (data.type === 'alert' || data.type === 'DEVICE_UPDATE') {
                const deviceId = String(data.device_id);
                const level = parseInt(data.smoke_level) || 0;
                const status = data.status || 'Online';
                
                // Detailed Label: "Time (Date)"
                const now = new Date();
                const timeStr = now.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const dateStr = now.toLocaleDateString([], { month: 'short', day: 'numeric' });
                const fullLabel = `${timeStr} (${dateStr})`;
                
                if (deviceDatasets[deviceId] === undefined) {
                    const colors = ['#00ff88', '#3498db', '#f1c40f', '#9b59b6', '#e67e22'];
                    const colorIndex = Object.keys(deviceDatasets).length % colors.length;
                    
                    const newDataset = {
                        label: `Device ${deviceId}`,
                        data: Array(MAX_POINTS).fill(0),
                        borderColor: colors[colorIndex],
                        borderWidth: 2,
                        pointRadius: 4, // Larger points so we can see them better
                        tension: 0.4,
                        fill: false
                    };
                    
                    smokeChart.data.datasets.push(newDataset);
                    deviceDatasets[deviceId] = smokeChart.data.datasets.length - 1;
                    
                    fetchRoomName(deviceId).then(name => {
                        if (name) smokeChart.data.datasets[deviceDatasets[deviceId]].label = name;
                        smokeChart.update('none');
                    });
                }

                // Update Data
                const dsIndex = deviceDatasets[deviceId];
                const dataset = smokeChart.data.datasets[dsIndex];
                
                dataset.data.push(level);
                dataset.data.shift();

                // Update Labels - Force showing the time on the X-axis
                smokeChart.data.labels.push(fullLabel);
                smokeChart.data.labels.shift();

                // Update line color/width based on status
                if (status === 'Danger') {
                    dataset.borderColor = '#ff4d4d';
                    dataset.borderWidth = 4;
                } else if (status === 'Warning') {
                    dataset.borderColor = '#ff9f43';
                    dataset.borderWidth = 3;
                } else {
                    // Maintain original color or reset to normal
                }

                smokeChart.update('none');
            }
        };
    }

    async function fetchRoomName(id) {
        try {
            const res = await fetch('http://localhost:5000/api/devices');
            const devices = await res.json();
            const device = devices.find(d => String(d.id) === String(id));
            return device ? (device.device_name || `Sensor ${id}`) : null;
        } catch (e) { return null; }
    }

    updateDashboardStats();
    setInterval(updateDashboardStats, 5000);
});

async function updateDashboardStats() {
    try {
        const response = await fetch('http://localhost:5000/api/dashboard/stats');
        const stats = await response.json();
        if (response.ok) {
            const activeDevicesEl = document.getElementById('activeDevicesCount');
            const totalRoomsEl = document.getElementById('totalRoomsCount');
            const alertHistoryEl = document.getElementById('alertHistoryCount');
            const threatsEl = document.getElementById('threatsCount');
            if (activeDevicesEl) activeDevicesEl.innerText = stats.active_devices;
            if (totalRoomsEl) totalRoomsEl.innerText = stats.total_rooms;
            if (alertHistoryEl) alertHistoryEl.innerText = stats.alert_history;
            if (threatsEl) threatsEl.innerText = stats.threats;
        }
    } catch (error) {}
}
