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

export interface Opcion {
    id: number;
    texto: string;
}

export interface Pregunta {
    id: number;
    periodo: string;
    numero_orden: number;
    enunciado: string;
    tipo_votacion: string;
    estado: string;
    opciones: Opcion[];
}

export interface ResultadoOpcion {
    opcion: string;
    votos_count: number;
    porcentaje_total: number;
}

export interface ResultadoVotacion {
    pregunta_id: number;
    pregunta_enunciado: string;
    total_participantes: number;
    resultados: ResultadoOpcion[];
}

export interface VotoDetalle {
    accionista_id: number;
    numero_accionista: number;
    nombre_titular: string;
    opcion: string;
    porcentaje_voto: number;
    peso_relativo?: number;
}

export interface DetalleVotosRespuesta {
    pregunta_id: number;
    votos: VotoDetalle[];
}

export const votacionesService = {
    async listarPreguntas(): Promise<Pregunta[]> {
        const response = await axios.get(`${API_URL}/votaciones/preguntas/`, { headers: getAuthHeaders() });
        return response.data;
    },

    async obtenerResultados(preguntaId: number): Promise<ResultadoVotacion> {
        const response = await axios.get(`${API_URL}/votaciones/resultados/${preguntaId}`, { headers: getAuthHeaders() });
        return response.data;
    },

    async obtenerDetalleVotos(preguntaId: number): Promise<DetalleVotosRespuesta> {
        const response = await axios.get(`${API_URL}/votaciones/detalle-votos/${preguntaId}`, { headers: getAuthHeaders() });
        return response.data;
    },

    async crearPregunta(data: Partial<Pregunta> & { opciones?: string[] }): Promise<Pregunta> {
        const response = await axios.post(`${API_URL}/votaciones/preguntas/`, data, { headers: getAuthHeaders() });
        return response.data;
    },

    async actualizarPregunta(id: number, data: Partial<Pregunta>): Promise<Pregunta> {
        const response = await axios.put(`${API_URL}/votaciones/preguntas/${id}`, data, { headers: getAuthHeaders() });
        return response.data;
    },

    async eliminarPregunta(id: number): Promise<any> {
        const response = await axios.delete(`${API_URL}/votaciones/preguntas/${id}`, { headers: getAuthHeaders() });
        return response.data;
    },

    async agregarOpcion(preguntaId: number, texto: string): Promise<Opcion> {
        const response = await axios.post(`${API_URL}/votaciones/preguntas/${preguntaId}/opciones`, { texto }, { headers: getAuthHeaders() });
        return response.data;
    },

    async eliminarOpcion(opcionId: number): Promise<any> {
        const response = await axios.delete(`${API_URL}/votaciones/opciones/${opcionId}`, { headers: getAuthHeaders() });
        return response.data;
    }
};
