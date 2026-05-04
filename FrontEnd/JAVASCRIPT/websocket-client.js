const socket = new WebSocket('ws://localhost:8080');

socket.onopen = function(e) {
  console.log("[open] Connection established");
};

socket.onmessage = function(event) {
  const data = JSON.parse(event.data);
  console.log(`[message] Data received from server:`, data);

  // Handle different message types
  if (data.type === 'alert') {
    handleRealtimeAlert(data);
  }
};

socket.onclose = function(event) {
  if (event.wasClean) {
    console.log(`[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`);
  } else {
    console.error('[close] Connection died');
  }
};

socket.onerror = function(error) {
  console.error(`[error]`, error);
};

function handleRealtimeAlert(alertData) {
  // Logic to update the UI in real-time
  console.log("Real-time alert received:", alertData);
  
  // Example: Show a notification or update the dashboard count
  if (typeof updateDashboardStats === 'function') {
    updateDashboardStats();
  }
}
