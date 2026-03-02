import re
import sys
import os
from sqlalchemy import text
sys.path.append(os.path.abspath(os.curdir))
from app import database

def parse_sql_inserts(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    pattern = re.compile(r"INSERT INTO `registro` \(`Numero`, `Accionista`, `Identificacion`, `Acciones`, `Porcentaje`\) VALUES\s*(.*?);", re.DOTALL)
    match = pattern.search(content)
    if not match: return []
    values_str = match.group(1)
    row_pattern = re.compile(r"\((\d+),\s*'(.*?)',\s*'(.*?)',\s*(\d+),\s*([\d\.]+)\)")
    return row_pattern.findall(values_str)

def import_raw():
    sql_file = "../control/asamblea_2025.sql"
    data = parse_sql_inserts(sql_file)
    print(f"Importando {len(data)} registros...")

    with database.engine.connect() as conn:
        with conn.begin():
            conn.execute(text("DELETE FROM asistencias"))
            conn.execute(text("DELETE FROM votos"))
            conn.execute(text("DELETE FROM accionistas"))
            
            for row in data:
                numero, nombre, identificacion, acciones, porcentaje = row
                conn.execute(
                    text("INSERT INTO accionistas (numero_accionista, nombre_titular, identificacion_titular, total_acciones, porcentaje_base, fecha_creacion) VALUES (:n, :nom, :id_t, :acc, :por, NOW())"),
                    {"n": int(numero), "nom": nombre.replace("''", "'"), "id_t": identificacion.replace("''", "'"), "acc": int(acciones), "por": float(porcentaje)}
                )
    print("Importación completada con éxito.")

if __name__ == "__main__":
    import_raw()
