import axios from 'axios';
import { authService } from './auth.service';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const authHeader = () => {
    const user = authService.getCurrentUser();
    if (user && user.access_token) {
        return { Authorization: `Bearer ${user.access_token}` };
    }
    return {};
};

// Interfaces
export interface PersonaRelacionada {
    id: number;
    nombre: string;
    tipo_doc: string;
    num_doc?: string;
    tipo_vinculo_id: number;
    tipo_vinculo_rel?: { id: number; nombre: string; };
    accionista?: { id: number; nombre_titular: string; numero_accionista: number; };
    periodo: string;
}

export interface Representante {
    id: number;
    accionista_id: number;
    nombre: string;
    identificacion: string;
    tipo_representacion?: string;
    tipo?: { id: number; nombre: string; };
    titular?: { id: number; nombre_titular: string; numero_accionista: number; };
}

export interface RepresentanteCreate {
    nombre: string;
    identificacion: string;
    tipo_id: number;
    tiene_poder_firmado: boolean;
}

export interface Asistencia {
    id: number;
    asistio: boolean;
    fuera_de_quorum: boolean;
    asistente_identificacion?: string;
    asistente_nombre?: string;
    es_titular: boolean;
    observaciones?: string;
    registrado_por?: string;
}

export interface AsistenciaCreate {
    numero_accionista?: number;
    numeros_accionista?: number[];
    asistio: boolean;
    fuera_de_quorum?: boolean;
    asistente_identificacion?: string;
    asistente_nombre?: string;
    es_titular: boolean;
    observaciones?: string;
}

export interface PersonaRelacionadaCreate {
    nombre: string;
    tipo_doc: string;
    num_doc?: string;
    tipo_vinculo_id: number;
}

export interface Accionista {
    id: number;
    periodo: string;
    numero_accionista: number;
    nombre_titular: string;
    tipo_doc: string;
    num_doc?: string;
    correo?: string;
    telefono?: string;
    total_acciones: number;
    porcentaje_base: number;
    relacionados: PersonaRelacionada[];
    representantes: Representante[];
    asistencias: Asistencia[];
}

export interface AccionistaCreate {
    periodo: string;
    numero_accionista: number;
    nombre_titular: string;
    tipo_doc: string;
    num_doc?: string;
    correo?: string;
    telefono?: string;
    total_acciones: number;
    porcentaje_base: number;
}

export interface AccionistaUpdate {
    numero_accionista?: number;
    nombre_titular?: string;
    tipo_doc?: string;
    num_doc?: string;
    correo?: string;
    telefono?: string;
    total_acciones?: number;
    porcentaje_base?: number;
}

// ==== CRUD ACCIONISTAS ====

export const listarAccionistas = async (busqueda?: string): Promise<Accionista[]> => {
    const url = busqueda ? `${API_URL}/accionistas/?busqueda=${busqueda}` : `${API_URL}/accionistas/`;
    const response = await axios.get(url, { headers: authHeader() });
    return response.data;
};

export const buscarPorDocumentoJerarquico = async (doc: string): Promise<Accionista[]> => {
    const response = await axios.get(`${API_URL}/consultar-vinculo/${doc}`, { headers: authHeader() });
    return response.data;
};

export const crearAccionista = async (data: AccionistaCreate): Promise<Accionista> => {
    const response = await axios.post(`${API_URL}/accionistas/`, data, { headers: authHeader() });
    return response.data;
};

export const obtenerAccionistaPorId = async (id: number): Promise<Accionista> => {
    const response = await axios.get(`${API_URL}/accionistas/${id}`, { headers: authHeader() });
    return response.data;
};

export const actualizarAccionista = async (id: number, data: AccionistaUpdate): Promise<Accionista> => {
    const response = await axios.put(`${API_URL}/accionistas/${id}`, data, { headers: authHeader() });
    return response.data;
};

export const eliminarAccionista = async (id: number): Promise<void> => {
    await axios.delete(`${API_URL}/accionistas/${id}`, { headers: authHeader() });
};

// ==== IMPORTACIÓN / PLANTILLA ====

export const descargarPlantilla = async () => {
    const response = await axios.get(`${API_URL}/plantilla`, {
        responseType: 'blob',
        headers: authHeader()
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'plantilla_accionistas.xlsx');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const importarAccionistas = async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axios.post(`${API_URL}/importar`, formData, {
        headers: {
            ...authHeader(),
            'Content-Type': 'multipart/form-data'
        }
    });
    return response.data;
};

export const limpiarAccionistas = async (): Promise<any> => {
    const response = await axios.post(`${API_URL}/limpiar`, {}, { headers: authHeader() });
    return response.data;
};

// ==== GESTIÓN DE RELACIONADOS (VÍNCULOS) ====

export const agregarRelacionado = async (accionista_id: number, data: PersonaRelacionadaCreate): Promise<PersonaRelacionada> => {
    const response = await axios.post(`${API_URL}/accionistas/${accionista_id}/relacionados`, data, { headers: authHeader() });
    return response.data;
};

export const eliminarRelacionado = async (accionista_id: number, relacionado_id: number): Promise<void> => {
    await axios.delete(`${API_URL}/accionistas/${accionista_id}/relacionados/${relacionado_id}`, { headers: authHeader() });
};

export const actualizarRelacionado = async (accionista_id: number, relacionado_id: number, data: Partial<PersonaRelacionadaCreate>): Promise<PersonaRelacionada> => {
    const response = await axios.put(`${API_URL}/accionistas/${accionista_id}/relacionados/${relacionado_id}`, data, { headers: authHeader() });
    return response.data;
};

export const listarTodosLosRelacionados = async (busqueda?: string): Promise<PersonaRelacionada[]> => {
    const url = busqueda ? `${API_URL}/relacionados-global/?busqueda=${busqueda}` : `${API_URL}/relacionados-global/`;
    const response = await axios.get(url, { headers: authHeader() });
    return response.data;
};

export const listarTodosLosRepresentantes = async (busqueda?: string): Promise<Representante[]> => {
    const url = busqueda ? `${API_URL}/representantes-global/?busqueda=${busqueda}` : `${API_URL}/representantes-global/`;
    const response = await axios.get(url, { headers: authHeader() });
    return response.data;
};

// ==== ASISTENCIA ====

export const registrarAsistencia = async (data: AsistenciaCreate): Promise<any> => {
    const response = await axios.post(`${API_URL}/asistencia/`, data, { headers: authHeader() });
    return response.data;
};

export const eliminarAsistencia = async (numero_accionista: number): Promise<void> => {
    await axios.delete(`${API_URL}/asistencia/${numero_accionista}`, { headers: authHeader() });
};

// ==== REPRESENTANTES ====

export const agregarRepresentante = async (accionista_id: number, data: RepresentanteCreate): Promise<Representante> => {
    const response = await axios.post(`${API_URL}/accionistas/${accionista_id}/representantes`, data, { headers: authHeader() });
    return response.data;
};

export const obtenerRepresentantes = async (accionista_id: number): Promise<Representante[]> => {
    const response = await axios.get(`${API_URL}/accionistas/${accionista_id}/representantes`, { headers: authHeader() });
    return response.data;
};

export const eliminarRepresentante = async (accionista_id: number, representante_id: number): Promise<void> => {
    await axios.delete(`${API_URL}/accionistas/${accionista_id}/representantes/${representante_id}`, { headers: authHeader() });
};

export const actualizarRepresentante = async (accionista_id: number, representante_id: number, data: Partial<RepresentanteCreate>): Promise<Representante> => {
    const response = await axios.put(`${API_URL}/accionistas/${accionista_id}/representantes/${representante_id}`, data, { headers: authHeader() });
    return response.data;
};

export interface TipoRepresentacion {
    id: number;
    nombre: string;
}

export const listarTiposRepresentacion = async (): Promise<TipoRepresentacion[]> => {
    const response = await axios.get(`${API_URL}/tipos-representacion/`, { headers: authHeader() });
    return response.data;
};

// ==== COMUNICACIÓN MASIVA (EMAIL) ====

export const obtenerConteoDestinatarios = async (filtro: string = "todos"): Promise<{ count: number }> => {
    const response = await axios.get(`${API_URL}/comunicacion/destinatarios-count?filtro=${filtro}`, { headers: authHeader() });
    return response.data;
};

export const listarDestinatarios = async (filtro: string = "todos"): Promise<any[]> => {
    const response = await axios.get(`${API_URL}/comunicacion/destinatarios-list?filtro=${filtro}`, { headers: authHeader() });
    return response.data;
};

export const enviarCorreoMasivo = async (datos: { asunto: string, mensaje: string, filtro?: string, ids_accionistas?: number[] }): Promise<any> => {
    const response = await axios.post(`${API_URL}/comunicacion/enviar-masivo`, datos, { headers: authHeader() });
    return response.data;
};

// ==== REPORTES / EXPORTACIÓN ====

export const exportarPadron = async () => {
    const response = await axios.get(`${API_URL}/reportes/padron`, {
        responseType: 'blob',
        headers: authHeader()
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Padron_Accionistas.xlsx');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const exportarAsistencia = async () => {
    const response = await axios.get(`${API_URL}/reportes/asistencia`, {
        responseType: 'blob',
        headers: authHeader()
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Asistencia_Asamblea.xlsx');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
