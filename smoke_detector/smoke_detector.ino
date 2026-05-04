#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoWebsockets.h>
#include <ArduinoJson.h>

// ─── CONFIGURATION ──────────────────────────────────────────────────────────
const char* ssid     = "Converge_2.4GHz_hWX7";
const char* password = "hellokitty@123";

// Server Configuration
const char* serverIP = "192.168.100.135"; 
const int flaskPort  = 5000;
const int wsPort     = 8080;

// ─── MULTI-SENSOR SETUP ─────────────────────────────────────────────────────
struct Sensor {
  int id;
  int pin;
  String name;
  String currentStatus;
  int lastLevel;
  unsigned long lastUpdate; // Added for timing
};

// Define your sensors here
Sensor sensors[] = {
  {9,  33, "Main Smoke Sensor", "Online", 0, 0}, // SENSOR 1: ID 9 on Pin 33
  // {10, 32, "Extra Sensor",      "Online", 0, 0}, // SENSOR 2: Just uncomment this!
  // {11, 34, "Extra Sensor",      "Online", 0, 0}  // SENSOR 3: Add more like this
};
const int sensorCount = sizeof(sensors) / sizeof(sensors[0]);

// ─── GLOBALS ────────────────────────────────────────────────────────────────
using namespace websockets;
WebsocketsClient client;
unsigned long lastHeartbeat = 0;

void setup() {
  Serial.begin(115200);
  
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✓ WiFi Connected");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  connectWebSocket();
}

void connectWebSocket() {
  String wsUrl = "ws://" + String(serverIP) + ":" + String(wsPort);
  if (client.connect(wsUrl)) {
    Serial.println("✓ WebSocket Connected");
  } else {
    Serial.println("❌ WebSocket Connection Failed");
  }
}

void loop() {
  if (!client.available()) {
    static unsigned long lastWsRetry = 0;
    if (millis() - lastWsRetry > 5000) {
      connectWebSocket();
      lastWsRetry = millis();
    }
  } else {
    client.poll();
  }

  // Loop through all sensors
  for (int i = 0; i < sensorCount; i++) {
    processSensor(sensors[i]);
  }

  // Heartbeat for all sensors every 10 seconds
  if (millis() - lastHeartbeat > 10000) {
    for (int i = 0; i < sensorCount; i++) {
      sendHeartbeat(sensors[i].id);
    }
    lastHeartbeat = millis();
  }
  
  delay(50);
}

void processSensor(Sensor &s) {
  // 1. Read Sensor with extra samples for stability
  int total = 0;
  for (int i = 0; i < 20; i++) {
    total += analogRead(s.pin);
    delay(1);
  }
  int rawValue = total / 20;
  int rawLevel = map(rawValue, 0, 4095, 0, 1024);
  
  // 2. SMOOTHING: Simple Exponential Filter (NewValue = 0.7*Old + 0.3*Recent)
  // Use lastLevel as the "history"
  int smokeLevel = (s.lastLevel * 0.7) + (rawLevel * 0.3);
  s.lastLevel = smokeLevel; // Store the smoothed level
  
  // 3. Status Determination with STABILITY (Hysteresis)
  String newStatus = s.currentStatus;
  
  if (smokeLevel > 60) {       // Raise slightly to avoid noise
    newStatus = "Danger";
  } else if (smokeLevel > 40) {
    newStatus = "Warning";
  } else if (smokeLevel < 30) { // Must drop below 30 to reset to Online
    newStatus = "Online";
  }

  // 4. Update Limiters: ONLY update if status changed OR 5 seconds passed
  // AND never update faster than once every 2 seconds
  unsigned long timeSinceLastUpdate = millis() - s.lastUpdate;
  
  if ((newStatus != s.currentStatus || timeSinceLastUpdate > 5000) && timeSinceLastUpdate > 2000) {
    s.currentStatus = newStatus;
    s.lastUpdate = millis();
    
    Serial.printf("[%s] Smoothed Level: %d | Status: %s\n", s.name.c_str(), smokeLevel, newStatus.c_str());
    
    broadcastWS(s.id, newStatus, smokeLevel);
    updateBackend(s.id, newStatus, smokeLevel);
  }
}

void updateBackend(int id, String status, int level) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    String url = "http://" + String(serverIP) + ":" + String(flaskPort) + "/api/devices/" + String(id) + "/status";
    
    // Explicitly set a timeout
    http.setTimeout(5000); 
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Connection", "keep-alive"); // Some routers/firewalls prefer this
    
    StaticJsonDocument<200> doc;
    doc["status"] = status;
    doc["smoke_level"] = level;
    String jsonStr;
    serializeJson(doc, jsonStr);
    
    Serial.printf("[HTTP] 📡 Sending update to %s...\n", url.c_str());
    int httpResponseCode = http.POST(jsonStr);
    
    if (httpResponseCode > 0) {
      Serial.printf("[HTTP] ID %d Update Success: %d\n", id, httpResponseCode);
    } else {
      Serial.printf("[HTTP] ID %d Update FAILED (%s). Check Firewall/Network Profile.\n", id, http.errorToString(httpResponseCode).c_str());
    }
    
    http.end();
  } else {
    Serial.println("[HTTP] WiFi Disconnected");
  }
}

void broadcastWS(int id, String status, int level) {
  if (client.available()) {
    StaticJsonDocument<200> doc;
    doc["type"] = "alert";
    doc["device_id"] = String(id);
    doc["status"] = status;
    doc["smoke_level"] = level;
    
    String jsonStr;
    serializeJson(doc, jsonStr);
    client.send(jsonStr);
  }
}

void sendHeartbeat(int id) {
  if (client.available()) {
    StaticJsonDocument<200> doc;
    doc["type"] = "heartbeat";
    doc["device_id"] = String(id);
    
    String jsonStr;
    serializeJson(doc, jsonStr);
    client.send(jsonStr);
  }
}