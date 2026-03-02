import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

const getAccionistaHeaders = () => {
    const token = localStorage.getItem('accionista_token');
    if (token) {
        return { Authorization: `Bearer ${token}` };
    }
    return {};
};

export interface AccionistaAuth {
    access_token: string;
    token_type: string;
    nombre_titular: string;
    numero_accionista: number;
}

export interface PreguntaVotacion {
    activa: boolean;
    ya_voto?: boolean;
    mensaje?: string;
    pregunta?: {
        id: number;
        enunciado: string;
        opciones: { id: number; texto: string; }[];
    };
}

export const accionistaVotoService = {
    async login(num_doc: string): Promise<AccionistaAuth> {
        const response = await axios.post(`${API_URL}/accionista/auth`, { num_doc });
        // Guardar token y datos del accionista
        localStorage.setItem('accionista_token', response.data.access_token);
        localStorage.setItem('accionista_data', JSON.stringify({
            nombre: response.data.nombre_titular,
            numero: response.data.numero_accionista
        }));
        return response.data;
    },

    logout() {
        localStorage.removeItem('accionista_token');
        localStorage.removeItem('accionista_data');
    },

    getCurrentAccionista() {
        const dataStr = localStorage.getItem('accionista_data');
        if (!dataStr) return null;
        try {
            return JSON.parse(dataStr);
        } catch {
            return null;
        }
    },

    async getPreguntaActiva(): Promise<PreguntaVotacion> {
        const response = await axios.get(`${API_URL}/accionista/pregunta-activa`, {
            headers: getAccionistaHeaders()
        });
        return response.data;
    },

    async emitirVoto(preguntaId: number, opcionTexto: string, numeroAccionista: number) {
        const response = await axios.post(`${API_URL}/accionista/votar`, {
            pregunta_id: preguntaId,
            opcion: opcionTexto,
            numero_accionista: numeroAccionista
        }, {
            headers: getAccionistaHeaders()
        });
        return response.data;
    }
};
