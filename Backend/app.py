from flask import Flask
from flask_cors import CORS
from API.auth import auth_bp
from API.dashboard import dashboard_bp
from API.alerts import alerts_bp
from API.devices import devices_bp
from API.rooms import rooms_bp

app = Flask(__name__)
CORS(app)

# Register Blueprints
app.register_blueprint(auth_bp, url_prefix='/api')
app.register_blueprint(dashboard_bp, url_prefix='/api')
app.register_blueprint(alerts_bp, url_prefix='/api')
app.register_blueprint(devices_bp, url_prefix='/api')
app.register_blueprint(rooms_bp, url_prefix='/api')

if __name__ == '__main__':
    print("Smoke Sense Backend Server starting...")
    app.run(debug=True, host='0.0.0.0', port=5000)
