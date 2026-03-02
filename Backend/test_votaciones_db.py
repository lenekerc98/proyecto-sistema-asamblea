import sys
sys.path.append('.')
from app.database import session, models
db = session.SessionLocal()
preguntas = db.query(models.Pregunta).all()
print("Preguntas:", [(p.id, p.enunciado) for p in preguntas])
for p in preguntas:
    print(f"Opciones p {p.id}: {[o.texto for o in p.opciones]}")
votos = db.query(models.Voto).all()
print("Votos:", [(v.id, v.pregunta_id, v.accionista_id, v.opcion, v.porcentaje_voto) for v in votos])
config = db.query(models.ParametrosAsamblea).first()
if config:
    print(f"Quorum congelado: {config.quorum_final_calculado}")
