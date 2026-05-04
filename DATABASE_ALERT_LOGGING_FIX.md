# Database Alert Logging Fix

## Issues Found

### 1. Database Schema Issues
- **Device status enum** only supported `'Online', 'Warning', 'Offline'` but simulator sends `'Danger'`
- **Alert logging** only happened for `'Warning'` status, not `'Danger'`
- **Missing columns** - `last_reading` column missing from devices table
- **Alerts table mismatch** - Backend expected different column structure

### 2. Backend Logging Issues
- **No logging for Danger status** - Only Warning status triggered alert logging
- **Incorrect alert table structure** - Backend code didn't match database schema
- **No error handling** - Database errors weren't being caught or logged

## Fixes Implemented

### 1. Database Schema Update
```sql
-- Update devices table to support 'Danger' status
ALTER TABLE devices 
MODIFY COLUMN status ENUM('Online', 'Warning', 'Danger', 'Offline') DEFAULT 'Online';

-- Add last_reading column
ALTER TABLE devices 
ADD COLUMN last_reading INT DEFAULT 0 AFTER aqi_level;

-- Ensure alerts table has correct structure
-- (device_id, room_id, status, aqi_value, timestamp)
```

### 2. Backend API Enhancement
```python
# Now logs alerts for both Warning AND Danger
if status in ['Warning', 'Danger']:
    alert_status = 'Smoke Detected' if status == 'Danger' else 'Warning State'
    # Insert into alerts table with proper structure
    
# Added comprehensive logging
log_message(f"[API] Updating device {device_id}: status={status}")
log_message(f"[API] ✓ Alert logged: device_id={device_id}, status={alert_status}")
```

### 3. Error Handling & Logging
- Added timestamped logging for all database operations
- Proper error handling with rollback on failure
- Console output for debugging backend operations

## Setup Instructions

### Step 1: Update Database Schema
```bash
# Navigate to Backend directory
cd Backend

# Run the database update script
python update_database_schema.py
```

**Expected Output:**
```
=== Smoke Sense Database Schema Update ===
[DB Update] Starting database schema update...
[DB Update] Adding 'Danger' status to devices table...
[DB Update] ✓ Devices table updated
[DB Update] Adding last_reading column to devices table...
[DB Update] ✓ last_reading column added
[DB Update] ✓ All changes committed successfully
[DB Update] ✓ Devices table supports 'Danger' status
[DB Update] ✓ Alerts table has 3 records

✅ Database schema updated successfully!
✅ Alert logging test passed!
```

### Step 2: Restart Backend Server
```bash
# Stop the current backend server (Ctrl+C)
# Restart it
python app.py
```

### Step 3: Test Alert Logging

#### Test 1: Trigger Alert and Check Backend Logs
1. **Start backend server** and watch console output
2. **Trigger alert** in device.html
3. **Expected backend console output:**
   ```
   [2024-04-22 10:30:45] [API] Updating device 1: status=Danger, smoke_level=950
   [2024-04-22 10:30:45] [API] ✓ Device 1 updated in database
   [2024-04-22 10:30:45] [API] Logging alert for device 1 with status Danger
   [2024-04-22 10:30:45] [API] ✓ Alert logged: device_id=1, room_id=1, status=Smoke Detected, aqi=950
   [2024-04-22 10:30:45] [API] ✓ All changes committed for device 1
   ```

#### Test 2: Check Database Directly
```sql
-- Check if alerts are being logged
SELECT * FROM alerts ORDER BY timestamp DESC LIMIT 5;

-- Should show recent alerts like:
-- | id | device_id | room_id | status        | aqi_value | timestamp           |
-- | 1  | 1         | 1       | Smoke Detected| 950       | 2024-04-22 10:30:45 |
```

#### Test 3: Verify Device Status Updates
```sql
-- Check device status updates
SELECT id, device_name, status, last_reading, aqi_level FROM devices;

-- Should show:
-- | id | device_name | status | last_reading | aqi_level |
-- | 1  | MQ-135A-Z01 | Danger | 950          | 950       |
```

## Testing the Complete System

### Test 1: Fresh Alert Trigger
1. **Ensure all devices are "Online"** status
2. **Trigger alert** in device.html
3. **Check backend console** for logging messages
4. **Check database** for new alert records
5. **Verify siren starts** in alerts page

### Test 2: Continuous Alert Logging
1. **Trigger alert** (device sends Danger every 3 seconds)
2. **Watch backend console** - should see updates every 3 seconds:
   ```
   [10:30:45] [API] Updating device 1: status=Danger, smoke_level=950
   [10:30:48] [API] Updating device 1: status=Danger, smoke_level=950
   [10:30:51] [API] Updating device 1: status=Danger, smoke_level=950
   ```
3. **Check database** - should have multiple alert records

### Test 3: Alert Stop and Cleanup
1. **Stop alert** in device.html
2. **Check backend console**:
   ```
   [10:31:00] [API] Updating device 1: status=Online, smoke_level=0
   [10:31:00] [API] Status Online - no alert logging needed
   ```
3. **Verify siren stops** in alerts page

## Troubleshooting

### Issue: Database update script fails

**Check:**
1. **Database connection** - Is MySQL running?
2. **Database credentials** - Check `Backend/API/database.py`
3. **Database exists** - Does `smoke_detector_db` exist?

**Fix:**
```bash
# Check MySQL connection
mysql -u your_username -p
USE smoke_detector_db;
SHOW TABLES;
```

### Issue: Backend not logging alerts

**Check backend console for:**
1. `[API] Updating device X: status=Danger` - API calls being received?
2. `[API] ❌ Database connection failed` - Database connection issues?
3. `[API] ❌ Error updating device X` - SQL errors?

**Common fixes:**
- Restart backend server
- Check database schema was updated
- Verify device exists in database

### Issue: Alerts table still empty

**Check:**
1. **Backend logs** - Are alerts being logged in console?
2. **Database schema** - Run `DESCRIBE alerts;` to check structure
3. **Device assignment** - Are devices properly assigned to rooms?

**Manual test:**
```sql
-- Manually insert test alert
INSERT INTO alerts (device_id, room_id, status, aqi_value, timestamp) 
VALUES (1, 1, 'Test Alert', 500, NOW());

-- Check if it appears
SELECT * FROM alerts;
```

## Expected Results

### ✅ Working System
- **Backend logs** show alert logging for every Danger status update
- **Database alerts table** has records for each alert trigger
- **Siren system** works reliably with proper alert state tracking
- **Device status** updates correctly in database

### ✅ Backend Console Output
```
[10:30:45] [API] Updating device 1: status=Danger, smoke_level=950
[10:30:45] [API] ✓ Device 1 updated in database
[10:30:45] [API] Logging alert for device 1 with status Danger
[10:30:45] [API] ✓ Alert logged: device_id=1, room_id=1, status=Smoke Detected, aqi=950
[10:30:45] [API] ✓ All changes committed for device 1
```

### ✅ Database State
```sql
-- Devices table
SELECT * FROM devices WHERE id = 1;
-- Shows: status='Danger', last_reading=950, aqi_level=950

-- Alerts table  
SELECT * FROM alerts ORDER BY timestamp DESC LIMIT 3;
-- Shows: Multiple 'Smoke Detected' records with timestamps
```

## Why This Helps the Siren Issue

### Better State Tracking
- **Database persistence** - Alert state is now properly logged
- **Backend validation** - Can verify if alerts are actually being processed
- **Debugging capability** - Console logs show exactly what's happening

### Improved Reliability
- **Proper schema** - Database supports all status types the system uses
- **Error handling** - Backend catches and logs database errors
- **Consistent data** - Device status and alerts are properly synchronized

### Enhanced Monitoring
- **Alert history** - Can see all past alerts in database
- **System health** - Backend logs show if system is working properly
- **Troubleshooting** - Easy to identify where issues occur

**Run the database update script and restart the backend to implement these fixes!**