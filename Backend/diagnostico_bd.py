from app.database.session import engine
from app.database import models
from sqlalchemy import inspect
import os

# Asegurar que cargamos el entorno
from dotenv import load_dotenv
load_dotenv()

def check_schema():
    inspector = inspect(engine)
    discrepancias = []
    
    # Tablas a revisar basadas en models.py
    tablas_modelo = {
        "roles": models.Rol,
        "usuarios": models.Usuario,
        "parametros_asamblea": models.ParametrosAsamblea,
        "logs": models.Log,
        "accionistas": models.Accionista,
        "asistencias": models.Asistencia
    }
    
    for table_name, model_class in tablas_modelo.items():
        if not inspector.has_table(table_name):
            discrepancias.append(f"FALTA TABLA: {table_name}")
            continue
            
        # Obtener columnas reales
        columns_in_db = {col['name'] for col in inspector.get_columns(table_name)}
        
        # Obtener columnas esperadas del modelo
        columns_in_model = model_class.__table__.columns.keys()
        
        for col in columns_in_model:
            if col not in columns_in_db:
                discrepancias.append(f"FALTA COLUMNA en {table_name}: {col}")
                
    return discrepancias

if __name__ == "__main__":
    print("--- DIAGNÓSTICO DE ESQUEMA ---")
    try:
        issues = check_schema()
        if not issues:
            print("El esquema coincide perfectamente con el modelo.")
        else:
            print("Se encontraron las siguientes discrepancias:")
            for issue in issues:
                print(f" - {issue}")
            print("\nGenerando comandos SQL para corregir...")
            # Aquí podríamos generar el SQL automáticamente
    except Exception as e:
        print(f"Error al conectar con la base de datos: {e}")
