import sqlite3
import sqlalchemy
from sqlalchemy import create_engine, text
import os

# Buscamos el .env del backend manualmente
with open("../../Backend/.env", "r") as f:
    for line in f:
        if "DATABASE_URL=" in line:
            DURL = line.split("=")[1].strip()
            break

print(f"CONECTANDO A: {DURL}")
engine = create_engine(DURL)

with engine.connect() as conn:
    print("🚀 Iniciando migración de parámetros y plantillas...")
    
    # 1. Crear tabla EmailPlantilla
    try:
        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS email_plantillas (
            id SERIAL PRIMARY KEY,
            nombre VARCHAR(200) NOT NULL,
            asunto VARCHAR(200) NOT NULL,
            cuerpo TEXT NOT NULL,
            asignacion VARCHAR(50) NOT NULL DEFAULT 'global'
        );
        """))
        print("✅ Tabla 'email_plantillas' verificada.")
    except Exception as e:
        print(f"Error creando tabla: {e}")

    # 2. Columnas en parametros_asamblea
    for col in [("modo_entorno", "VARCHAR(20) DEFAULT 'produccion'"), ("firma_email", "TEXT")]:
        try:
            conn.execute(text(f'ALTER TABLE parametros_asamblea ADD COLUMN {col[0]} {col[1]};'))
            print(f">> Column '{col[0]}' added.")
        except Exception:
            print(f"-- Column '{col[0]}' might already exist.")
    
    conn.commit()
    print("✨ Migración finalizada.")
