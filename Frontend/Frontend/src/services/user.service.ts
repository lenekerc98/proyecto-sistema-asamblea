import axios from 'axios';
import { authService } from './auth.service';

const API_URL = import.meta.env.VITE_API_URL;

const getAuthHeaders = () => {
    const user = authService.getCurrentUser();
    if (user && user.access_token) {
        return { Authorization: `Bearer ${user.access_token}` };
    }
    return {};
};

export const userService = {
    /**
     * Obtiene la lista completa de usuarios
     */
    async getUsers() {
        const response = await axios.get(`${API_URL}/listar_usuarios/`, { headers: getAuthHeaders() });
        return response.data;
    },

    /**
     * Actualizar datos de Mi Perfil
     */
    async updateMyProfile(userData: any) {
        const response = await axios.put(`${API_URL}/mi-perfil`, userData, { headers: getAuthHeaders() });
        return response.data;
    },

    /**
     * Obtiene un usuario por ID
     */
    async getUserById(id: number) {
        const response = await axios.get(`${API_URL}/usuarios/${id}`, { headers: getAuthHeaders() });
        return response.data;
    },

    /**
     * Actualiza un usuario existente
     */
    async updateUser(id: number, userData: any) {
        const response = await axios.put(`${API_URL}/usuarios/${id}`, userData, { headers: getAuthHeaders() });
        return response.data;
    },

    /**
     * Elimina un usuario por ID
     */
    async deleteUser(id: number) {
        const response = await axios.delete(`${API_URL}/usuarios/${id}`, { headers: getAuthHeaders() });
        return response.data;
    },

    /**
     * Cambia el estado activo/inactivo de un usuario
     */
    async toggleUserStatus(id: number, isActive: boolean) {
        // Asumiendo que existe un endpoint de patch o put para esto
        const response = await axios.patch(`${API_URL}/usuarios/${id}/status`, { is_active: isActive }, { headers: getAuthHeaders() });
        return response.data;
    }
};
