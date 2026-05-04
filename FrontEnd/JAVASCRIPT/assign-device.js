document.addEventListener('DOMContentLoaded', function() {
    checkBackendConnection();
    loadDevices();
    loadRooms();
    renderDeviceTable();

    // Register Room Form Submission
    const registerRoomForm = document.getElementById('registerRoomForm');
    if (registerRoomForm) {
        registerRoomForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                room_name: document.getElementById('newRoomName').value,
                room_number: document.getElementById('newRoomName').value, // Using same for now
                floor: document.getElementById('newRoomFloor').value,
                room_owner: document.getElementById('newRoomOwner').value,
                description: document.getElementById('newRoomDesc').value
            };

            const submitBtn = e.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerText;
            submitBtn.innerText = 'REGISTERING...';
            submitBtn.disabled = true;

            try {
                const response = await fetch('http://localhost:5000/api/rooms', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                if (response.ok) {
                    alert('Room registered successfully!');
                    registerRoomForm.reset(); // Clear the form
                    closeModal('roomModal');
                    await loadRooms(); // Refresh dropdown
                } else {
                    const errData = await response.json();
                    alert('Error: ' + (errData.message || 'Registration failed'));
                }
            } catch (err) {
                console.error('Error registering room:', err);
                alert('Connection error. Is the backend server running?');
            } finally {
                submitBtn.innerText = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    // Assign Device Form Submission
    const assignDeviceForm = document.getElementById('assignDeviceForm');
    if (assignDeviceForm) {
        assignDeviceForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const deviceId = document.getElementById('deviceDropdown').value;
            const roomId = document.getElementById('roomDropdown').value;
            const floor = document.getElementById('floorDropdown').value;
            const roomOwner = document.getElementById('autoRoomOwner').value;

            // Logic to update device with room details
            try {
                // We need a PATCH endpoint for devices to assign them
                const response = await fetch(`http://localhost:5000/api/devices/${deviceId}/assign`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        room_id: roomId,
                        floor: floor,
                        room_owner: roomOwner,
                        assignment_status: 'Assigned'
                    })
                });

                if (response.ok) {
                    alert('Device assigned successfully!');
                    closeModal('registerModal');
                    location.reload(); // Refresh table
                }
            } catch (err) {
                console.error('Error assigning device:', err);
            }
        });
    }
});

let globalRooms = [];

async function loadDevices() {
    const dropdown = document.getElementById('deviceDropdown');
    dropdown.innerHTML = '<option value="">Loading devices...</option>';
    
    try {
        const response = await fetch('http://localhost:5000/api/devices');
        if (!response.ok) throw new Error('Failed to fetch devices');
        
        const devices = await response.json();
        dropdown.innerHTML = '<option value="">Choose Device...</option>';
        
        if (devices.length === 0) {
            dropdown.innerHTML = '<option value="">No devices registered</option>';
        } else {
            devices.forEach(dev => {
                const option = document.createElement('option');
                option.value = dev.id;
                option.textContent = `${dev.device_name} (ID: ${dev.id})`;
                dropdown.appendChild(option);
            });
        }
    } catch (err) {
        console.error('Error loading devices:', err);
        dropdown.innerHTML = '<option value="">Error connecting to server</option>';
    }
}

async function loadRooms() {
    const dropdown = document.getElementById('roomDropdown');
    const statusEl = document.getElementById('roomDropdownStatus');
    if (statusEl) statusEl.innerText = '(Loading...)';
    
    dropdown.innerHTML = '<option value="">Choose Room...</option>';
    
    try {
        const response = await fetch('http://localhost:5000/api/rooms');
        if (!response.ok) throw new Error('Failed to fetch rooms');
        
        globalRooms = await response.json();
        
        if (globalRooms.length === 0) {
            dropdown.innerHTML = '<option value="">No rooms found. Register one first!</option>';
        } else {
            globalRooms.forEach(room => {
                const option = document.createElement('option');
                option.value = room.id;
                option.textContent = `${room.room_name} (${room.room_number})`;
                dropdown.appendChild(option);
            });
        }
        if (statusEl) statusEl.innerText = '';
    } catch (err) {
        console.error('Error loading rooms:', err);
        if (statusEl) statusEl.innerText = '(Offline)';
        dropdown.innerHTML = '<option value="">Error connecting to server</option>';
    }
}

async function checkBackendConnection() {
    try {
        const response = await fetch('http://localhost:5000/api/dashboard/stats');
        if (response.ok) {
            console.log("Backend connection healthy");
        }
    } catch (err) {
        console.warn("Backend server seems offline. Please run your Python app.py");
        alert("CRITICAL: Backend server is offline! Dropdowns will not work. Please start your Python app.");
    }
}

function handleRoomChange(roomId) {
    const ownerInput = document.getElementById('autoRoomOwner');
    const floorDropdown = document.getElementById('floorDropdown');
    
    const selectedRoom = globalRooms.find(r => r.id == roomId);
    if (selectedRoom) {
        ownerInput.value = selectedRoom.room_owner;
        floorDropdown.value = selectedRoom.floor;
    } else {
        ownerInput.value = '';
        floorDropdown.value = '';
    }
}

async function renderDeviceTable() {
    const tableBody = document.getElementById('deviceTableBody');
    if (!tableBody) return;

    try {
        const response = await fetch('http://localhost:5000/api/devices');
        const devices = await response.json();
        
        tableBody.innerHTML = '';
        devices.forEach((dev, index) => {
            const row = document.createElement('tr');
            if (index % 2 !== 0) row.style.background = 'rgba(255, 255, 255, 0.03)';
            
            row.innerHTML = `
                <td>${dev.device_name}</td>
                <td><i class="fas fa-user-circle"></i> ${dev.room_owner || 'Unassigned'}</td>
                <td style="color: var(--primary-color); font-weight: 700;">${dev.room_id || '---'}</td>
                <td>${dev.floor || '---'}</td>
                <td><span class="status-badge ${dev.status.toLowerCase()}">${dev.status}</span></td>
                <td><span class="assignment-badge ${dev.assignment_status.toLowerCase()}">${dev.assignment_status}</span></td>
            `;
            tableBody.appendChild(row);
        });
    } catch (err) {
        console.error('Error rendering table:', err);
    }
}

// Live Updates handler for the Assign Device page
window.onSystemUpdate = function(data) {
    console.log('[AssignDevice] ⚡ Live update received:', data);
    // Refresh the table to reflect live smoke levels and status
    renderDeviceTable();
};
