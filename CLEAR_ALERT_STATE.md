# Clear Alert State - Debugging Guide

## Issue: Siren Beeping Without Trigger

The siren is playing without manually triggering because:

1. **Old localStorage state** - Previous alert state is still saved
2. **Database has Danger devices** - Some devices are still in "Danger" status
3. **Persistent WebSocket state** - Old alert messages still active

## Quick Fix Steps

### Step 1: Clear Browser Storage
**Open browser console (F12) and run:**
```javascript
// Clear alert state
localStorage.removeItem('smokeSenseAlertState');

// Clear device simulator state  
localStorage.removeItem('deviceSimulatorState');

// Clear all localStorage (nuclear option)
localStorage.clear();

// Refresh the page
location.reload();
```

### Step 2: Check Database Device Status
**Run this SQL query to check device status:**
```sql
SELECT id, device_name, status, last_reading, aqi_level FROM devices;
```

**If any devices show "Danger" status, reset them:**
```sql
UPDATE devices SET status = 'Online', last_reading = 0, aqi_level = 0;
```

### Step 3: Clear Alerts Table (Optional)
**If you want to clear all old alerts:**
```sql
DELETE FROM alerts WHERE status IN ('Smoke Detected', 'Warning State');
```

### Step 4: Restart Everything
1. **Refresh alerts page** (F5)
2. **Refresh device.html** (F5)  
3. **Restart backend server** (Ctrl+C, then `python app.py`)

## Debugging Commands

### Check Current State
**Run these in browser console:**

```javascript
// Check localStorage alert state
console.log('Alert state:', localStorage.getItem('smokeSenseAlertState'));

// Check device simulator state
console.log('Device state:', localStorage.getItem('deviceSimulatorState'));

// Check if siren is playing
console.log('Siren playing:', window.EmergencyAudio?.isPlaying);

// Check audio armed status
console.log('Audio armed:', _audioArmed);

// Check pending alert flag
console.log('Pending alert:', _pendingAlertPlay);
```

### Force Stop Siren
**If siren won't stop, run in console:**
```javascript
// Force stop siren
if (window.EmergencyAudio) {
    window.EmergencyAudio.stopSiren();
    console.log('Siren force stopped');
}

// Clear all flags
_pendingAlertPlay = false;
_audioArmed = false;

// Clear localStorage
localStorage.removeItem('smokeSenseAlertState');

// Refresh page
location.reload();
```

## Check Backend Status

### Backend Console Output
**Look for these messages in backend console:**
```
[API] Updating device X: status=Danger, smoke_level=950
[API] ✓ Alert logged: device_id=X, status=Smoke Detected
```

**If you see these without triggering, check:**
1. **Device simulator** - Is it still running from previous session?
2. **Database state** - Are devices stuck in Danger status?
3. **WebSocket messages** - Are old messages still being sent?

### Stop All Background Processes
1. **Close all device.html tabs**
2. **Stop backend server** (Ctrl+C)
3. **Restart backend server** (`python app.py`)
4. **Open fresh alerts page**

## Prevention Steps

### Clean Shutdown Procedure
**When stopping testing:**

1. **Stop alert in device.html** (click "Stop Alert" button)
2. **Wait for siren to stop** in alerts page
3. **Close device.html tab**
4. **Close alerts page tab**
5. **Stop backend server**

### Clean Startup Procedure  
**When starting testing:**

1. **Start backend server** (`python app.py`)
2. **Open fresh alerts page** (new tab)
3. **Open fresh device.html** (new tab)
4. **Check both consoles** for clean startup
5. **Trigger alert** when ready

## Expected Clean State

### Browser Console (Alerts Page)
```
[Init] ⏱️ Page loading started at 10:30:45
[Init] No stored alert state - normal page load
[Audio] 🔥 Attempting aggressive audio arming...
[WebSocket] ✓ Connected successfully
[Init] ✓ Full initialization complete
[Periodic Check] ✓ No danger and siren is stopped correctly
```

### Browser Console (Device.html)
```
[Device] No stored alert state or expired
[Device] WebSocket connected
```

### Backend Console
```
[API] No recent device status updates
```

### Database State
```sql
-- All devices should be Online
SELECT status, COUNT(*) FROM devices GROUP BY status;
-- Result: Online: 2, Warning: 0, Danger: 0

-- No recent alerts
SELECT COUNT(*) FROM alerts WHERE timestamp > NOW() - INTERVAL 1 HOUR;
-- Result: 0 (or very few)
```

## Troubleshooting Specific Issues

### Issue: Siren won't stop even after clearing localStorage

**Try:**
1. **Hard refresh** - Ctrl+Shift+R (clears cache)
2. **Incognito mode** - Open alerts page in private window
3. **Different browser** - Try Chrome, Firefox, Edge
4. **Check other tabs** - Close all other smoke detector tabs

### Issue: Siren stops but starts again immediately

**Check:**
1. **Device simulator** - Is another tab still sending alerts?
2. **Database** - Are devices still in Danger status?
3. **Backend logs** - Are continuous updates still coming?
4. **WebSocket** - Are old messages still in queue?

### Issue: Can't clear localStorage

**Try:**
1. **Browser settings** - Clear site data manually
2. **Developer tools** - Application tab → Storage → Clear
3. **Incognito mode** - Start fresh session
4. **Different browser** - Use clean browser

## Quick Reset Script

**Save this as a bookmark for quick reset:**

```javascript
javascript:(function(){
    // Clear all localStorage
    localStorage.clear();
    
    // Stop siren if playing
    if(window.EmergencyAudio) {
        window.EmergencyAudio.stopSiren();
    }
    
    // Clear flags
    if(typeof _pendingAlertPlay !== 'undefined') _pendingAlertPlay = false;
    if(typeof _audioArmed !== 'undefined') _audioArmed = false;
    
    // Refresh page
    location.reload();
    
    alert('Alert state cleared and page refreshed');
})();
```

**To use:** Copy the entire javascript code, create a new bookmark, paste as URL.

## Summary

The siren is beeping because:
1. **Old state persists** from previous testing
2. **Database has active alerts** 
3. **localStorage remembers alert state**

**Quick fix:** Clear localStorage + Reset database + Restart everything

**Prevention:** Always use "Stop Alert" button before closing tabs