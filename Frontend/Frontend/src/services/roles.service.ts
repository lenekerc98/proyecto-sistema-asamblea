import axios from 'axios';
import { authService } from './auth.service';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Mismo método que auth.service para obtener el token
const authHeader = () => {
    const user = authService.getCurrentUser();
    if (user && user.access_token) {
        return { Authorization: `Bearer ${user.access_token}` };
    }
    return {};
};

// Interfaces base
export interface RolSistema {
    id: number;
    nombre: string;
    permisos: Record<string, boolean>;
    // Campos antiguos (opcionales para compatibilidad durante migración)
    permiso_dashboard?: boolean;
    permiso_usuarios?: boolean;
    permiso_parametros?: boolean;
    permiso_accionistas?: boolean;
    permiso_roles?: boolean;
    permiso_votaciones?: boolean;
    permiso_base_datos?: boolean;
    permiso_registro_asistencia?: boolean;
    permiso_perfil_usuario?: boolean;
    permiso_proyector?: boolean;
    permiso_votar?: boolean;
}

export interface RolSistemaCreate {
    nombre: string;
    permisos?: Record<string, boolean>;
    permiso_proyector?: boolean;
    permiso_votar?: boolean;
}

export interface RolSistemaUpdate {
    nombre?: string;
    permisos?: Record<string, boolean>;
    permiso_proyector?: boolean;
    permiso_votar?: boolean;
}

export interface TipoVinculo {
    id: number;
    nombre: string;
    abreviatura?: string | null;
    descripcion?: string | null;
    grupo?: string; // 'familiar' o 'representante'
}

export interface TipoVinculoCreate {
    nombre: string;
    abreviatura?: string;
    descripcion?: string;
    grupo: string;
}

export interface TipoVinculoUpdate {
    nombre?: string;
    abreviatura?: string;
    descripcion?: string;
    grupo?: string;
}

// ==== GESTIÓN DE ROLES DE SISTEMA ====

export const listarRolesSistema = async (): Promise<RolSistema[]> => {
    const response = await axios.get(`${API_URL}/roles/sistema`, { headers: authHeader() });
    return response.data;
};

export const crearRolSistema = async (rolData: RolSistemaCreate): Promise<RolSistema> => {
    const response = await axios.post(`${API_URL}/roles/sistema`, rolData, { headers: authHeader() });
    return response.data;
};

export const actualizarRolSistema = async (id: number, rolData: RolSistemaUpdate): Promise<RolSistema> => {
    const response = await axios.put(`${API_URL}/roles/sistema/${id}`, rolData, { headers: authHeader() });
    return response.data;
};

export const eliminarRolSistema = async (id: number): Promise<void> => {
    await axios.delete(`${API_URL}/roles/sistema/${id}`, { headers: authHeader() });
};

// ==== GESTIÓN DE VÍNCULOS (ROLES DE ACCIONISTAS) ====

export const listarTiposVinculo = async (): Promise<TipoVinculo[]> => {
    const response = await axios.get(`${API_URL}/roles/vinculos`, { headers: authHeader() });
    return response.data;
};

export const crearTipoVinculo = async (vinculoData: TipoVinculoCreate): Promise<TipoVinculo> => {
    const response = await axios.post(`${API_URL}/roles/vinculos`, vinculoData, { headers: authHeader() });
    return response.data;
};

export const actualizarTipoVinculo = async (id: number, vinculoData: TipoVinculoUpdate): Promise<TipoVinculo> => {
    const response = await axios.put(`${API_URL}/roles/vinculos/${id}`, vinculoData, { headers: authHeader() });
    return response.data;
};

export const eliminarTipoVinculo = async (id: number): Promise<void> => {
    await axios.delete(`${API_URL}/roles/vinculos/${id}`, { headers: authHeader() });
};
