import axios from 'axios';
import { authService } from './auth.service';

const API_URL = import.meta.env.VITE_API_URL + '/database';

const getAuthHeaders = () => {
    const user = authService.getCurrentUser();
    return {
        Authorization: `Bearer ${user?.access_token}`,
        'Content-Type': 'application/json'
    };
};

export const databaseService = {
    async getMetrics() {
        const response = await axios.get(`${API_URL}/metrics`, { headers: getAuthHeaders() });
        return response.data;
    },

    async cleanLogs() {
        const response = await axios.delete(`${API_URL}/clean/logs`, { headers: getAuthHeaders() });
        return response.data;
    },

    async cleanVotaciones() {
        const response = await axios.delete(`${API_URL}/clean/votaciones`, { headers: getAuthHeaders() });
        return response.data;
    },

    async cleanAsistencias() {
        const response = await axios.delete(`${API_URL}/clean/asistencias`, { headers: getAuthHeaders() });
        return response.data;
    }
};
