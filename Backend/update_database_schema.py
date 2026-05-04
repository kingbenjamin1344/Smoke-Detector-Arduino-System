#!/usr/bin/env python3
"""
Database Schema Update Script
Adds support for 'Danger' status and ensures proper alert logging
"""

import mysql.connector
from API.database import get_db_connection

def update_database_schema():
    """Update the database schema to support Danger status and fix alerts table"""
    
    print("[DB Update] Starting database schema update...")
    
    conn = get_db_connection()
    if not conn:
        print("[DB Update] ❌ Failed to connect to database")
        return False
    
    cursor = conn.cursor()
    
    try:
        # 1. Update devices table to support 'Danger' status
        print("[DB Update] Adding 'Danger' status to devices table...")
        alter_devices_query = """
            ALTER TABLE devices 
            MODIFY COLUMN status ENUM('Online', 'Warning', 'Danger', 'Offline') DEFAULT 'Online'
        """
        cursor.execute(alter_devices_query)
        print("[DB Update] ✓ Devices table updated")
        
        # 2. Add last_reading column if it doesn't exist
        print("[DB Update] Adding last_reading column to devices table...")
        try:
            add_last_reading_query = """
                ALTER TABLE devices 
                ADD COLUMN last_reading INT DEFAULT 0 AFTER aqi_level
            """
            cursor.execute(add_last_reading_query)
            print("[DB Update] ✓ last_reading column added")
        except mysql.connector.Error as e:
            if "Duplicate column name" in str(e):
                print("[DB Update] ✓ last_reading column already exists")
            else:
                raise e
        
        # 3. Check and update alerts table structure
        print("[DB Update] Checking alerts table structure...")
        cursor.execute("DESCRIBE alerts")
        columns = {row[0]: row[1] for row in cursor.fetchall()}
        
        # Add missing columns if needed
        if 'type' in columns and 'description' in columns:
            print("[DB Update] Old alerts table structure detected - updating...")
            # Drop old columns and add new ones
            cursor.execute("ALTER TABLE alerts DROP COLUMN IF EXISTS type")
            cursor.execute("ALTER TABLE alerts DROP COLUMN IF EXISTS description")
            
        # Ensure correct columns exist
        if 'aqi_value' not in columns:
            cursor.execute("ALTER TABLE alerts ADD COLUMN aqi_value INT DEFAULT 0")
            print("[DB Update] ✓ aqi_value column added to alerts")
            
        # 4. Create some test alerts to verify the system works
        print("[DB Update] Creating test alerts...")
        
        # Clear old test alerts first
        cursor.execute("DELETE FROM alerts WHERE status IN ('Test Alert', 'Smoke Detected', 'Warning State', 'Good Condition')")
        
        # Get actual device IDs from the database
        cursor.execute("SELECT id, room_id FROM devices LIMIT 3")
        existing_devices = cursor.fetchall()
        
        if existing_devices:
            print(f"[DB Update] Found {len(existing_devices)} existing devices")
            
            # Insert test alerts using actual device IDs
            for i, (device_id, room_id) in enumerate(existing_devices):
                if i == 0:
                    status, aqi = 'Good Condition', 25
                elif i == 1:
                    status, aqi = 'Warning State', 450
                else:
                    status, aqi = 'Smoke Detected', 850
                
                cursor.execute("""
                    INSERT INTO alerts (device_id, room_id, status, aqi_value, timestamp) 
                    VALUES (%s, %s, %s, %s, NOW())
                """, (device_id, room_id, status, aqi))
                
                print(f"[DB Update] ✓ Test alert created: Device {device_id}, Status '{status}'")
        else:
            print("[DB Update] ⚠️ No existing devices found - skipping test alerts creation")
            print("[DB Update] You may need to create devices first through the frontend")
        
        # 5. Commit all changes
        conn.commit()
        print("[DB Update] ✓ All changes committed successfully")
        
        # 6. Verify the changes
        print("[DB Update] Verifying changes...")
        
        # Check devices table
        cursor.execute("SHOW COLUMNS FROM devices LIKE 'status'")
        status_column = cursor.fetchone()
        if status_column and 'Danger' in status_column[1]:
            print("[DB Update] ✓ Devices table supports 'Danger' status")
        else:
            print("[DB Update] ❌ Devices table status column not updated properly")
        
        # Check alerts table
        cursor.execute("SELECT COUNT(*) FROM alerts")
        alert_count = cursor.fetchone()[0]
        print(f"[DB Update] ✓ Alerts table has {alert_count} records")
        
        return True
        
    except mysql.connector.Error as e:
        print(f"[DB Update] ❌ Database error: {e}")
        conn.rollback()
        return False
    except Exception as e:
        print(f"[DB Update] ❌ Unexpected error: {e}")
        conn.rollback()
        return False
    finally:
        cursor.close()
        conn.close()

def test_alert_logging():
    """Test that alert logging works properly"""
    
    print("\n[Test] Testing alert logging...")
    
    conn = get_db_connection()
    if not conn:
        print("[Test] ❌ Failed to connect to database")
        return False
    
    cursor = conn.cursor()
    
    try:
        # Get a test device
        cursor.execute("SELECT id, room_id FROM devices WHERE room_id IS NOT NULL LIMIT 1")
        device = cursor.fetchone()
        
        if not device:
            print("[Test] ⚠️ No devices with room_id found - creating a test device")
            
            # Create a test device if none exist
            cursor.execute("""
                INSERT INTO devices (device_name, room_id, floor, room_owner, status, aqi_level, last_reading)
                VALUES ('Test-Device-001', 1, 'Ground', 'Test User', 'Online', 0, 0)
            """)
            
            # Get the newly created device
            cursor.execute("SELECT id, room_id FROM devices WHERE device_name = 'Test-Device-001'")
            device = cursor.fetchone()
            
            if not device:
                print("[Test] ❌ Failed to create test device")
                return False
            
            print(f"[Test] ✓ Created test device: ID={device[0]}")
        
        device_id, room_id = device
        print(f"[Test] Using device ID={device_id}, room_id={room_id}")
        
        # Test updating device status to Danger
        cursor.execute("""
            UPDATE devices 
            SET status = 'Danger', last_reading = 950, aqi_level = 950 
            WHERE id = %s
        """, (device_id,))
        
        print(f"[Test] ✓ Updated device {device_id} to Danger status")
        
        # Test logging an alert
        cursor.execute("""
            INSERT INTO alerts (device_id, room_id, status, aqi_value, timestamp) 
            VALUES (%s, %s, 'Smoke Detected', 950, NOW())
        """, (device_id, room_id))
        
        print(f"[Test] ✓ Inserted test alert for device {device_id}")
        
        conn.commit()
        
        # Verify the alert was logged
        cursor.execute("""
            SELECT * FROM alerts 
            WHERE device_id = %s AND status = 'Smoke Detected' 
            ORDER BY timestamp DESC LIMIT 1
        """, (device_id,))
        
        alert = cursor.fetchone()
        if alert:
            print(f"[Test] ✓ Alert logged successfully: ID={alert[0]}, Device={alert[1]}, Status='{alert[3]}', AQI={alert[4]}")
            return True
        else:
            print("[Test] ❌ Alert was not logged")
            return False
            
    except Exception as e:
        print(f"[Test] ❌ Test failed: {e}")
        conn.rollback()
        return False
    finally:
        cursor.close()
        conn.close()

def check_database_state():
    """Check and display current database state"""
    
    print("\n[Check] Checking current database state...")
    
    conn = get_db_connection()
    if not conn:
        print("[Check] ❌ Failed to connect to database")
        return False
    
    cursor = conn.cursor()
    
    try:
        # Check devices table
        cursor.execute("SELECT COUNT(*) FROM devices")
        device_count = cursor.fetchone()[0]
        print(f"[Check] Devices table: {device_count} records")
        
        if device_count > 0:
            cursor.execute("SELECT id, device_name, status, room_id FROM devices LIMIT 3")
            devices = cursor.fetchall()
            for device in devices:
                print(f"[Check]   Device {device[0]}: {device[1]} | Status: {device[2]} | Room: {device[3]}")
        
        # Check rooms table
        cursor.execute("SELECT COUNT(*) FROM rooms")
        room_count = cursor.fetchone()[0]
        print(f"[Check] Rooms table: {room_count} records")
        
        # Check alerts table
        cursor.execute("SELECT COUNT(*) FROM alerts")
        alert_count = cursor.fetchone()[0]
        print(f"[Check] Alerts table: {alert_count} records")
        
        if alert_count > 0:
            cursor.execute("SELECT device_id, status, aqi_value, timestamp FROM alerts ORDER BY timestamp DESC LIMIT 3")
            alerts = cursor.fetchall()
            for alert in alerts:
                print(f"[Check]   Alert: Device {alert[0]} | {alert[1]} | AQI: {alert[2]} | {alert[3]}")
        
        return True
        
    except Exception as e:
        print(f"[Check] ❌ Error checking database: {e}")
        return False
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    print("=== Smoke Sense Database Schema Update ===")
    
    # Check current state first
    check_database_state()
    
    # Update schema
    if update_database_schema():
        print("\n✅ Database schema updated successfully!")
        
        # Check state after update
        check_database_state()
        
        # Test alert logging
        if test_alert_logging():
            print("✅ Alert logging test passed!")
        else:
            print("❌ Alert logging test failed!")
    else:
        print("\n❌ Database schema update failed!")
    
    print("\n=== Update Complete ===")