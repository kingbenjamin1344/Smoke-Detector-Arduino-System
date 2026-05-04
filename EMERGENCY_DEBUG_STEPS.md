# EMERGENCY DEBUG: Stop Unwanted Siren

## Step 1: Immediate Siren Stop

**Open browser console (F12) on the alerts page and run these commands one by one:**

```javascript
// 1. Check current state
console.log('=== CURRENT STATE ===');
console.log('Siren playing:', window.EmergencyAudio?.isPlaying);
console.log('Audio armed:', typeof _audioArmed !== 'undefined' ? _audioArmed : 'undefined');
console.log('Pending alert:', typeof _pendingAlertPlay !== 'undefined' ? _pendingAlertPlay : 'undefined');
console.log('Alert localStorage:', localStorage.getItem('smokeSenseAlertState'));
console.log('Device localStorage:', localStorage.getItem('deviceSimulatorState'));
```

```javascript
// 2. Force stop everything
console.log('=== FORCE STOPPING ===');

// Stop siren immediately
if (window.EmergencyAudio) {
    window.EmergencyAudio.stopSiren();
    console.log('✓ Siren stopped');
}

// Clear all flags
if (typeof _pendingAlertPlay !== 'undefined') {
    _pendingAlertPlay = false;
    console.log('✓ Pending alert cleared');
}

if (typeof _audioArmed !== 'undefined') {
    _audioArmed = false;
    console.log('✓ Audio disarmed');
}

// Clear localStorage
localStorage.removeItem('smokeSenseAlertState');
localStorage.removeItem('deviceSimulatorState');
console.log('✓ localStorage cleared');
```

```javascript
// 3. Stop periodic checks
console.log('=== STOPPING PERIODIC CHECKS ===');
if (typeof _alertCheckInterval !== 'undefined' && _alertCheckInterval) {
    clearInterval(_alertCheckInterval);
    _alertCheckInterval = null;
    console.log('✓ Periodic checks stopped');
}

// Stop any other intervals
for (let i = 1; i < 1000; i++) {
    clearInterval(i);
}
console.log('✓ All intervals cleared');
```

## Step 2: Check Database State

**Run the diagnostic script:**
```bash
cd Backend
python check_system_state.py
```

**If it shows devices in "Danger" status, reset them:**
```sql
-- Connect to MySQL and run:
USE smoke_detector_db;
UPDATE devices SET status = 'Online', last_reading = 0, aqi_level = 0;
SELECT id, device_name, status FROM devices;
```

## Step 3: Check What's Triggering the Siren

**In browser console, add this monitoring code:**

```javascript
// Monitor what's calling startSiren
console.log('=== MONITORING SIREN CALLS ===');

// Override startSiren to see what's calling it
if (typeof startSiren !== 'undefined') {
    const originalStartSiren = startSiren;
    startSiren = function() {
        console.error('🚨 startSiren() called from:');
        console.trace();
        return originalStartSiren.apply(this, arguments);
    };
    console.log('✓ Siren monitoring enabled');
}

// Monitor WebSocket messages
if (typeof socket !== 'undefined' && socket) {
    socket.addEventListener('message', function(event) {
        const data = JSON.parse(event.data);
        console.log('📡 WebSocket message:', data);
        if (data.status === 'Danger') {
            console.error('🔴 DANGER message received:', data);
        }
    });
    console.log('✓ WebSocket monitoring enabled');
}
```

## Step 4: Check for Hidden Device Simulator

**Check if device simulator is running somewhere:**

```javascript
// Check if device simulator state exists
console.log('=== CHECKING DEVICE SIMULATOR ===');
const deviceState = localStorage.getItem('deviceSimulatorState');
if (deviceState) {
    console.log('Device simulator state found:', JSON.parse(deviceState));
} else {
    console.log('No device simulator state');
}

// Check for any intervals sending alerts
console.log('Active intervals:', window.alertInterval);
if (window.alertInterval) {
    clearInterval(window.alertInterval);
    window.alertInterval = null;
    console.log('✓ Device alert interval cleared');
}
```

## Step 5: Nuclear Option - Complete Reset

**If siren still won't stop:**

```javascript
// NUCLEAR RESET - Run this in console
console.log('=== NUCLEAR RESET ===');

// Stop all audio
if (window.EmergencyAudio) {
    window.EmergencyAudio.isPlaying = false;
    if (window.EmergencyAudio._intervalId) {
        clearInterval(window.EmergencyAudio._intervalId);
        window.EmergencyAudio._intervalId = null;
    }
    if (window.EmergencyAudio.audioCtx) {
        window.EmergencyAudio.audioCtx.close();
    }
    console.log('✓ Audio system destroyed');
}

// Clear all storage
localStorage.clear();
sessionStorage.clear();
console.log('✓ All storage cleared');

// Clear all intervals and timeouts
for (let i = 1; i < 10000; i++) {
    clearInterval(i);
    clearTimeout(i);
}
console.log('✓ All timers cleared');

// Reload page
setTimeout(() => {
    location.reload();
}, 1000);
```

## Step 6: Check Backend Logs

**Look at your backend console for continuous messages like:**
```
[API] Updating device X: status=Danger, smoke_level=950
```

**If you see these, something is continuously sending Danger status. Check:**

1. **Other browser tabs** - Close ALL tabs with device.html
2. **Other browser windows** - Check if device simulator is open elsewhere
3. **Backend restart** - Stop and restart the backend server
4. **Database check** - Verify no devices are stuck in Danger status

## Step 7: Identify the Source

**Run this in console to trace the problem:**

```javascript
// Add comprehensive logging
console.log('=== COMPREHENSIVE DEBUG ===');

// Check page URL
console.log('Current URL:', window.location.href);

// Check if this is device simulator page
if (window.location.href.includes('device.html')) {
    console.log('🔴 This is device simulator page!');
    console.log('isAlerting:', typeof isAlerting !== 'undefined' ? isAlerting : 'undefined');
    if (typeof isAlerting !== 'undefined' && isAlerting) {
        console.log('🔴 Device simulator is actively alerting!');
        // Stop it
        isAlerting = false;
        if (window.alertInterval) {
            clearInterval(window.alertInterval);
            window.alertInterval = null;
        }
        console.log('✓ Device simulator stopped');
    }
}

// Check WebSocket connection
if (typeof socket !== 'undefined') {
    console.log('WebSocket state:', socket.readyState);
    console.log('WebSocket URL:', socket.url);
}

// List all global variables that might be causing issues
const globals = Object.keys(window).filter(key => 
    key.includes('alert') || 
    key.includes('siren') || 
    key.includes('audio') ||
    key.includes('interval')
);
console.log('Relevant globals:', globals);
```

## Expected Results:

### ✅ If Siren Stops:
- Console shows "✓ Siren stopped"
- No more beeping sounds
- Periodic checks show "No danger"

### ❌ If Siren Continues:
- Check console for error messages
- Look for "🚨 startSiren() called from:" traces
- Check backend logs for continuous API calls
- Verify database has no Danger devices

## Quick Checklist:

- [ ] Ran force stop commands in console
- [ ] Cleared localStorage completely  
- [ ] Checked database for Danger devices
- [ ] Closed all device.html tabs
- [ ] Restarted backend server
- [ ] Verified no WebSocket messages with Danger status
- [ ] Used nuclear reset if needed

**Run through these steps and let me know what the console output shows!**