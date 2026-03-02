from app.database import engine
from sqlalchemy import text

print("Iniciando actualización de esquema de Base de Datos...")
try:
    with engine.connect() as conn:
        # Añadir las nuevas columnas para token de creación.
        conn.execute(text('ALTER TABLE usuarios ADD COLUMN creacion_token VARCHAR(100);'))
        print(">> Columna creacion_token agregada con éxito.")
        conn.execute(text('ALTER TABLE usuarios ADD COLUMN creacion_token_expire DATETIME;'))
        print(">> Columna creacion_token_expire agregada con éxito.")
        conn.commit()
except Exception as e:
    print("Error (puede que las columnas ya existan o haya otro fallo):", str(e))

print("Proceso finalizado.")
