from app.database import session, models
from sqlalchemy.orm import Session

def check_votes():
    db = next(session.get_db())
    votos = db.query(models.Voto).all()
    print(f"Total votos: {len(votos)}")
    for v in votos:
        print(f"ID: {v.id}, Pregunta: {v.pregunta_id}, Opcion: {v.opcion}, Peso: {v.porcentaje_voto}")
    
    config = db.query(models.ParametrosAsamblea).first()
    if config:
        print(f"Quorum final: {config.quorum_final_calculado}")
        print(f"Asamblea iniciada: {config.asamblea_iniciada}")

if __name__ == "__main__":
    check_votes()
