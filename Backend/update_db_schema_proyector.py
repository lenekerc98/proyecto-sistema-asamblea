from app.database import engine
from sqlalchemy import text

print("Iniciando actualización de esquema de Base de Datos para el Proyector...")
try:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE parametros_asamblea ADD COLUMN vista_proyector VARCHAR(50) DEFAULT 'espera';"))
        print(">> Columna vista_proyector agregada con éxito a parametros_asamblea.")
        conn.commit()
except Exception as e:
    print("Error (puede que la columna ya exista o haya otro fallo):", str(e))

print("Proceso finalizado.")
