from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, Text, Enum, TIMESTAMP
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class TipoRepresentacion(Base):
    __tablename__ = "tipos_representacion"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(50), unique=True, nullable=False)
    representantes = relationship("Representante", back_populates="tipo")

class Accionista(Base):
    __tablename__ = "accionistas"
    id = Column(Integer, primary_key=True, index=True)
    numero_accionista = Column(Integer, unique=True, nullable=False)
    nombre_titular = Column(String(255), nullable=False)
    identificacion_titular = Column(String(50), unique=True)
    total_acciones = Column(Integer, nullable=False)
    porcentaje_base = Column(Float, nullable=False)
    
    # Relación con sus beneficiarios (1 a muchos)
    representantes = relationship("Representante", back_populates="titular")

class Representante(Base):
    __tablename__ = "representantes"
    id = Column(Integer, primary_key=True, index=True)
    accionista_id = Column(Integer, ForeignKey("accionistas.id"))
    tipo_id = Column(Integer, ForeignKey("tipos_representacion.id"))
    nombre = Column(String(255), nullable=False)
    identificacion = Column(String(50), nullable=False)
    tiene_poder_firmado = Column(Boolean, default=False)

    titular = relationship("Accionista", back_populates="representantes")
    tipo = relationship("TipoRepresentacion", back_populates="representantes")

class Pregunta(Base):
    __tablename__ = "preguntas"
    id = Column(Integer, primary_key=True, index=True)
    enunciado = Column(Text, nullable=False)
    tipo_votacion = Column(String(20), default="binaria") # binaria, lista
    estado = Column(String(20), default="pendiente") # pendiente, abierta, cerrada