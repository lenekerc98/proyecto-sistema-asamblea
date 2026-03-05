import axios from 'axios';
import { authService } from './auth.service';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const getAuthHeaders = () => {
    const user = authService.getCurrentUser();
    if (user && user.access_token) {
        return { headers: { Authorization: `Bearer ${user.access_token}` } };
    }
    return {};
};

export interface EmailPlantilla {
    id: number;
    nombre: string;
    asunto: string;
    cuerpo: string;
    asignacion: string;
}

export interface PlantillaReporte {
    id: number;
    slug: string;
    nombre: string;
    contenido_html: string;
    estilos_css?: string;
    pie_pagina?: string;
}

export const plantillasService = {
    listar: async () => {
        const res = await axios.get<EmailPlantilla[]>(`${API_URL}/plantillas/`, getAuthHeaders());
        return res.data;
    },
    crear: async (datos: Partial<EmailPlantilla>) => {
        const res = await axios.post<EmailPlantilla>(`${API_URL}/plantillas/`, datos, getAuthHeaders());
        return res.data;
    },
    actualizar: async (id: number, datos: Partial<EmailPlantilla>) => {
        const res = await axios.put<EmailPlantilla>(`${API_URL}/plantillas/${id}`, datos, getAuthHeaders());
        return res.data;
    },
    eliminar: async (id: number) => {
        await axios.delete(`${API_URL}/plantillas/${id}`, getAuthHeaders());
    },
    // REPORTES PDF
    listarReportes: async () => {
        const res = await axios.get<PlantillaReporte[]>(`${API_URL}/plantillas/reportes`, getAuthHeaders());
        return res.data;
    },
    actualizarReporte: async (id: number, datos: Partial<PlantillaReporte>) => {
        const res = await axios.put<PlantillaReporte>(`${API_URL}/plantillas/reportes/${id}`, datos, getAuthHeaders());
        return res.data;
    }
};
