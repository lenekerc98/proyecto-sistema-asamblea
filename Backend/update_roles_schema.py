from app.database import engine
from sqlalchemy import text

print("Iniciando actualización de esquema de Roles (Permisos Reales)...")
try:
    with engine.connect() as conn:
        # Añadir las nuevas columnas para permisos de sidebar
        conn.execute(text('ALTER TABLE roles ADD COLUMN permiso_base_datos BOOLEAN DEFAULT 0;'))
        print(">> Columna permiso_base_datos agregada con éxito.")
        
        conn.execute(text('ALTER TABLE roles ADD COLUMN permiso_registro_asistencia BOOLEAN DEFAULT 0;'))
        print(">> Columna permiso_registro_asistencia agregada con éxito.")
        
        conn.execute(text('ALTER TABLE roles ADD COLUMN permiso_perfil_usuario BOOLEAN DEFAULT 1;'))
        print(">> Columna permiso_perfil_usuario agregada con éxito.")
        
        conn.commit()
except Exception as e:
    print("Error (puede que las columnas ya existan o haya otro fallo):", str(e))

print("Proceso finalizado.")
