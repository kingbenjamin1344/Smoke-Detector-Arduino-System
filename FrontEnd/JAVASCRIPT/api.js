const API_BASE_URL = 'http://127.0.0.1:5000/api';

const SmokeAPI = {
    // Authentication
    login: async (username, password) => {
        try {
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            return await response.json();
        } catch (error) {
            console.error('Login Error:', error);
            return { status: 'error', message: 'Connection failed' };
        }
    },

    // Dashboard Stats
    getStats: async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/dashboard/stats`);
            return await response.json();
        } catch (error) {
            console.error('Stats Error:', error);
            return null;
        }
    },

    // Alerts
    getAlerts: async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/alerts`);
            return await response.json();
        } catch (error) {
            console.error('Alerts Error:', error);
            return [];
        }
    },

    // Devices
    getDevices: async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/devices`);
            return await response.json();
        } catch (error) {
            console.error('Devices Error:', error);
            return [];
        }
    },

    registerDevice: async (deviceData) => {
        try {
            const response = await fetch(`${API_BASE_URL}/devices`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(deviceData)
            });
            return await response.json();
        } catch (error) {
            console.error('Register Device Error:', error);
            return { status: 'error', message: 'Connection failed' };
        }
    }
};
