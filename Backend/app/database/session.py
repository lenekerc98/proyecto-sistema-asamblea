import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

# Cargar variables de entorno desde .env
load_dotenv()

# URL principal de Producción
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/asamblea-2026")
# URL de Prueba/Desarrollo
SQLALCHEMY_DATABASE_URL_TEST = os.getenv("DATABASE_URL_TEST", SQLALCHEMY_DATABASE_URL)

engine_prod = create_engine(SQLALCHEMY_DATABASE_URL)
engine_test = create_engine(SQLALCHEMY_DATABASE_URL_TEST)
engine = engine_prod # Alias para compatibilidad con create_all

SessionProd = sessionmaker(autocommit=False, autoflush=False, bind=engine_prod)
SessionTest = sessionmaker(autocommit=False, autoflush=False, bind=engine_test)

Base = declarative_base()

# Dependencia para obtener la DB dinámica
def get_db():
    from . import models 
    
    # 1. Obtenemos configuración inicial de la DB principal
    master_db = SessionProd()
    try:
        config = master_db.query(models.ParametrosAsamblea).first()
        entorno = config.modo_entorno if config else "produccion"
    except:
        entorno = "produccion"
    finally:
        master_db.close()

    # 2. Servimos la sesión según el entorno seleccionado
    if entorno == "prueba":
        db = SessionTest()
    else:
        db = SessionProd()
        
    try:
        yield db
    finally:
        db.close()