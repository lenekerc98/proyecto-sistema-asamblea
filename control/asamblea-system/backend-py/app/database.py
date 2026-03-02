from sqlalchemy import create_all
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Formato: postgresql://postgres:L3n3k3rx98.@localhost:5432/nombre_bd
SQLALCHEMY_DATABASE_URL = "postgresql://postgres:L3n3k3rx98.@localhost:5432/asamblea_2026"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependencia para obtener la sesión de BD en cada petición
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()