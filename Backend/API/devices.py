from flask import Blueprint, request, jsonify
from .database import get_db_connection
import sys
from datetime import datetime

devices_bp = Blueprint('devices', __name__)

def log_message(message):
    """Helper function to log messages with timestamp"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {message}")
    sys.stdout.flush()

@devices_bp.route('/devices', methods=['GET', 'POST'])
def handle_devices():
    conn = get_db_connection()
    if not conn:
        return jsonify({"status": "error", "message": "Database connection failed"}), 500
        
    cursor = conn.cursor(dictionary=True)
    
    if request.method == 'GET':
        cursor.execute("SELECT * FROM devices")
        devices = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify(devices), 200
        
    elif request.method == 'POST':
        data = request.json
        query = """
            INSERT INTO devices (device_name, room_id, floor, room_owner, status)
            VALUES (%s, %s, %s, %s, 'Online')
        """
        cursor.execute(query, (data['device_name'], data['room_id'], data['floor'], data['room_owner']))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"status": "success", "message": "Device registered successfully"}), 201

@devices_bp.route('/devices/<int:device_id>/status', methods=['PATCH', 'POST'])
def update_device_status(device_id):
    data = request.json
    status = data.get('status')
    smoke_level = data.get('smoke_level', 0)
    
    log_message(f"[API] Updating device {device_id}: status={status}, smoke_level={smoke_level}")
    
    conn = get_db_connection()
    if not conn:
        log_message("[API] ❌ Database connection failed")
        return jsonify({"status": "error", "message": "Database connection failed"}), 500
        
    cursor = conn.cursor()
    
    try:
        # 1. Check if device exists
        check_query = "SELECT id FROM devices WHERE id = %s"
        cursor.execute(check_query, (device_id,))
        result = cursor.fetchone()
        
        if result is None:
            log_message(f"[API] 🆕 Auto-registering new sensor with ID {device_id}")
            # Try a simple insert first to be safe, as assignment_status might not exist yet
            try:
                insert_query = "INSERT INTO devices (id, device_name, status) VALUES (%s, %s, 'Online')"
                cursor.execute(insert_query, (device_id, f"New Sensor ({device_id})"))
            except Exception as e:
                log_message(f"[API] Simple insert failed, trying with assignment_status: {e}")
                insert_query = "INSERT INTO devices (id, device_name, status, assignment_status) VALUES (%s, %s, 'Online', 'Pending')"
                cursor.execute(insert_query, (device_id, f"New Sensor ({device_id})"))
            conn.commit()

        # 2. Update device status and last_reading
        # We use a try-except here because 'aqi_level' or 'last_reading' might be missing in some schemas
        try:
            query = "UPDATE devices SET status = %s, last_reading = %s, aqi_level = %s WHERE id = %s"
            cursor.execute(query, (status, smoke_level, smoke_level, device_id))
        except Exception as e:
            log_message(f"[API] Standard update failed, trying fallback: {e}")
            query = "UPDATE devices SET status = %s WHERE id = %s"
            cursor.execute(query, (status, device_id))
        
        log_message(f"[API] ✓ Device {device_id} updated in database")
        
        # 3. Log reading to alerts table for historical tracking ONLY IF ASSIGNED
        try:
            # Check if device is assigned before logging history
            cursor.execute("SELECT assignment_status, room_id FROM devices WHERE id = %s", (device_id,))
            device_info = cursor.fetchone()
            
            assignment_status = device_info[0] if device_info and device_info[0] else 'Pending'
            room_id = device_info[1] if device_info and device_info[1] else None

            if assignment_status == 'Assigned' and room_id:
                # 🚨 ONLY log to history if it's a DANGER level
                if status == 'Danger':
                    log_message(f"[API] 🚨 DANGER DETECTED: Logging history for assigned device {device_id}")
                    
                    alert_query = """
                        INSERT INTO alerts (device_id, room_id, status, aqi_value, timestamp) 
                        VALUES (%s, %s, %s, %s, NOW())
                    """
                    cursor.execute(alert_query, (device_id, room_id, 'Smoke Detected', smoke_level))
                    log_message(f"[API] ✓ Critical event logged for device {device_id}")
                else:
                    log_message(f"[API] ℹ️ Normal operation update for {device_id} (Skipping history log)")
            else:
                log_message(f"[API] ⏭️ Skipping history log: Device {device_id} is unassigned")
                
        except Exception as e:
            log_message(f"[API] ❌ Failed to log history: {e}")
            
        conn.commit()
        log_message(f"[API] ✓ All changes committed for device {device_id}")
        
    except Exception as e:
        log_message(f"[API] ❌ Error updating device {device_id}: {e}")
        conn.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()
    
    return jsonify({"status": "success", "message": "Device status updated"}), 200

@devices_bp.route('/devices/<int:device_id>/assign', methods=['PATCH'])
def update_device_assignment(device_id):
    data = request.json
    room_id = data.get('room_id')
    floor = data.get('floor')
    room_owner = data.get('room_owner')
    assignment_status = data.get('assignment_status', 'Assigned')
    
    conn = get_db_connection()
    if not conn:
        return jsonify({"status": "error", "message": "Database connection failed"}), 500
        
    cursor = conn.cursor()
    query = """
        UPDATE devices 
        SET room_id = %s, floor = %s, room_owner = %s, assignment_status = %s 
        WHERE id = %s
    """
    cursor.execute(query, (room_id, floor, room_owner, assignment_status, device_id))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"status": "success", "message": "Device assigned successfully"}), 200
