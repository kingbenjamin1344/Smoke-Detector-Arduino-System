const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

// 🔥 State Storage: Keeps track of the latest message from each device
const lastDeviceStates = {};

console.log('Smoke Sense WebSocket Server started on ws://localhost:8080');

wss.on('connection', function connection(ws) {
  console.log('New client connected');

  // Immediately send the last known state of all devices to the new client
  // This eliminates the 5-second wait when switching pages
  Object.values(lastDeviceStates).forEach(state => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(state));
    }
  });

  ws.on('message', function message(rawData) {
    try {
        const dataStr = rawData.toString();
        console.log('Received message:', dataStr);
        const data = JSON.parse(dataStr);
        
        // If it's a device update, save it to our state memory
        if (data.type === 'alert' || data.type === 'DEVICE_UPDATE') {
            lastDeviceStates[data.device_id] = data;
        }

        // Broadcast to all OTHER clients
        wss.clients.forEach(function each(client) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(dataStr);
            }
        });
    } catch (e) {
        // Fallback for non-JSON or malformed messages
        console.log('Broadcasting raw message');
        wss.clients.forEach(function each(client) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(rawData.toString());
            }
        });
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });

  // Send a welcome message
  ws.send(JSON.stringify({
    type: 'info',
    message: 'Connected to Smoke Sense WebSocket Server'
  }));
});
