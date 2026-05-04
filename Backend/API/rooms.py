from flask import Blueprint, request, jsonify
from .database import get_db_connection

rooms_bp = Blueprint('rooms', __name__)

@rooms_bp.route('/rooms', methods=['GET', 'POST'])
def handle_rooms():
    conn = get_db_connection()
    if not conn:
        return jsonify({"status": "error", "message": "Database connection failed"}), 500
        
    cursor = conn.cursor(dictionary=True)
    
    if request.method == 'GET':
        cursor.execute("SELECT * FROM rooms")
        rooms = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify(rooms), 200
        
    elif request.method == 'POST':
        data = request.json
        # Room Owner Registration / Room Creation
        query = """
            INSERT INTO rooms (room_name, room_number, floor, room_owner, capacity, description)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        cursor.execute(query, (
            data.get('room_name'), 
            data.get('room_number'), 
            data.get('floor'), 
            data.get('room_owner'),
            data.get('capacity', 0),
            data.get('description', '')
        ))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"status": "success", "message": "Room registered successfully"}), 201

@rooms_bp.route('/rooms/<int:room_id>', methods=['PATCH'])
def update_room(room_id):
    data = request.json
    conn = get_db_connection()
    if not conn:
        return jsonify({"status": "error", "message": "Database connection failed"}), 500
        
    cursor = conn.cursor()
    # Update owner or other details
    update_fields = []
    params = []
    for key, value in data.items():
        update_fields.append(f"{key} = %s")
        params.append(value)
    
    params.append(room_id)
    query = f"UPDATE rooms SET {', '.join(update_fields)} WHERE id = %s"
    
    cursor.execute(query, params)
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"status": "success", "message": "Room updated successfully"}), 200
