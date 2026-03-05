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

export interface EmailConfig {
    id?: number;
    smtp_server: string;
    smtp_port: number;
    sender_email: string;
    sender_password?: string;
    use_tls: boolean;
}

export interface AsambleaConfig {
    id?: number;
    nombre_evento: string;
    periodo_activo: string;
    limite_registro_asistencia: string;
    porcentaje_minimo_inicio: number;
    asamblea_iniciada?: boolean;
    asamblea_finalizada?: boolean;
    inicio_automatico?: boolean;
    permitir_registro_publico?: boolean;
    sobrescribir_importacion?: boolean;
    quorum_final_calculado?: number;
    minutos_prorroga?: number;
    vista_proyector?: string;
    modo_entorno?: string;
    notificar_inicio_asamblea?: boolean;
    tipo_votacion_permitida?: string;
    firma_email?: string;
}

export const configService = {
    // --- Email Config ---
    async getEmailConfig(): Promise<EmailConfig> {
        const response = await axios.get(`${API_URL}/configuracion/email`, { headers: getAuthHeaders() });
        return response.data;
    },

    async updateEmailConfig(data: EmailConfig): Promise<EmailConfig> {
        const response = await axios.put(`${API_URL}/configuracion/email`, data, { headers: getAuthHeaders() });
        return response.data;
    },

    async testEmailConfig(): Promise<any> {
        const response = await axios.post(`${API_URL}/configuracion/email/test`, {}, { headers: getAuthHeaders() });
        return response.data;
    },

    // --- General Parameters (Asamblea) ---
    async getPublicConfig(): Promise<{ permitir_registro_publico: boolean }> {
        const response = await axios.get(`${API_URL}/configuracion/publica`);
        return response.data;
    },

    async getAsambleaConfig(): Promise<AsambleaConfig> {
        const response = await axios.get(`${API_URL}/configuracion/asamblea`, { headers: getAuthHeaders() });
        return response.data;
    },

    async updateAsambleaConfig(data: AsambleaConfig): Promise<AsambleaConfig> {
        const response = await axios.put(`${API_URL}/configuracion/asamblea`, data, { headers: getAuthHeaders() });
        return response.data;
    },

    async iniciarAsamblea(): Promise<AsambleaConfig> {
        const response = await axios.post(`${API_URL}/configuracion/asamblea/iniciar`, {}, { headers: getAuthHeaders() });
        return response.data;
    },

    async fijarQuorum(): Promise<AsambleaConfig> {
        const response = await axios.post(`${API_URL}/configuracion/asamblea/fijar-quorum`, {}, { headers: getAuthHeaders() });
        return response.data;
    },

    async reiniciarAsamblea(): Promise<AsambleaConfig> {
        const response = await axios.post(`${API_URL}/configuracion/asamblea/reiniciar`, {}, { headers: getAuthHeaders() });
        return response.data;
    },

    async cambiarVistaProyector(vista: string): Promise<AsambleaConfig> {
        const response = await axios.put(`${API_URL}/configuracion/asamblea`, { vista_proyector: vista }, { headers: getAuthHeaders() });
        return response.data;
    },

    async finalizarAsamblea(): Promise<AsambleaConfig> {
        const response = await axios.post(`${API_URL}/configuracion/asamblea/finalizar`, {}, { headers: getAuthHeaders() });
        return response.data;
    }
};
