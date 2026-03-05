import sys
import os
from sqlalchemy import create_engine, text

# Modificamos el import para usar el que ellos tienen
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database.session import SQLALCHEMY_DATABASE_URL

def migrate_db():
    print(f"Connecting to database: {SQLALCHEMY_DATABASE_URL}")
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    
    with engine.connect() as conn:
        print("Agregando 'permiso_proyector' y 'permiso_votar' a la tabla roles...")
        try:
            conn.execute(text("ALTER TABLE roles ADD COLUMN permiso_proyector BOOLEAN DEFAULT FALSE;"))
            print("- Columna 'permiso_proyector' agregada.")
        except Exception as e:
            print(f"- Atencion ('permiso_proyector'): {e}")
            
        try:
            conn.execute(text("ALTER TABLE roles ADD COLUMN permiso_votar BOOLEAN DEFAULT FALSE;"))
            print("- Columna 'permiso_votar' agregada.")
        except Exception as e:
            print(f"- Atencion ('permiso_votar'): {e}")

        print("\nAgregando 'tipo_votacion_permitida' a la tabla parametros_asamblea...")
        try:
            conn.execute(text("ALTER TABLE parametros_asamblea ADD COLUMN tipo_votacion_permitida VARCHAR(20) DEFAULT 'hibrido';"))
            print("- Columna 'tipo_votacion_permitida' agregada.")
        except Exception as e:
            print(f"- Atencion ('tipo_votacion_permitida'): {e}")

        conn.commit()
    print("\nMigración completada.")

if __name__ == "__main__":
    migrate_db()
