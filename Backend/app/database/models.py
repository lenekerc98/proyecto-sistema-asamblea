from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, Text, TIMESTAMP, DateTime, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .session import Base

# --- CONFIGURACIÓN GLOBAL (Nuevo) ---
class ParametrosAsamblea(Base):
    __tablename__ = "parametros_asamblea"
    id = Column(Integer, primary_key=True, index=True)
    
    # --- Datos de la Asamblea ---
    nombre_evento = Column(String(200), default="Asamblea General 2026")
    periodo_activo = Column(String(10), default="2025") # Periodo global actual
    limite_registro_asistencia = Column(DateTime, nullable=True) 
    porcentaje_minimo_inicio = Column(Float, default=40.0)
    asamblea_iniciada = Column(Boolean, default=False)
    asamblea_finalizada = Column(Boolean, default=False) # Cierre oficial del evento
    inicio_automatico = Column(Boolean, default=False) # Inicia automáticamente al llegar al límite
    permitir_registro_publico = Column(Boolean, default=True)
    sobrescribir_importacion = Column(Boolean, default=False) # Reemplaza base al importar
    quorum_final_calculado = Column(Float, nullable=True) # El "Nuevo 100%"
    minutos_prorroga = Column(Integer, default=0) # Tiempo de espera adicional si no hay quórum
    vista_proyector = Column(String(50), default="espera") # Controla qué se muestra en la pantalla del proyector
    modo_entorno = Column(String(20), default="produccion") # 'produccion' o 'prueba'
    notificar_inicio_asamblea = Column(Boolean, default=False) # Notificar a usuarios al iniciar asamblea
    tipo_votacion_permitida = Column(String(20), default="hibrido") # 'hibrido', 'telefono', 'papel'
    
    # --- Configuración Email (Global) ---
    firma_email = Column(Text, nullable=True) # Firma por defecto para el sistema

class EmailPlantilla(Base):
    __tablename__ = "email_plantillas"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(200), nullable=False)
    asunto = Column(String(200), nullable=False)
    cuerpo = Column(Text, nullable=False)
    asignacion = Column(String(50), nullable=False, default="global") # 'global', 'asistencia', 'votacion'

class PlantillaReporte(Base):
    __tablename__ = "plantilla_reportes"
    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(50), unique=True, index=True) # 'acta', 'quorum', 'escrutinio'
    nombre = Column(String(200), nullable=False)
    contenido_html = Column(Text, nullable=False)
    estilos_css = Column(Text, nullable=True)
    logo_path = Column(String(255), nullable=True)
    pie_pagina = Column(Text, nullable=True)


class ParametrosMail(Base):
    __tablename__ = "parametros_mail"
    id = Column(Integer, primary_key=True, index=True)
    smtp_server = Column(String(200), nullable=True)
    smtp_port = Column(Integer, default=587)
    sender_email = Column(String(200), nullable=True)
    sender_password = Column(String(200), nullable=True)
    use_tls = Column(Boolean, default=True)

# --- SEGURIDAD ---
class Rol(Base):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(50), unique=True, nullable=False)
    
    # --- PERMISOS DE SIDEBAR ---
    permiso_dashboard = Column(Boolean, default=True)
    permiso_usuarios = Column(Boolean, default=False)
    permiso_parametros = Column(Boolean, default=False)
    permiso_accionistas = Column(Boolean, default=False)
    permiso_roles = Column(Boolean, default=False)
    permiso_votaciones = Column(Boolean, default=False)
    permiso_base_datos = Column(Boolean, default=False)
    permiso_registro_asistencia = Column(Boolean, default=False)
    permiso_perfil_usuario = Column(Boolean, default=True)
    permiso_proyector = Column(Boolean, default=False)
    permiso_votar = Column(Boolean, default=False)
    permisos = Column(JSON, default={})

    usuarios = relationship("Usuario", back_populates="rol")

class Usuario(Base):
    __tablename__ = "usuarios"
    id = Column(Integer, primary_key=True, index=True)
    nombres = Column(String(100), nullable=False)
    apellidos = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    cedula = Column(String(20), unique=True, nullable=True) 
    password_hash = Column(String(255), nullable=False)
    
    rol_id = Column(Integer, ForeignKey("roles.id"))
    activo = Column(Boolean, default=True)
    # Para Olvidé mi Contraseña
    reset_token = Column(String(100), nullable=True)
    reset_token_expire = Column(DateTime, nullable=True)
    
    # Para Creación de Contraseña Nueva (Desde Admin)
    creacion_token = Column(String(100), nullable=True)
    creacion_token_expire = Column(DateTime, nullable=True)
    fecha_creacion = Column(TIMESTAMP, server_default=func.now())
    fecha_actualizacion = Column(TIMESTAMP, nullable=True, onupdate=func.now()) # Null al crear, fecha al actualizar
    
    # --- Configuración Personal ---
    firma_email = Column(Text, nullable=True) # Firma personalizada del usuario
    
    rol = relationship("Rol", back_populates="usuarios")

# --- NEGOCIO (ACCIONISTAS) ---

class Accionista(Base):
    __tablename__ = "accionistas"
    id = Column(Integer, primary_key=True, index=True)
    periodo = Column(String(10), index=True, nullable=False) # ej. "2025"
    numero_accionista = Column(Integer, nullable=False)
    nombre_titular = Column(String(500), nullable=False)
    tipo_doc = Column(String(50), nullable=False, default="c")
    num_doc = Column(String(250), unique=True)
    correo = Column(String(255), nullable=True)
    telefono = Column(String(50), nullable=True)
    total_acciones = Column(Integer, nullable=False)
    porcentaje_base = Column(Float, nullable=False)
    
    # También es útil saber cuándo se creó el registro del accionista
    fecha_creacion = Column(TIMESTAMP, server_default=func.now())

    # RELACIONES CON CASCADA PARA SOBRESCRITURA
    representantes = relationship("Representante", back_populates="titular", cascade="all, delete-orphan")
    asistencias = relationship("Asistencia", back_populates="accionista", cascade="all, delete-orphan")
    relacionados = relationship("PersonaRelacionada", back_populates="accionista", cascade="all, delete-orphan")
    votos = relationship("Voto", back_populates="accionista", cascade="all, delete-orphan")

class Representante(Base):
    __tablename__ = "representantes"
    id = Column(Integer, primary_key=True, index=True)
    accionista_id = Column(Integer, ForeignKey("accionistas.id"))
    tipo_id = Column(Integer, ForeignKey("tipos_vinculo.id"))
    nombre = Column(String(255), nullable=False)
    identificacion = Column(String(50), nullable=False)
    tiene_poder_firmado = Column(Boolean, default=False)

    titular = relationship("Accionista", back_populates="representantes")
    tipo = relationship("TipoVinculo")

class TipoVinculo(Base):
    __tablename__ = "tipos_vinculo"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), unique=True, nullable=False)
    abreviatura = Column(String(10), unique=True, nullable=True)
    descripcion = Column(String(255), nullable=True)
    grupo = Column(String(100), default="familiar") # Puede ser 'familiar', 'representante' o ambos 'familiar,representante'
    
    relacionados = relationship("PersonaRelacionada", back_populates="tipo_vinculo_rel")

class PersonaRelacionada(Base):
    __tablename__ = "personas_relacionadas"
    id = Column(Integer, primary_key=True, index=True)
    accionista_id = Column(Integer, ForeignKey("accionistas.id"))
    periodo = Column(String(10), index=True, nullable=False) # Filtro por año
    nombre = Column(String(255), nullable=False)
    tipo_doc = Column(String(50), nullable=True, default="c")
    num_doc = Column(String(50), nullable=True) # A veces no se tiene la cédula del hijo
    tipo_vinculo_id = Column(Integer, ForeignKey("tipos_vinculo.id"), nullable=True)
    
    accionista = relationship("Accionista", back_populates="relacionados")
    tipo_vinculo_rel = relationship("TipoVinculo", back_populates="relacionados")

class Asistencia(Base):
    __tablename__ = "asistencias"
    id = Column(Integer, primary_key=True, index=True)
    accionista_id = Column(Integer, ForeignKey("accionistas.id"), unique=True)
    periodo = Column(String(10), index=True, nullable=False) # Filtro por año
    asistio = Column(Boolean, default=False)
    fuera_de_quorum = Column(Boolean, default=False) # Si llegó después de la hora límite
    
    # --- Datos de la persona que asiste físicamente ---
    asistente_identificacion = Column(String(50), nullable=True) # Cédula del que votará
    asistente_nombre = Column(String(200), nullable=True) # Nombre del que votará
    es_titular = Column(Boolean, default=True) # True si el accionista es quien asiste
    
    observaciones = Column(Text, nullable=True)
    hora_registro = Column(TIMESTAMP, server_default=func.now())
    registrado_por = Column(String(200), nullable=True) # Nombre o email del admin que lo registró
    
    accionista = relationship("Accionista", back_populates="asistencias")

# --- VOTACIÓN ---
class Pregunta(Base):
    __tablename__ = "preguntas"
    id = Column(Integer, primary_key=True, index=True)
    periodo = Column(String(10), index=True, nullable=False) # Filtro por año
    numero_orden = Column(Integer, nullable=False)
    enunciado = Column(Text, nullable=False)
    tipo_votacion = Column(String(20), default="binaria")
    estado = Column(String(20), default="pendiente")
    
    opciones = relationship("Opcion", back_populates="pregunta", cascade="all, delete-orphan")
    votos = relationship("Voto", back_populates="pregunta", cascade="all, delete-orphan")

class Opcion(Base):
    __tablename__ = "opciones_pregunta"
    id = Column(Integer, primary_key=True, index=True)
    pregunta_id = Column(Integer, ForeignKey("preguntas.id"))
    texto = Column(String(200), nullable=False)
    
    pregunta = relationship("Pregunta", back_populates="opciones")

class Voto(Base):
    __tablename__ = "votos"
    id = Column(Integer, primary_key=True, index=True)
    periodo = Column(String(10), index=True, nullable=False) # Filtro por año
    pregunta_id = Column(Integer, ForeignKey("preguntas.id"))
    accionista_id = Column(Integer, ForeignKey("accionistas.id"))
    opcion = Column(String(20), nullable=False)
    porcentaje_voto = Column(Float, nullable=False)
    peso_relativo = Column(Float, nullable=True) # % sobre el quórum asamblea
    fecha_voto = Column(TIMESTAMP, server_default=func.now())
    
    pregunta = relationship("Pregunta", back_populates="votos")
    accionista = relationship("Accionista", back_populates="votos")

# --- LOGS DEL SISTEMA ---
class Log(Base):
    __tablename__ = "logs"
    id = Column(Integer, primary_key=True, index=True)
    nivel = Column(String(20), nullable=False) # INFO, WARNING, ERROR
    origen = Column(String(50), nullable=False) # EMAIL, USUARIO, SISTEMA
    accion = Column(String(50), nullable=True) # LOGIN, LOGOUT, CREATE, UPDATE, etc.
    mensaje = Column(Text, nullable=False)
    ip_address = Column(String(45), nullable=True) # IPv4 or IPv6
    user_agent = Column(String(255), nullable=True)
    es_sospechoso = Column(Boolean, default=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True) # Opcional, si hay usuario logueado
    fecha = Column(TIMESTAMP, server_default=func.now())
    
    usuario = relationship("Usuario")