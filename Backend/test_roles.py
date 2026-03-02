from app.database.session import SessionLocal
from app.database import models

db = SessionLocal()
print("--- ROLES ---")
for r in db.query(models.Rol).all():
    print(f"ID: {r.id}, Nombre: {r.nombre}")

print("\n--- USUARIO ACTUAL ---")
for u in db.query(models.Usuario).filter(models.Usuario.email == "ceza.tech22@gmail.com").all():
    rol_nombre = u.rol.nombre if u.rol else "None"
    print(f"ID: {u.id}, Email: {u.email}, Rol ID: {u.rol_id}, Nombre del Rol: {rol_nombre}")
