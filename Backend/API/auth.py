from flask import Blueprint, request, jsonify
from .database import get_db_connection

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor(dictionary=True)
        query = "SELECT * FROM users WHERE username = %s AND password = %s"
        cursor.execute(query, (username, password))
        user = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if user:
            return jsonify({"status": "success", "user": user}), 200
        else:
            return jsonify({"status": "error", "message": "Invalid credentials"}), 401
    return jsonify({"status": "error", "message": "Database connection failed"}), 500
