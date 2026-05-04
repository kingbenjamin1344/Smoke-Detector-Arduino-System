// ─── Device Cache ─────────────────────────────────────────────────────────────
// Stores the latest known device state from BOTH DB fetches and WS messages.
const _deviceCache = new Map();

function updateCache(device) {
    _deviceCache.set(String(device.id), device);
}

function patchCache(deviceId, fields) {
    const id = String(deviceId);
    if (_deviceCache.has(id)) {
        Object.assign(_deviceCache.get(id), fields);
    } else {
        _deviceCache.set(id, { id: deviceId, ...fields });
    }
}

// ─── Fetch helper (cache-busting) ────────────────────────────────────────────
function apiFetch(url) {
    return fetch(url, { cache: 'no-store' });
}

// ─── System Alerts Integration ──────────────────────────────────────────────
// SystemAlerts handles audio and global state.
window.onSystemUpdate = function(wsData) {
    handleRealTimeUpdate(wsData);
};

// ─── Real-time update ────────────────────────────────────────────────────────
async function handleRealTimeUpdate(wsData) {
    const isDanger  = wsData.status === 'Danger';
    const devId     = String(wsData.device_id);

    // 1. Update cache
    patchCache(devId, {
        status:       wsData.status,
        last_reading: wsData.smoke_level ?? 0,
        aqi_level:    wsData.smoke_level ?? 0
    });

    // 2. Update card UI
    const grid = document.getElementById('alertsGrid');
    if (grid) {
        const card = grid.querySelector(`[data-device-id="${devId}"]`);
        if (card) {
            updateCardUI(card, wsData);
            if (isDanger) {
                card.classList.add('danger-pulse');
                grid.prepend(card);
            } else {
                card.classList.remove('danger-pulse');
            }
        } else {
            // New device or missed card, reload all
            loadAlertCards();
        }
    }

    // 3. Update modal if open
    const modal = document.getElementById('roomModal');
    if (modal && modal.style.display === 'flex' && modal.getAttribute('data-current-device-id') === devId) {
        const cached = _deviceCache.get(devId);
        if (cached) updateModalUI(cached);
    }
}

// ─── Init ────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    loadAlertCards();
});

// Helper function to update individual card UI
function updateCardUI(card, wsData) {
    const isDanger = wsData.status === 'Danger';
    const isWarning = wsData.status === 'Warning';
    const low = wsData.status ? wsData.status.toLowerCase() : 'online';

    const aqiEl = card.querySelector('.aqi-value');
    if (aqiEl) { 
        aqiEl.innerText = wsData.smoke_level ?? 0; 
        aqiEl.className = `aqi-value ${low}`; 
    }

    const stEl = card.querySelector('.alert-status-text');
    if (stEl) { 
        stEl.innerText = isDanger ? 'Smoke Detected' : isWarning ? 'Warning State' : 'Good Condition'; 
        stEl.className = `alert-status-text ${low}`; 
    }

    const icEl = card.querySelector('.alert-icon-main');
    if (icEl) { 
        icEl.className = `fas ${isDanger ? 'fa-exclamation-circle' : isWarning ? 'fa-exclamation-triangle' : 'fa-check-circle'} alert-icon-main ${low}`; 
    }

    const smEl = card.querySelector('.aqi-icon-small i');
    if (smEl) { 
        smEl.className = `fas ${(isDanger || isWarning) ? 'fa-smog' : 'fa-wind'}`; 
        smEl.parentElement.className = `aqi-icon-small ${low}`; 
    }
}

// ─── Load cards ──────────────────────────────────────────────────────────────
async function loadAlertCards() {
    const grid = document.getElementById('alertsGrid');
    if (!grid) return;

    try {
        const res      = await apiFetch('http://localhost:5000/api/devices');
        const devices  = await res.json();

        // 🔥 MERGE WITH LIVE CACHE (from system-alerts.js)
        // This ensures if the DB is still updating, we show the true Live state
        devices.forEach(dev => {
            if (window.SystemAlerts && typeof window.SystemAlerts.getLiveDeviceData === 'function') {
                const live = window.SystemAlerts.getLiveDeviceData(dev.id);
                if (live) {
                    console.log(`[Alerts] ⚡ Navigation Sync: Overriding device ${dev.id} with live state:`, live.status);
                    dev.status = live.status;
                    dev.smoke_level = live.smoke_level;
                    dev.aqi_level = live.smoke_level;
                }
            }
        });

        const assigned = devices.filter(d => d.assignment_status === 'Assigned');

        devices.forEach(updateCache);

        if (assigned.length === 0) {
            grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:50px;color:white;"><i class="fas fa-info-circle" style="font-size:40px;margin-bottom:20px;color:var(--primary-color);"></i><h3>No Assigned Devices</h3></div>`;
            return;
        }

        grid.innerHTML = '';
        assigned.sort((a, b) => { const r = s => s==='Danger'?0:s==='Warning'?1:2; return r(a.status)-r(b.status); });
        assigned.forEach((dev, i) => grid.appendChild(createAlertCard(dev, i)));

    } catch (_) {
        grid.innerHTML = `<p style="color:white;text-align:center;grid-column:1/-1;">Error connecting to backend.</p>`;
    }
}

function createAlertCard(device, index) {
    const card = document.createElement('div');
    card.className = 'room-alert-card animate-fade-in';
    card.setAttribute('data-device-id', String(device.id));
    card.style.animationDelay = `${index * 0.1}s`;

    const isDanger  = device.status === 'Danger';
    const isWarning = device.status === 'Warning';
    const sc  = isDanger ? 'danger'                : isWarning ? 'warning'              : 'success';
    const st  = isDanger ? 'Smoke Detected'        : isWarning ? 'Warning State'        : 'Good Condition';
    const ic  = isDanger ? 'fa-exclamation-circle' : isWarning ? 'fa-exclamation-triangle' : 'fa-check-circle';
    const aqi = (isDanger || isWarning) ? 'fa-smog' : 'fa-wind';

    if (isDanger) card.classList.add('danger-pulse');

    card.innerHTML = `
        <div class="alert-top">
            <span class="room-id">Room ${device.room_id || 'N/A'}</span>
            <span class="alert-time"><i class="far fa-clock"></i> ${new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>
            <i class="fas ${ic} alert-icon-main ${sc}"></i>
            <h3 class="alert-status-text ${sc}">${st}</h3>
            <p class="owner-name"><i class="fas fa-user"></i> ${device.room_owner||'Unknown'}</p>
        </div>
        <div class="alert-bottom">
            <div class="aqi-info">
                <span class="aqi-label">AQI Level</span>
                <span class="aqi-value ${sc}">${device.aqi_level ?? device.last_reading ?? 0}</span>
            </div>
            <div class="aqi-icon-small ${sc}"><i class="fas ${aqi}"></i></div>
        </div>`;

    card.onclick = () => openRoomDetails(String(device.id));
    return card;
}

// ─── Modal ───────────────────────────────────────────────────────────────────
async function openRoomDetails(deviceId) {
    const modal = document.getElementById('roomModal');
    if (!modal) return;

    const cached = _deviceCache.get(String(deviceId));
    if (!cached) {
        try {
            const res = await apiFetch('http://localhost:5000/api/devices');
            const devs = await res.json();
            const dev = devs.find(d => String(d.id) === String(deviceId));
            if (!dev) return;
            updateCache(dev);
            modal.setAttribute('data-current-device-id', String(deviceId));
            updateModalUI(dev);
            openModal('roomModal');
        } catch (e) { console.error('Modal fetch error', e); }
        return;
    }

    modal.setAttribute('data-current-device-id', String(deviceId));
    updateModalUI(cached);
    openModal('roomModal');
}

function updateModalUI(device) {
    if (!device) return;
    const modal = document.getElementById('roomModal');
    if (!modal) return;

    const titleEl = document.getElementById('modalRoomTitle');
    const ownerEl = document.getElementById('modalOwner');
    const floorEl = document.getElementById('modalFloor');

    if (titleEl) titleEl.innerText = `Room ${device.room_id}`;
    if (ownerEl) ownerEl.innerText = `Owner: ${device.room_owner || 'Unknown'}`;
    if (floorEl) floorEl.innerText = `Floor: ${device.floor || 'N/A'}`;

    const modalCard = modal.querySelector('.room-alert-card');
    if (modalCard) {
        const fresh = createAlertCard(device, 0);
        modalCard.innerHTML = fresh.innerHTML;
        modalCard.className = fresh.className;
    }
}
