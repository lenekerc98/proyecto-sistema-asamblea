from app.database.session import engine
from sqlalchemy import text

print("Iniciando actualización de esquema de Roles...")

try:
    with engine.connect() as conn:
        # Añadir las nuevas columnas para permisos de sidebar
        # Usamos sub-bloques try o verificamos antes de añadir
        
        columnas = [
            ('permiso_base_datos', 'BOOLEAN DEFAULT FALSE'),
            ('permiso_registro_asistencia', 'BOOLEAN DEFAULT FALSE'),
            ('permiso_perfil_usuario', 'BOOLEAN DEFAULT TRUE'),
            ('permisos', 'JSON DEFAULT \'{}\'')
        ]
        
        for col_name, col_def in columnas:
            try:
                conn.execute(text(f'ALTER TABLE roles ADD COLUMN {col_name} {col_def};'))
                print(f">> Columna {col_name} agregada con éxito.")
            except Exception as col_e:
                print(f">> Saltando {col_name} (posiblemente ya existe).")

        conn.commit()
        print(">> Transacción completada.")

except Exception as e:
    print(f"Error general: {str(e)}")

print("Proceso finalizado. Ahora intenta iniciar sesión.")
