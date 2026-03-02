export interface User {
    id: number;
    email: string;
    nombres: string;
    apellidos?: string;
    rol_id?: number;
    rol?: string;
    role?: string;
    access_token?: string;
}

export interface Accionista {
    id: number;
    num_documento: string;
    tipo_doc: string;
    nombres: string;
    apellidos: string;
    total_acciones: number;
    email?: string;
    telefono?: string;
    representante?: string;
    presente?: boolean;
    hora_registro?: string;
}
