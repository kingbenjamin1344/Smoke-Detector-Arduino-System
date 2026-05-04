import mysql.connector
from mysql.connector import Error

db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'smoke_detector'
}

def provision_simulation_devices():
    devices = [
        ("Node-Alpha", "TBD", "TBD", "Unassigned"),
        ("Node-Beta", "TBD", "TBD", "Unassigned"),
        ("Node-Gamma", "TBD", "TBD", "Unassigned"),
        ("Node-Delta", "TBD", "TBD", "Unassigned"),
        ("Node-Epsilon", "TBD", "TBD", "Unassigned"),
        ("Node-Zeta", "TBD", "TBD", "Unassigned")
    ]

    try:
        conn = mysql.connector.connect(**db_config)
        if conn.is_connected():
            cursor = conn.cursor()
            
            # 1. Get a valid room ID to satisfy foreign key constraint
            cursor.execute("SELECT id FROM rooms LIMIT 1")
            room = cursor.fetchone()
            
            if not room:
                # If no rooms exist, create a temporary one for simulation
                print("No rooms found. Creating a 'Simulation Lab' room...")
                cursor.execute("INSERT INTO rooms (room_name, floor) VALUES ('Simulation Lab', 'B1')")
                conn.commit()
                room_id = cursor.lastrowid
            else:
                room_id = room[0]
            
            print(f"Using Room ID: {room_id} as temporary placeholder.")

            # 2. Insert the 6 devices
            query = """
                INSERT INTO devices (device_name, room_id, floor, room_owner, status, assignment_status)
                VALUES (%s, %s, %s, %s, 'Online', 'Pending')
            """
            
            data_to_insert = [(d[0], room_id, d[1], d[3]) for d in devices]
            
            cursor.executemany(query, data_to_insert)
            conn.commit()
            
            print(f"Successfully provisioned {cursor.rowcount} virtual devices!")
            print("The devices are currently attached to the first available room.")
            print("You can now re-assign them to their correct rooms via the dashboard.")
            
            cursor.close()
            conn.close()
            
    except Error as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    provision_simulation_devices()
