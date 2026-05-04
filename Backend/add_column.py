import mysql.connector
from mysql.connector import Error

db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'smoke_detector'
}

def add_column():
    try:
        conn = mysql.connector.connect(**db_config)
        if conn.is_connected():
            cursor = conn.cursor()
            # Adding assignment_status column
            query = "ALTER TABLE devices ADD COLUMN assignment_status ENUM('Pending', 'Assigned') DEFAULT 'Pending' AFTER status"
            cursor.execute(query)
            conn.commit()
            print("Column 'assignment_status' added successfully.")
            cursor.close()
            conn.close()
    except Error as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    add_column()
