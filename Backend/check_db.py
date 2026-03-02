
import sqlalchemy
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError

# Intentar conectar a la base de datos 'postgres' (por defecto)
# Usando las credenciales configuadas en database.py
DB_URL_DEFAULT = "postgresql://postgres:L3n3k3rx98.@127.0.0.1:5432/postgres"
DB_NAME_TARGET = "asamblea-2026"

def check_and_create_db():
    try:
        engine = create_engine(DB_URL_DEFAULT, isolation_level="AUTOCOMMIT")
        with engine.connect() as conn:
            print("Conexion exitosa con usuario 'postgres'.")
            
            # Verificar si la base de datos objetivo existe
            result = conn.execute(text(f"SELECT 1 FROM pg_database WHERE datname = '{DB_NAME_TARGET}'"))
            if result.fetchone():
                print(f"La base de datos '{DB_NAME_TARGET}' ya existe.")
            else:
                print(f"La base de datos '{DB_NAME_TARGET}' NO existe. Intentando crearla...")
                conn.execute(text(f"CREATE DATABASE \"{DB_NAME_TARGET}\""))
                print(f"Base de datos '{DB_NAME_TARGET}' creada exitosamente.")
                
    except OperationalError as e:
        print("Error de conexion/autenticacion:")
        print(e)
    except Exception as e:
        print(f"Ocurrio un error inesperado: {e}")

if __name__ == "__main__":
    check_and_create_db()
