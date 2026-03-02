import axios from 'axios';
import { authHeader } from './auth.service';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export interface LogEntry {
    id: number;
    fecha: string;
    nivel: string;
    origen: string;
    accion: string;
    mensaje: string;
    usuario_id?: number;
    usuario_email?: string; // Si el backend lo devuelve, si no, lo manejamos por ID
}

export const logsService = {
    async obtenerLogs(params: { nivel?: string; origen?: string; limit?: number; skip?: number } = {}): Promise<LogEntry[]> {
        const response = await axios.get(`${API_URL}/logs/`, {
            params,
            headers: authHeader()
        });
        return response.data;
    },

    async obtenerDashboardStats(): Promise<any> {
        const response = await axios.get(`${API_URL}/logs/dashboard-stats`, {
            headers: authHeader()
        });
        return response.data;
    },

    async eliminarLog(_id: number): Promise<void> {
        // Nota: Según logs.py del backend, no hay endpoint DELETE individual para logs genéricos, 
        // pero sí hay para asistencia. Si se requiere borrar logs, habría que implementarlo en el backend.
        console.warn('Endpoint para eliminar log individual no implementado en backend.');
    }
};
