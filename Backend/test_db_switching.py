from app.database.session import SessionProd, get_db, engine_test, engine_prod
from app.database.models import ParametrosAsamblea
import os

print("--- TESTING DATABASE SWITCHING LOGIC ---")

# 1. Ensure a config exists in Prod
session = SessionProd()
config = session.query(ParametrosAsamblea).first()
if not config:
    config = ParametrosAsamblea(nombre_evento="Test Event")
    session.add(config)
    session.commit()
    session.refresh(config)

# 2. Test Production mode
config.modo_entorno = "produccion"
session.commit()
print(f"Set modo_entorno to: {config.modo_entorno}")

# Verify what get_db returns
db_gen = get_db()
db = next(db_gen)
engine_url = str(db.get_bind().url)
print(f"Current Target DB: {engine_url}")
if "asamblea-2026" in engine_url:
    print("✅ Success: Routed to Production.")
else:
    print("❌ Failure: Not routed to Production.")
db.close()
try: next(db_gen)
except StopIteration: pass

# 3. Test Test mode
config.modo_entorno = "prueba"
session.commit()
print(f"\nSet modo_entorno to: {config.modo_entorno}")

db_gen = get_db()
db = next(db_gen)
engine_url = str(db.get_bind().url)
print(f"Current Target DB: {engine_url}")
if "asamblea-test" in engine_url:
    print("✅ Success: Routed to Testing.")
else:
    print("❌ Failure: Not routed to Testing.")
db.close()
try: next(db_gen)
except StopIteration: pass

# Clean up
config.modo_entorno = "produccion"
session.commit()
session.close()

print("\n--- TEST FINISHED ---")
