#!/usr/bin/env python3
"""
System State Checker
Checks database and system state to identify why siren might be playing
"""

from API.database import get_db_connection
from datetime import datetime, timedelta

def check_system_state():
    """Check current system state"""
    
    print("=== Smoke Sense System State Check ===")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    conn = get_db_connection()
    if not conn:
        print("❌ Failed to connect to database")
        return False
    
    cursor = conn.cursor()
    
    try:
        print("\n📊 DATABASE STATE:")
        
        # Check devices status
        print("\n🔧 DEVICES STATUS:")
        cursor.execute("SELECT id, device_name, status, last_reading, aqi_level, room_id FROM devices")
        devices = cursor.fetchall()
        
        danger_count = 0
        warning_count = 0
        online_count = 0
        
        for device in devices:
            device_id, name, status, reading, aqi, room_id = device
            print(f"  Device {device_id}: {name}")
            print(f"    Status: {status}")
            print(f"    Last Reading: {reading}")
            print(f"    AQI Level: {aqi}")
            print(f"    Room ID: {room_id}")
            print()
            
            if status == 'Danger':
                danger_count += 1
            elif status == 'Warning':
                warning_count += 1
            elif status == 'Online':
                online_count += 1
        
        print(f"📈 SUMMARY:")
        print(f"  🔴 Danger: {danger_count} devices")
        print(f"  🟡 Warning: {warning_count} devices") 
        print(f"  🟢 Online: {online_count} devices")
        
        # Check recent alerts
        print(f"\n🚨 RECENT ALERTS (Last 1 hour):")
        cursor.execute("""
            SELECT device_id, status, aqi_value, timestamp 
            FROM alerts 
            WHERE timestamp > NOW() - INTERVAL 1 HOUR 
            ORDER BY timestamp DESC 
            LIMIT 10
        """)
        recent_alerts = cursor.fetchall()
        
        if recent_alerts:
            for alert in recent_alerts:
                device_id, status, aqi, timestamp = alert
                print(f"  {timestamp}: Device {device_id} - {status} (AQI: {aqi})")
        else:
            print("  No recent alerts found")
        
        # Check very recent alerts (last 5 minutes)
        print(f"\n⚡ VERY RECENT ALERTS (Last 5 minutes):")
        cursor.execute("""
            SELECT device_id, status, aqi_value, timestamp 
            FROM alerts 
            WHERE timestamp > NOW() - INTERVAL 5 MINUTE 
            ORDER BY timestamp DESC
        """)
        very_recent = cursor.fetchall()
        
        if very_recent:
            print(f"  Found {len(very_recent)} alerts in last 5 minutes!")
            for alert in very_recent:
                device_id, status, aqi, timestamp = alert
                print(f"    {timestamp}: Device {device_id} - {status}")
        else:
            print("  No alerts in last 5 minutes")
        
        print(f"\n🎯 DIAGNOSIS:")
        
        if danger_count > 0:
            print(f"  🔴 FOUND {danger_count} DEVICE(S) IN DANGER STATUS!")
            print(f"     This is why the siren is playing.")
            print(f"     To fix: Reset device status to 'Online'")
        elif warning_count > 0:
            print(f"  🟡 Found {warning_count} device(s) in Warning status")
            print(f"     This might trigger alerts depending on configuration")
        else:
            print(f"  🟢 All devices are Online - no active alerts")
            if very_recent:
                print(f"     But found recent alerts - check localStorage/WebSocket state")
        
        print(f"\n🔧 RECOMMENDED ACTIONS:")
        
        if danger_count > 0:
            print(f"  1. Reset device status:")
            print(f"     UPDATE devices SET status = 'Online', last_reading = 0, aqi_level = 0;")
            print(f"  2. Clear browser localStorage")
            print(f"  3. Refresh alerts page")
        elif very_recent:
            print(f"  1. Clear browser localStorage")
            print(f"  2. Check if device simulator is still running")
            print(f"  3. Restart backend server")
        else:
            print(f"  1. Check browser localStorage for old alert state")
            print(f"  2. Check if multiple device.html tabs are open")
        
        return True
        
    except Exception as e:
        print(f"❌ Error checking system state: {e}")
        return False
    finally:
        cursor.close()
        conn.close()

def reset_system_state():
    """Reset all devices to Online status"""
    
    print("\n🔄 RESETTING SYSTEM STATE...")
    
    conn = get_db_connection()
    if not conn:
        print("❌ Failed to connect to database")
        return False
    
    cursor = conn.cursor()
    
    try:
        # Reset all devices to Online
        cursor.execute("""
            UPDATE devices 
            SET status = 'Online', last_reading = 0, aqi_level = 0
        """)
        
        affected_rows = cursor.rowcount
        print(f"✓ Reset {affected_rows} devices to Online status")
        
        # Optionally clear recent alerts (uncomment if needed)
        # cursor.execute("DELETE FROM alerts WHERE timestamp > NOW() - INTERVAL 1 HOUR")
        # print(f"✓ Cleared recent alerts")
        
        conn.commit()
        print("✓ Changes committed to database")
        
        print("\n📋 NEXT STEPS:")
        print("1. Clear browser localStorage:")
        print("   localStorage.clear(); location.reload();")
        print("2. Refresh alerts page")
        print("3. Check that siren stops")
        
        return True
        
    except Exception as e:
        print(f"❌ Error resetting system state: {e}")
        conn.rollback()
        return False
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    # Check current state
    if check_system_state():
        
        # Ask if user wants to reset
        print(f"\n" + "="*50)
        response = input("Do you want to reset all devices to Online status? (y/N): ").strip().lower()
        
        if response in ['y', 'yes']:
            reset_system_state()
        else:
            print("System state not changed.")
    
    print(f"\n=== Check Complete ===")