from pydantic import BaseModel, field_validator, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime
import re

# --- ESQUEMAS DE AUTENTICACIÓN ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

# --- ESQUEMAS DE ROLES (SISTEMA) ---
class RolBase(BaseModel):
    nombre: str
    permiso_dashboard: bool = True
    permiso_usuarios: bool = False
    permiso_parametros: bool = False
    permiso_accionistas: bool = False
    permiso_roles: bool = False
    permiso_votaciones: bool = False
    permiso_base_datos: bool = False
    permiso_registro_asistencia: bool = False
    permiso_perfil_usuario: bool = True
    permiso_proyector: bool = False
    permiso_votar: bool = False
    permisos: Dict[str, bool] = {}

class RolCreate(RolBase):
    pass

class RolUpdate(BaseModel):
    nombre: Optional[str] = None
    permiso_dashboard: Optional[bool] = None
    permiso_usuarios: Optional[bool] = None
    permiso_parametros: Optional[bool] = None
    permiso_accionistas: Optional[bool] = None
    permiso_roles: Optional[bool] = None
    permiso_votaciones: Optional[bool] = None
    permiso_base_datos: Optional[bool] = None
    permiso_registro_asistencia: Optional[bool] = None
    permiso_perfil_usuario: Optional[bool] = None
    permiso_proyector: Optional[bool] = None
    permiso_votar: Optional[bool] = None
    permisos: Optional[Dict[str, bool]] = None

class RolOut(RolBase):
    id: int
    class Config:
        from_attributes = True

# --- ESQUEMAS DE ACCIONISTAS Y REPRESENTANTES ---

class TipoRepresentacionBase(BaseModel):
    nombre: str

class TipoRepresentacionOut(TipoRepresentacionBase):
    id: int
    class Config:
        from_attributes = True

class RepresentanteBase(BaseModel):
    nombre: str
    identificacion: str
    tipo_id: int
    tiene_poder_firmado: bool = False

class RepresentanteCreate(RepresentanteBase):
    pass

class RepresentanteUpdate(BaseModel):
    nombre: Optional[str] = None
    identificacion: Optional[str] = None
    tipo_id: Optional[int] = None
    tiene_poder_firmado: Optional[bool] = None

class AccionistaResumenRel(BaseModel):
    id: int
    nombre_titular: str
    numero_accionista: int
    class Config:
        from_attributes = True

class RepresentanteOut(RepresentanteBase):
    id: int
    accionista_id: int
    tipo: Optional[TipoRepresentacionOut] = None
    titular: Optional[AccionistaResumenRel] = None

    class Config:
        from_attributes = True

class TipoVinculoBase(BaseModel):
    nombre: str
    abreviatura: Optional[str] = None
    descripcion: Optional[str] = None
    grupo: Optional[str] = "familiar" # 'familiar' o 'representante'

class TipoVinculoCreate(TipoVinculoBase):
    pass

class TipoVinculoUpdate(BaseModel):
    nombre: Optional[str] = None
    abreviatura: Optional[str] = None
    descripcion: Optional[str] = None
    grupo: Optional[str] = None

class TipoVinculoOut(TipoVinculoBase):
    id: int
    class Config:
        from_attributes = True

class PersonaRelacionadaBase(BaseModel):
    nombre: str
    tipo_doc: str = "Cedula"
    num_doc: Optional[str] = None
    tipo_vinculo_id: int

    @field_validator('num_doc')
    @classmethod
    def validar_documento(cls, v, info):
        if not v:
            return v
        tipo = info.data.get('tipo_doc', 'Cedula')
        if tipo == "Cedula" and (not v.isdigit() or len(v) != 10):
            raise ValueError('La Cédula debe tener exactamente 10 dígitos numéricos')
        if tipo == "RUC" and (not v.isdigit() or len(v) != 13):
            raise ValueError('El RUC debe tener exactamente 13 dígitos numéricos')
        return v

class PersonaRelacionadaCreate(PersonaRelacionadaBase):
    pass

class PersonaRelacionadaUpdate(BaseModel):
    nombre: Optional[str] = None
    tipo_doc: Optional[str] = None
    num_doc: Optional[str] = None
    tipo_vinculo_id: Optional[int] = None

class PersonaRelacionadaOut(PersonaRelacionadaBase):
    id: int
    tipo_vinculo_rel: Optional[TipoVinculoOut] = None
    class Config:
        from_attributes = True



class PersonaRelacionadaFullOut(PersonaRelacionadaOut):
    accionista: Optional[AccionistaResumenRel] = None
    periodo: str
    accionista_id: int

class AccionistaBase(BaseModel):
    periodo: str
    numero_accionista: int
    nombre_titular: str
    tipo_doc: str = "Cedula"
    num_doc: Optional[str] = None
    correo: Optional[str] = None
    telefono: Optional[str] = None
    total_acciones: int
    porcentaje_base: float

    @field_validator('num_doc')
    @classmethod
    def validar_documento(cls, v, info):
        if not v:
            return v
        tipo = info.data.get('tipo_doc', 'Cedula')
        if tipo == "Cedula" and (not v.isdigit() or len(v) != 10):
            raise ValueError('La Cédula debe tener exactamente 10 dígitos numéricos')
        if tipo == "RUC" and (not v.isdigit() or len(v) != 13):
            raise ValueError('El RUC debe tener exactamente 13 dígitos numéricos')
        return v

class AccionistaCreate(AccionistaBase):
    pass

class AccionistaUpdate(BaseModel):
    numero_accionista: Optional[int] = None
    nombre_titular: Optional[str] = None
    tipo_doc: Optional[str] = None
    num_doc: Optional[str] = None
    correo: Optional[str] = None
    telefono: Optional[str] = None
    total_acciones: Optional[int] = None
    porcentaje_base: Optional[float] = None

class AsistenciaOut(BaseModel):
    id: int
    asistio: bool
    fuera_de_quorum: bool
    asistente_identificacion: Optional[str] = None
    asistente_nombre: Optional[str] = None
    es_titular: bool = True
    observaciones: Optional[str] = None
    registrado_por: Optional[str] = None
    hora_registro: datetime

    class Config:
        from_attributes = True

class AccionistaOut(AccionistaBase):
    id: int
    representantes: List[RepresentanteOut] = []
    relacionados: List[PersonaRelacionadaOut] = [] # Nueva relación
    asistencias: List[AsistenciaOut] = []
    fecha_creacion: datetime

    class Config:
        from_attributes = True

# --- ESQUEMAS DE VOTACIÓN ---

class OpcionBase(BaseModel):
    texto: str

class OpcionCreate(OpcionBase):
    pass

class OpcionOut(OpcionBase):
    id: int
    class Config:
        from_attributes = True

class PreguntaBase(BaseModel):
    periodo: str
    numero_orden: int
    enunciado: str
    tipo_votacion: str = "binaria" # binaria, multiple
    estado: str = "pendiente" # pendiente, activa, cerrada

class PreguntaCreate(PreguntaBase):
    opciones: List[str] = [] # Opcional crear con opciones de una vez

class PreguntaUpdate(BaseModel):
    numero_orden: Optional[int] = None
    enunciado: Optional[str] = None
    tipo_votacion: Optional[str] = None
    estado: Optional[str] = None

class PreguntaOut(PreguntaBase):
    id: int
    opciones: List[OpcionOut] = []
    class Config:
        from_attributes = True

class VotoCreate(BaseModel):
    periodo: str
    pregunta_id: int
    numero_accionista: int # Usamos el número visible, no el ID interno
    opcion: str # "si", "no", "blanco", "lista_a"

class VotoAccionistaCreate(BaseModel):
    pregunta_id: int
    opcion: str

class VotoOut(BaseModel):
    id: int
    pregunta_id: int
    opcion: str
    porcentaje_voto: float
    peso_relativo: Optional[float] = None
    fecha_voto: datetime
    class Config:
        from_attributes = True

class ResultadoOpcion(BaseModel):
    opcion: str
    votos_count: int
    porcentaje_total: float # El peso normalizado

class ResultadoVotacion(BaseModel):
    pregunta_id: int
    pregunta_enunciado: str
    total_participantes: int
    resultados: List[ResultadoOpcion] = []

# ==========================================
# AUTH ACCIONISTAS (VOTACIÓN WEB RESPONSIVA)
# ==========================================

class AccionistaLogin(BaseModel):
    num_doc: str

class AccionistaToken(BaseModel):
    access_token: str
    token_type: str = "bearer"
    nombre_titular: str
    numero_accionista: int
class VotoDetalle(BaseModel):
    accionista_id: int
    numero_accionista: int
    nombre_titular: str
    opcion: str
    porcentaje_voto: float
    peso_relativo: Optional[float] = None

class DetalleVotosRespuesta(BaseModel):
    pregunta_id: int
    votos: List[VotoDetalle]

class AsistenciaCreate(BaseModel):
    numero_accionista: Optional[int] = None
    numeros_accionista: List[int] = []
    asistio: bool
    fuera_de_quorum: bool = False
    asistente_identificacion: Optional[str] = None
    asistente_nombre: Optional[str] = None
    es_titular: bool = True
    observaciones: Optional[str] = None

# --- NUEVOS ESQUEMAS PARA VOTACIÓN MÓVIL ---

class VotoMovilRequest(BaseModel):
    asistente_identificacion: str
    pregunta_id: int
    opcion: str

class VotoMovilResponse(BaseModel):
    mensaje: str
    votos_procesados: int
    total_peso: float

# --- ESQUEMAS DE PARAMETRIZACIÓN ---
class ParametrosAsambleaBase(BaseModel):
    nombre_evento: str = "Asamblea General 2026"
    periodo_activo: str = "2025"
    limite_registro_asistencia: Optional[datetime] = None
    porcentaje_minimo_inicio: float = 40.0
    asamblea_iniciada: bool = False
    asamblea_finalizada: bool = False
    inicio_automatico: bool = False
    permitir_registro_publico: bool = True
    sobrescribir_importacion: bool = False
    quorum_final_calculado: Optional[float] = None
    minutos_prorroga: int = 0
    vista_proyector: str = "espera"
    modo_entorno: str = "produccion"
    notificar_inicio_asamblea: bool = False
    tipo_votacion_permitida: str = "hibrido"
    firma_email: Optional[str] = None

class ParametrosAsambleaUpdate(BaseModel):
    nombre_evento: Optional[str] = None
    limite_registro_asistencia: Optional[datetime] = None
    porcentaje_minimo_inicio: Optional[float] = None
    asamblea_iniciada: Optional[bool] = None
    asamblea_finalizada: Optional[bool] = None
    inicio_automatico: Optional[bool] = None
    permitir_registro_publico: Optional[bool] = None
    sobrescribir_importacion: Optional[bool] = None
    quorum_final_calculado: Optional[float] = None
    minutos_prorroga: Optional[int] = None
    vista_proyector: Optional[str] = None
    modo_entorno: Optional[str] = None
    notificar_inicio_asamblea: Optional[bool] = None
    tipo_votacion_permitida: Optional[str] = None
    firma_email: Optional[str] = None

class EmailPlantillaBase(BaseModel):
    nombre: str
    asunto: str
    cuerpo: str
    asignacion: str = "global"

class EmailPlantillaCreate(EmailPlantillaBase):
    pass

class EmailPlantillaUpdate(BaseModel):
    nombre: Optional[str] = None
    asunto: Optional[str] = None
    cuerpo: Optional[str] = None
    asignacion: Optional[str] = None

class EmailPlantillaOut(EmailPlantillaBase):
    id: int
    class Config:
        from_attributes = True

class ParametrosAsambleaOut(ParametrosAsambleaBase):
    id: int
    class Config:
        from_attributes = True

class ParametrosMailBase(BaseModel):
    smtp_server: Optional[str] = None
    smtp_port: int = 587
    sender_email: Optional[str] = None
    sender_password: Optional[str] = None
    use_tls: bool = True

class ParametrosMailCreate(ParametrosMailBase):
    pass

class ParametrosMailOut(ParametrosMailBase):
    id: int
    class Config:
        from_attributes = True

# --- LOGS ---
class LogOut(BaseModel):
    id: int
    nivel: str
    origen: str
    accion: Optional[str]
    mensaje: str
    ip_address: Optional[str]
    user_agent: Optional[str]
    es_sospechoso: bool
    usuario_id: Optional[int]
    fecha: datetime

    class Config:
        from_attributes = True

class EmailTestRequest(BaseModel):
    destinatario: str

class PasswordResetRequest(BaseModel):
    email: str

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

class PasswordCreationConfirm(BaseModel):
    token: str
    new_password: str

class ChangePassword(BaseModel):
    current_password: str
    new_password: str

class UsuarioCreate(BaseModel):
    nombres: str
    apellidos: str
    email: str
    cedula: Optional[str] = None
    password: Optional[str] = None
    enviar_correo: bool = False
    rol_id: int

class UsuarioOut(BaseModel):
    id: int
    nombres: str
    apellidos: str
    email: str
    cedula: Optional[str]
    activo: bool
    rol_id: int
    rol: Optional[RolOut] = None
    fecha_creacion: Optional[datetime]
    fecha_actualizacion: Optional[datetime]
    firma_email: Optional[str] = None

    class Config:
        from_attributes = True

class UsuarioProfile(BaseModel):
    id: int
    nombres: str
    apellidos: str
    email: str
    cedula: Optional[str]
    activo: bool
    rol_id: int
    rol: Optional[RolOut] = None
    firma_email: Optional[str] = None

    class Config:
        from_attributes = True

class UsuarioUpdate(BaseModel):
    nombres: Optional[str] = None
    apellidos: Optional[str] = None
    email: Optional[str] = None
    cedula: Optional[str] = None
    activo: Optional[bool] = None
    rol_id: Optional[int] = None
    firma_email: Optional[str] = None
    enviar_correo_password: bool = False

class UsuarioPasswordUpdate(BaseModel):
    password: str

class EnvioMasivoRequest(BaseModel):
    asunto: str
    mensaje: str
    filtro: Optional[str] = "todos" # todos, asistentes, naturales, juridicas
    ids_accionistas: Optional[List[int]] = None

    class Config:
        from_attributes = True

class DestinatarioListItem(BaseModel):
    id: int
    numero_accionista: int
    nombre_titular: str
    correo: str
    tipo_doc: str

    class Config:
        from_attributes = True

class PlantillaReporteBase(BaseModel):
    slug: str
    nombre: str
    contenido_html: str
    estilos_css: Optional[str] = None
    pie_pagina: Optional[str] = None

class PlantillaReporteCreate(PlantillaReporteBase):
    pass

class PlantillaReporteUpdate(BaseModel):
    nombre: Optional[str] = None
    contenido_html: Optional[str] = None
    estilos_css: Optional[str] = None
    pie_pagina: Optional[str] = None

class PlantillaReporteOut(PlantillaReporteBase):
    id: int
    class Config:
        from_attributes = True