from flask import Blueprint, jsonify
from .database import get_db_connection

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/dashboard/stats', methods=['GET'])
def get_stats():
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor(dictionary=True)
        
        # Get active devices
        cursor.execute("SELECT COUNT(*) as count FROM devices WHERE status = 'Online'")
        active_devices = cursor.fetchone()['count']
        
        # Get total rooms
        cursor.execute("SELECT COUNT(*) as count FROM rooms")
        total_rooms = cursor.fetchone()['count']
        
        # Get alert history count
        cursor.execute("SELECT COUNT(*) as count FROM alerts")
        alert_history = cursor.fetchone()['count']
        
        # Get current threats (Smoke Detected)
        cursor.execute("SELECT COUNT(*) as count FROM devices WHERE status = 'Warning'")
        threats = cursor.fetchone()['count']
        
        cursor.close()
        conn.close()
        
        return jsonify({
            "active_devices": active_devices,
            "total_rooms": total_rooms,
            "alert_history": alert_history,
            "threats": threats
        }), 200
    return jsonify({"status": "error", "message": "Database connection failed"}), 500
