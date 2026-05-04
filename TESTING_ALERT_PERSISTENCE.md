# Testing Alert Persistence - Step by Step Guide

## What Was Fixed

The alert system now has:
1. **Detailed console logging** - Every action is logged for debugging
2. **Faster periodic checks** - Every 5 seconds instead of 10
3. **Better state management** - Tracks audio armed status and pending alerts
4. **Improved banner interaction** - Better handling of user clicks

## How to Test

### Test 1: Basic Persistence (Most Important)

1. **Start the system**
   - Open the alerts page
   - Open browser console (F12)
   - You should see: `[Alert] Periodic check started - checking every 5 seconds`

2. **Trigger a danger alert**
   - Use your device simulator to set a device to "Danger" status
   - Watch the console for:
     ```
     [Siren] startSiren() called
     [Siren] ✓ Starting siren now
     [Siren] Siren started and state saved
     ```
   - Verify the siren is playing

3. **Refresh the page (CRITICAL TEST)**
   - Press F5 or Ctrl+R to refresh
   - Watch the console carefully:
     ```
     [Alert] Page loaded - Danger status: true
     [Alert] Danger detected - attempting to resume siren
     ```
   
4. **Expected Outcomes:**

   **Scenario A: Audio Auto-Resumes (Best Case)**
   - Console shows: `[Alert] Siren resumed successfully after page load`
   - Siren plays automatically
   - No banner appears
   
   **Scenario B: Banner Appears (Browser Blocked Autoplay)**
   - Console shows: `[Alert] Waiting for user interaction to resume siren`
   - Red banner appears at top: "🚨 ACTIVE SMOKE ALERT — Click anywhere..."
   - Click anywhere on the page
   - Console shows: `[Banner] User clicked banner - arming audio`
   - Then: `[Banner] Starting siren after user interaction`
   - Siren starts playing

5. **Verify Periodic Checks**
   - Every 5 seconds you should see in console:
     ```
     [Periodic Check] Danger status: true | Siren playing: true | Audio armed: true
     [Periodic Check] ✓ Danger active and siren is playing correctly
     ```

### Test 2: Multiple Refreshes

1. With danger active and siren playing
2. Refresh the page 3-4 times in a row
3. Each time, verify:
   - Siren resumes (or banner appears)
   - Console shows proper logging
   - Periodic checks continue working

### Test 3: State Cleanup

1. With danger active and siren playing
2. Clear the danger status (set device back to "Online")
3. Watch console:
   ```
   [Periodic Check] No danger but siren still playing - stopping
   [Siren] stopSiren() called
   [Siren] Siren stopped and state cleared
   ```
4. Refresh the page
5. Verify:
   - No siren plays
   - No banner appears
   - Console shows: `[Alert] No danger detected - state cleared`

### Test 4: Banner Interaction

1. Open page in **Incognito/Private mode** (forces autoplay block)
2. Trigger danger alert
3. Refresh the page
4. Banner should appear immediately
5. Click the banner
6. Watch console:
   ```
   [Banner] User clicked banner - arming audio
   [Audio] Arming audio after user interaction
   [Audio] ✓ Audio armed successfully
   [Banner] Starting siren after user interaction
   ```
7. Verify siren starts playing

### Test 5: Long Duration Test

1. Trigger danger alert
2. Let it run for 2-3 minutes
3. Refresh the page during this time
4. Verify siren resumes each time
5. Check console every 5 seconds for periodic check logs

## Console Log Reference

### Normal Operation Logs

**On Page Load (No Danger):**
```
[Alert] Page loaded - Danger status: false
[Alert] No danger detected - state cleared
[Alert] Periodic check started - checking every 5 seconds
[Periodic Check] Danger status: false | Siren playing: false | Audio armed: false
[Periodic Check] ✓ No danger and siren is stopped correctly
```

**On Page Load (With Danger - Auto Resume):**
```
[Alert] Page loaded - Danger status: true
[Alert] Danger detected - attempting to resume siren
[Alert] Siren resumed successfully after page load
[Alert] Periodic check started - checking every 5 seconds
[Periodic Check] Danger status: true | Siren playing: true | Audio armed: true
[Periodic Check] ✓ Danger active and siren is playing correctly
```

**On Page Load (With Danger - Needs Interaction):**
```
[Alert] Page loaded - Danger status: true
[Alert] Danger detected - attempting to resume siren
[Alert] Waiting for user interaction to resume siren
[Banner] Showing alert resume banner
[Alert] Periodic check started - checking every 5 seconds
[Periodic Check] Danger status: true | Siren playing: false | Audio armed: false
[Periodic Check] ⚠️ Danger detected but siren NOT playing - attempting to start
[Periodic Check] Audio NOT armed - showing banner and setting pending flag
```

**When User Clicks Banner:**
```
[Banner] User clicked banner - arming audio
[Audio] Arming audio after user interaction
[Audio] ✓ Audio armed successfully
[Audio] Pending alert detected - playing siren now
[Banner] Starting siren after user interaction
```

**When Danger Clears:**
```
[Periodic Check] No danger but siren still playing - stopping
[Siren] stopSiren() called - isPlaying: true
[Siren] Siren stopped and state cleared
```

## Troubleshooting

### Issue: Siren doesn't resume after refresh

**Check Console For:**
1. Is danger status detected?
   - Look for: `[Alert] Page loaded - Danger status: true`
   - If false, the device isn't actually in danger state

2. Is periodic check running?
   - Look for: `[Periodic Check]` logs every 5 seconds
   - If missing, check if JavaScript errors occurred

3. Is audio armed?
   - Look for: `Audio armed: true` in periodic checks
   - If false, click anywhere on the page to arm it

4. Is banner showing?
   - If banner appears, click it to enable audio
   - This is normal browser behavior for autoplay protection

### Issue: Console shows errors

**Common Errors:**
- `Failed to save alert state` - LocalStorage might be disabled
- `Failed to fetch` - Backend server not running
- `EmergencyAudio not available` - audio-alerts.js not loaded

### Issue: Periodic checks not running

1. Check if `startPeriodicAlertCheck()` was called
2. Look for: `[Alert] Periodic check started`
3. If missing, check for JavaScript errors on page load

## Expected Behavior Summary

✅ **Siren SHOULD persist** across page refreshes when danger is active
✅ **Banner SHOULD appear** if browser blocks autoplay (normal behavior)
✅ **Periodic checks SHOULD run** every 5 seconds
✅ **Console logs SHOULD be detailed** showing every step
✅ **Siren SHOULD stop** when danger clears
✅ **State SHOULD clear** when no danger exists

## Browser Compatibility Notes

- **Chrome/Edge**: Usually allows auto-resume if user has interacted with site before
- **Firefox**: More restrictive, often requires banner click
- **Safari**: Most restrictive, almost always requires banner click
- **Incognito/Private**: Always requires banner click (by design)

## Next Steps If Still Not Working

If after following these tests the siren still doesn't persist:

1. **Share console logs** - Copy all console output during a refresh
2. **Check localStorage** - Open DevTools → Application → Local Storage → Check for `smokeSenseAlertState`
3. **Verify backend** - Ensure device status is actually "Danger" in database
4. **Check network** - Ensure API calls to `/api/devices` are succeeding
5. **Test in different browser** - Try Chrome, Firefox, and Edge
