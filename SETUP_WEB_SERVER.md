# Fix: Setup Web Server Access

## Issue: File:// URLs Causing Problems

You're opening files directly from the file system:
```
file:///C:/xampp/htdocs/Smoke%20Detector/FrontEnd/HTML/alerts.html
```

This causes:
- ❌ CORS security restrictions
- ❌ localStorage doesn't work properly  
- ❌ WebSocket connections may fail
- ❌ API calls get blocked

## Solution: Use XAMPP Web Server

Since you have XAMPP installed, use the proper web server URLs:

### Correct URLs to Use:

#### Alerts Page:
```
http://localhost/Smoke%20Detector/FrontEnd/HTML/alerts.html
```

#### Device Simulator:
```
http://localhost/Smoke%20Detector/FrontEnd/simulation/device.html
```

#### Dashboard (if needed):
```
http://localhost/Smoke%20Detector/FrontEnd/HTML/index.html
```

## Setup Steps:

### Step 1: Start XAMPP Services
1. **Open XAMPP Control Panel**
2. **Start Apache** (click Start button)
3. **Start MySQL** (click Start button)
4. **Verify** - Both should show "Running" status

### Step 2: Access Through Web Server
1. **Close all current browser tabs**
2. **Open new tab**
3. **Navigate to**: `http://localhost/Smoke%20Detector/FrontEnd/HTML/alerts.html`
4. **Open another tab for device simulator**: `http://localhost/Smoke%20Detector/FrontEnd/simulation/device.html`

### Step 3: Verify Proper Loading
**Check browser console (F12) for:**
```
[Init] ⏱️ Page loading started at 10:30:45
[Audio] 🔥 Attempting aggressive audio arming...
[WebSocket] ✓ Connected successfully
```

**Should NOT see:**
- CORS errors
- File:// security warnings
- localStorage errors

## Quick Test:

### Test localStorage Works:
**Run in browser console:**
```javascript
// Test localStorage
localStorage.setItem('test', 'working');
console.log('localStorage test:', localStorage.getItem('test'));
// Should show: "localStorage test: working"
```

### Test API Access:
**Run in browser console:**
```javascript
// Test API access
fetch('http://localhost:5000/api/devices')
  .then(r => r.json())
  .then(d => console.log('API test:', d.length, 'devices'))
  .catch(e => console.error('API error:', e));
```

### Test WebSocket:
**Check console for:**
```
[WebSocket] ✓ Connected successfully
```

## Troubleshooting:

### Issue: "localhost refused to connect"

**Check:**
1. **XAMPP Apache** is running (green in control panel)
2. **Port 80** is not blocked by firewall
3. **Try**: `http://127.0.0.1/Smoke%20Detector/...` instead

### Issue: "404 Not Found"

**Check:**
1. **File path** is correct in XAMPP htdocs folder
2. **Folder structure**:
   ```
   C:\xampp\htdocs\
   └── Smoke Detector\
       ├── Backend\
       └── FrontEnd\
           ├── HTML\
           │   └── alerts.html
           └── simulation\
               └── device.html
   ```

### Issue: Still getting CORS errors

**Check:**
1. **Using http://localhost** (not file://)
2. **Backend server** is running on port 5000
3. **WebSocket server** is running on port 8080

## Complete System Startup:

### Proper Startup Sequence:
1. **Start XAMPP** (Apache + MySQL)
2. **Start Backend Server**:
   ```bash
   cd "C:\xampp\htdocs\Smoke Detector\Backend"
   python app.py
   ```
3. **Start WebSocket Server**:
   ```bash
   cd "C:\xampp\htdocs\Smoke Detector\Websocket Server"
   node server.js
   ```
4. **Open Browser Tabs**:
   - `http://localhost/Smoke%20Detector/FrontEnd/HTML/alerts.html`
   - `http://localhost/Smoke%20Detector/FrontEnd/simulation/device.html`

### Verify All Services:
- ✅ **XAMPP Apache**: Running (port 80)
- ✅ **Backend API**: Running (port 5000)  
- ✅ **WebSocket**: Running (port 8080)
- ✅ **MySQL**: Running (port 3306)

## Expected Behavior After Fix:

### ✅ localStorage Works:
- Alert state persists across refreshes
- Device simulator state persists
- No security warnings

### ✅ API Calls Work:
- Device status updates properly
- Alerts get logged to database
- Real-time updates via WebSocket

### ✅ Siren System Works:
- Proper state management
- Reliable audio arming
- Consistent behavior

## Clear Previous Issues:

After switching to proper URLs:

1. **Clear browser cache**: Ctrl+Shift+Delete
2. **Clear localStorage**: `localStorage.clear()`
3. **Reset database**: Run `python check_system_state.py`
4. **Fresh start**: Close all tabs, reopen with http:// URLs

## Bookmark These URLs:

Save these bookmarks for easy access:

- **Alerts**: `http://localhost/Smoke%20Detector/FrontEnd/HTML/alerts.html`
- **Device Sim**: `http://localhost/Smoke%20Detector/FrontEnd/simulation/device.html`
- **Dashboard**: `http://localhost/Smoke%20Detector/FrontEnd/HTML/index.html`

## Why This Fixes the Siren Issue:

### Before (file:// URLs):
- ❌ localStorage doesn't work properly
- ❌ Alert state gets corrupted
- ❌ Siren plays unexpectedly
- ❌ Can't clear state properly

### After (http:// URLs):
- ✅ localStorage works correctly
- ✅ Alert state managed properly  
- ✅ Siren only plays when triggered
- ✅ Easy to clear and reset state

**This should resolve the unexpected siren beeping issue!**