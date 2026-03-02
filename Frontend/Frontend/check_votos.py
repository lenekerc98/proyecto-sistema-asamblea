import sys
import os

backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../Backend'))
sys.path.append(backend_path)

from app.database import models, session as database

db = database.SessionProd()
config = db.query(models.ParametrosAsamblea).first()
with open('../Frontend/Frontend/check_output.txt', 'w', encoding='utf-8') as f:
    f.write(f"Quorum fijado: {config.quorum_final_calculado if config else 'N/A'}\n")

    votos = db.query(models.Voto).all()
    f.write(f"Total Votos en BD: {len(votos)}\n")
    for v in votos:
        f.write(f"Voto ID: {v.id}, Pregunta: {v.pregunta_id}, Opcion: {v.opcion}, %_voto: {v.porcentaje_voto}, Acc_id: {v.accionista_id}\n")
        if v.accionista:
             f.write(f"  Accionista %: {v.accionista.porcentaje_base}\n")

    preguntas = db.query(models.Pregunta).all()
    for p in preguntas:
        f.write(f"Pregunta ID: {p.id}, Estado: {p.estado}, Opciones: {[o.texto for o in p.opciones]}\n")
