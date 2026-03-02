from app.database import engine
from sqlalchemy import text
import json

print("Iniciando migración a Permisos Dinámicos (JSON)...")
try:
    with engine.connect() as conn:
        # 1. Añadir la columna permisos si no existe
        try:
            conn.execute(text('ALTER TABLE roles ADD COLUMN permisos JSON DEFAULT "{}";'))
            print(">> Columna 'permisos' (JSON) agregada con éxito.")
        except Exception as e:
            print(">> La columna 'permisos' probablemente ya existe.")

        # 2. Migrar datos de columnas booleanas a JSON
        # Obtenemos todos los roles
        result = conn.execute(text('SELECT * FROM roles'))
        roles = result.fetchall()
        
        for role in roles:
            # Creamos el mapa de permisos basado en las columnas actuales
            perm_map = {
                "dashboard": bool(role.permiso_dashboard),
                "usuarios": bool(role.permiso_usuarios),
                "parametros": bool(role.permiso_parametros),
                "accionistas": bool(role.permiso_accionistas),
                "roles": bool(role.permiso_roles),
                "votaciones": bool(role.permiso_votaciones),
                "base_datos": bool(role.permiso_base_datos),
                "registro_asistencia": bool(role.permiso_registro_asistencia),
                "perfil_usuario": bool(role.permiso_perfil_usuario)
            }
            
            # Convertimos a string para SQLite o manejamos JSON si el driver lo soporta
            perm_json = json.dumps(perm_map)
            
            # Actualizamos el rol
            conn.execute(
                text('UPDATE roles SET permisos = :perm WHERE id = :id'),
                {"perm": perm_json, "id": role.id}
            )
            print(f">> Rol '{role.nombre}' migrado con {len(perm_map)} permisos.")

        conn.commit()
except Exception as e:
    print("Error durante la migración:", str(e))

print("Proceso de migración finalizado.")
