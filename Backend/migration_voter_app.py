from app.database.session import engine_prod as engine
from sqlalchemy import text
from app.database.models import Base

print("🚀 Iniciando migración de parámetros y plantillas...")

try:
    with engine.connect() as conn:
        # 1. Crear tabla EmailPlantilla si no existe
        # Nota: create_all es la forma más fácil para nuevas tablas.
        Base.metadata.create_all(bind=engine)
        print("✅ Verificación de tablas completada (EmailPlantilla creada).")

        # 2. Añadir columnas a parametros_asamblea (usando TRY-EXCEPT para cada una por si ya existen)
        try:
            conn.execute(text('ALTER TABLE parametros_asamblea ADD COLUMN modo_entorno VARCHAR(20) DEFAULT "produccion";'))
            print(">> [parametros_asamblea] Columna 'modo_entorno' agregada.")
        except Exception:
             print("-- [parametros_asamblea] Columna 'modo_entorno' ya existe.")

        try:
            conn.execute(text('ALTER TABLE parametros_asamblea ADD COLUMN firma_email TEXT;'))
            print(">> [parametros_asamblea] Columna 'firma_email' agregada.")
        except Exception:
             print("-- [parametros_asamblea] Columna 'firma_email' ya existe.")

        conn.commit()
    print("✨ Migración finalizada con éxito.")

except Exception as e:
    print(f"❌ Error durante la migración: {str(e)}")
