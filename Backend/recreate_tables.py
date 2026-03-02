from app import models, database
from sqlalchemy import text

def recreate():
    print("Recreando tablas...")
    with database.engine.connect() as conn:
        conn.execute(text('DROP TABLE IF EXISTS votos CASCADE'))
        conn.execute(text('DROP TABLE IF EXISTS asistencias CASCADE'))
        conn.execute(text('DROP TABLE IF EXISTS accionistas CASCADE'))
        conn.commit()
    models.Base.metadata.create_all(database.engine)
    print("Tablas recreadas exitosamente.")

if __name__ == "__main__":
    recreate()
