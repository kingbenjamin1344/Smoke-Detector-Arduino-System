# Final Alert System Testing Guide

## What Was Fixed (Latest Changes)

### Issue 1: Siren Stops After Few Loops
**Root Cause**: The `stopSiren()` function was `async`, causing race conditions and timing issues.

**Fix**: Made `stopSiren()` synchronous with promise-based verification, added flag to prevent multiple simultaneous stops.

### Issue 2: Delay on Page Refresh
**Root Cause**: The system waited for API calls before attempting to resume audio.

**Fix**: Immediately attempts to resume audio from localStorage state, then verifies with API in parallel.

### Issue 3: Siren Interval Stopping Unexpectedly
**Root Cause**: No watchdog to detect when the interval stops working.

**Fix**: 
- Added `_lastToneTime` tracking
- Periodic check now verifies tones are actually playing
- Auto-restarts siren if it detects stalled interval
- Logs every 5 tones (every 5 seconds) instead of 10

## Key Improvements

### 1. Audio System Robustness
```javascript
// Now tracks last tone time
_lastToneTime: 0

// Detects stalled intervals
if (timeSinceLastTone > 3000) {
    console.warn('Siren stalled - restarting');
    restart();
}

// Logs every 5 tones for better visibility
if (this._toneCount % 5 === 0) {
    console.log('🔊 Tone #', this._toneCount);
}
```

### 2. Faster Periodic Checks
- Now runs every **3 seconds** (was 5)
- Checks if tones are actually playing
- Auto-restarts if siren stalls

### 3. Immediate Resume on Refresh
```javascript
// Tries to start immediately from localStorage
if (storedState && storedState.isActive) {
    // Don't wait - try to start now
    if (ctx.state === 'running') {
        playSiren(); // Immediate!
    }
}
```

### 4. Better Stop Protection
```javascript
// Non-blocking verification
function stopSiren() {
    if (_stopSirenInProgress) return; // Prevent race
    
    _stopSirenInProgress = true;
    
    // Verify asynchronously without blocking
    verifyNoDanger().then(confirmed => {
        if (confirmed) actuallyStop();
    });
}
```

## Testing Steps

### Test 1: Continuous Play (CRITICAL)
1. Open alerts page with console (F12)
2. Open device.html
3. Trigger alert
4. **Watch console for 30 seconds**
5. **Expected Output:**
   ```
   [EmergencyAudio] 🔊 Tone # 5 | isPlaying: true
   [EmergencyAudio] 🔊 Tone # 10 | isPlaying: true
   [EmergencyAudio] 🔊 Tone # 15 | isPlaying: true
   [EmergencyAudio] 🔊 Tone # 20 | isPlaying: true
   [EmergencyAudio] 🔊 Tone # 25 | isPlaying: true
   [EmergencyAudio] 🔊 Tone # 30 | isPlaying: true
   ```
6. **Verify**: Tone count increases continuously, no stops

### Test 2: Fast Refresh Resume
1. With alert active
2. **Immediately refresh** (F5)
3. **Expected**: Siren resumes within 1-2 seconds
4. **Console should show:**
   ```
   [Init] Found stored alert state
   [Init] Audio context already running - starting siren immediately
   [EmergencyAudio] 🚨 Starting siren...
   [EmergencyAudio] ✓ Siren started
   [EmergencyAudio] 🔊 Tone # 5
   ```

### Test 3: Watchdog Recovery
1. With alert active
2. Watch console for periodic checks
3. **Expected every 3 seconds:**
   ```
   [Periodic Check] Danger: true | Siren playing: true | Tone count: 15
   [Periodic Check] ✓ Danger active and siren is playing correctly
   ```
4. If siren somehow stops, should see:
   ```
   [Periodic Check] ⚠️ Danger detected but siren NOT playing - attempting to start
   [Siren] startSiren() called
   [EmergencyAudio] 🚨 Starting siren...
   ```

### Test 4: Stop Protection
1. With alert active
2. Try to stop (click "Stop Alert" in device.html)
3. **Expected:**
   ```
   [Device] Sending Online status
   [Siren] stopSiren() called - will verify danger status
   [Siren] Confirmed no danger - proceeding with stop
   [EmergencyAudio] 🛑 stopSiren called
   [EmergencyAudio] ✓ Interval cleared
   ```

### Test 5: Multiple Refreshes
1. Trigger alert
2. Refresh 5 times quickly
3. **Expected**: Each time siren resumes within 1-2 seconds
4. Tone count should continue from where it left off

## Console Log Patterns

### ✅ PERFECT - Everything Working
```
[EmergencyAudio] 🔊 Tone # 5 | isPlaying: true | intervalId: 123 | ctx state: running
[Periodic Check] Danger: true | Siren playing: true | Audio armed: true | Tone count: 5
[Periodic Check] ✓ Danger active and siren is playing correctly
[EmergencyAudio] 🔊 Tone # 10 | isPlaying: true | intervalId: 123 | ctx state: running
[Periodic Check] Danger: true | Siren playing: true | Audio armed: true | Tone count: 10
[Periodic Check] ✓ Danger active and siren is playing correctly
```

### ⚠️ WARNING - Watchdog Detected Issue
```
[Periodic Check] ⚠️ Siren playing but no tones in 3500 ms - restarting
[EmergencyAudio] 🛑 stopSiren called
[EmergencyAudio] ✓ Interval cleared
[Siren] startSiren() called
[EmergencyAudio] 🚨 Starting siren...
[EmergencyAudio] ✓ Siren started
```
This is GOOD - it means the watchdog caught and fixed the issue!

### ❌ BAD - Siren Stopped Unexpectedly
```
[EmergencyAudio] 🔊 Tone # 10
[EmergencyAudio] 🔊 Tone # 15
[EmergencyAudio] 🛑 stopSiren called
[Siren] stopSiren() called
```
If you see this WITHOUT a "Stop Alert" action, something is wrong.

### ✅ GOOD - Fast Resume After Refresh
```
[Init] Page loading - checking alert state
[Init] Found stored alert state from 10:30:45 AM
[Init] Audio context already running - starting siren immediately
[EmergencyAudio] 🚨 Starting siren...
[EmergencyAudio] ✓ Siren started - intervalId: 456 | isPlaying: true
[EmergencyAudio] 🔊 Tone # 5
```
Total time from page load to first tone: < 2 seconds

## Troubleshooting

### Issue: Tone count stops increasing

**Check:**
1. Last tone number: `[EmergencyAudio] 🔊 Tone # X`
2. Look for: `[EmergencyAudio] 🛑 stopSiren called`
3. If found, check what called it:
   - `[Siren] stopSiren() called` - Something triggered stop
   - Look above for reason

**Expected Fix:**
Within 3 seconds, periodic check should detect and restart:
```
[Periodic Check] ⚠️ Danger detected but siren NOT playing
[Siren] startSiren() called
```

### Issue: Delay on page refresh

**Check:**
1. Time from `[Init] Page loading` to `[EmergencyAudio] 🚨 Starting siren`
2. Should be < 2 seconds
3. If longer, check:
   - Is localStorage set? `localStorage.getItem('smokeSenseAlertState')`
   - Audio context state: Look for `ctx state: running` or `suspended`

**If suspended:**
```
[Init] Audio context suspended - showing banner
```
This is normal - click the banner to resume.

### Issue: Siren stops after few loops

**Check console for:**
1. `[EmergencyAudio] ⚠️ _playTone called but isPlaying is FALSE`
   - Means something set isPlaying to false
2. `[EmergencyAudio] ⚠️ Interval running but isPlaying is FALSE`
   - Interval detected the issue and cleared itself
3. Look for what set isPlaying to false:
   - `[EmergencyAudio] 🛑 stopSiren called`
   - Check the stack trace or logs above it

**Expected Recovery:**
```
[Periodic Check] ⚠️ Danger detected but siren NOT playing - attempting to start
```

## Success Criteria

Run Test 1 for 60 seconds. Success if:

1. ✅ Tone count reaches at least 60 (one per second)
2. ✅ No unexpected stops in console
3. ✅ Periodic checks show: `✓ Danger active and siren is playing correctly`
4. ✅ No warnings about stalled intervals
5. ✅ Refresh resumes within 2 seconds
6. ✅ Stop works cleanly when alert cleared

## Expected Tone Count Timeline

- **5 seconds**: Tone # 5
- **10 seconds**: Tone # 10
- **30 seconds**: Tone # 30
- **60 seconds**: Tone # 60
- **5 minutes**: Tone # 300

If tone count stops increasing, the watchdog should restart it within 3 seconds.

## If Still Not Working

**Provide these details:**

1. **Console logs** from page load to when siren stops
2. **Tone count** when it stopped (e.g., "Stopped at Tone # 15")
3. **Time elapsed** before stopping (e.g., "Stopped after 15 seconds")
4. **Last periodic check** message before stop
5. **Any warnings** or errors in red
6. **Browser** and version (Chrome, Firefox, Edge, etc.)

The detailed logging will show exactly what's happening!

## Quick Diagnostic Commands

Run these in browser console:

```javascript
// Check if siren is playing
window.EmergencyAudio.isPlaying

// Check tone count
window.EmergencyAudio._toneCount

// Check interval ID
window.EmergencyAudio._intervalId

// Check last tone time
new Date(window.EmergencyAudio._lastToneTime).toLocaleTimeString()

// Check localStorage
localStorage.getItem('smokeSenseAlertState')

// Manually start siren (if audio armed)
window.EmergencyAudio.playSiren()

// Check audio context state
window.EmergencyAudio.audioCtx.state
```
