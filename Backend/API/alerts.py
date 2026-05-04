from flask import Blueprint, jsonify
from .database import get_db_connection

alerts_bp = Blueprint('alerts', __name__)

@alerts_bp.route('/alerts', methods=['GET'])
def get_alerts():
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor(dictionary=True)
        query = """
            SELECT a.*, r.room_name, d.device_name 
            FROM alerts a
            JOIN rooms r ON a.room_id = r.id
            JOIN devices d ON a.device_id = d.id
            ORDER BY a.timestamp DESC
        """
        cursor.execute(query)
        alerts = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify(alerts), 200
    return jsonify({"status": "error", "message": "Database connection failed"}), 500
