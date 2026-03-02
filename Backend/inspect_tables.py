
import sqlalchemy
from sqlalchemy import inspect
from app.database import engine

def list_tables():
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print("Tablas en la base de datos:")
    for table in tables:
        print(f"- {table}")

if __name__ == "__main__":
    list_tables()
