import sys
import os
from sqlalchemy.orm import Session
from datetime import datetime

# Añadir el path para importar app
sys.path.append(os.getcwd())

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app import models

# --- CONFIGURACIÓN DE PRUEBA (SOLO PARA ESTE SCRIPT) ---
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_election.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def verify_flow():
    # 0. Crear tablas en SQLite
    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # 1. Limpiar datos de prueba previos si existen
    db.query(models.Voto).delete()
    db.query(models.Asistencia).delete()
    db.query(models.Pregunta).delete()
    db.query(models.ParametrosAsamblea).delete()
    db.commit()

    print("--- 1. Configurando Parámetros ---")
    config = models.ParametrosAsamblea(
        nombre_evento="Asamblea de Prueba QR",
        porcentaje_minimo_inicio=10.0
    )
    db.add(config)
    db.commit()
    db.refresh(config)

    print("--- 2. Creando Accionistas y Representantes ---")
    # Accionista 1 (Titular)
    acc1 = db.query(models.Accionista).filter(models.Accionista.numero_accionista == 100).first()
    if not acc1:
        acc1 = models.Accionista(numero_accionista=100, nombre_titular="Accionista A", total_acciones=100, porcentaje_base=5.0)
        db.add(acc1)
    
    # Accionista 2 (Representado)
    acc2 = db.query(models.Accionista).filter(models.Accionista.numero_accionista == 200).first()
    if not acc2:
        acc2 = models.Accionista(numero_accionista=200, nombre_titular="Accionista B", total_acciones=50, porcentaje_base=2.5)
        db.add(acc2)
    
    db.commit()
    db.refresh(acc1)
    db.refresh(acc2)

    print("--- 3. Registrando Asistencia Grupal (1 asistente para A y B) ---")
    asistente_id = "VOTER-QR-001"
    
    ast1 = models.Asistencia(
        accionista_id=acc1.id, asistio=True, 
        asistente_identificacion=asistente_id, asistente_nombre="Juan Perez", es_titular=False
    )
    ast2 = models.Asistencia(
        accionista_id=acc2.id, asistio=True, 
        asistente_identificacion=asistente_id, asistente_nombre="Juan Perez", es_titular=False
    )
    db.add(ast1)
    db.add(ast2)
    db.commit()

    print("--- 4. Iniciando Asamblea (Congelando Quórum) ---")
    total_quorum = acc1.porcentaje_base + acc2.porcentaje_base # 7.5%
    config.asamblea_iniciada = True
    config.quorum_final_calculado = total_quorum
    db.commit()
    print(f"Quórum congelado en: {total_quorum}%")

    print("--- 5. Creando Pregunta de Elección ---")
    pregunta = models.Pregunta(numero_orden=1, enunciado="¿Aprueba el balance general?", estado="activa")
    db.add(pregunta)
    db.commit()
    db.refresh(pregunta)

    print("--- 6. Ejecutando Voto Grupal (Juan Perez vota 'SI') ---")
    # Simulamos lo que haría el router /movil/votar
    asistencias = db.query(models.Asistencia).filter(models.Asistencia.asistente_identificacion == asistente_id).all()
    votos_count = 0
    peso_total_votos = 0.0

    for ast in asistencias:
        # Peso normalizado = (base / quorum_total) * 100
        peso = (ast.accionista.porcentaje_base / config.quorum_final_calculado) * 100
        voto = models.Voto(
            pregunta_id=pregunta.id,
            accionista_id=ast.accionista_id,
            opcion="si",
            porcentaje_voto=peso
        )
        db.add(voto)
        votos_count += 1
        peso_total_votos += peso
    
    db.commit()
    print(f"Votos registrados: {votos_count}, Peso Total Electivo: {peso_total_votos}%")

    print("--- 7. RESULTADOS DE LA ELECCIÓN ---")
    # Lo que devolvería /resultados/{id}
    votos_res = db.query(models.Voto).filter(models.Voto.pregunta_id == pregunta.id).all()
    res_dict = {}
    for v in votos_res:
        if v.opcion not in res_dict:
            res_dict[v.opcion] = {"count": 0, "porcentaje": 0.0}
        res_dict[v.opcion]["count"] += 1
        res_dict[v.opcion]["porcentaje"] += v.porcentaje_voto
    
    print(f"Pregunta: {pregunta.enunciado}")
    for opc, val in res_dict.items():
        print(f"Opción [{opc.upper()}]: {val['count']} votos | Peso Total: {round(val['porcentaje'], 2)}% de la asamblea")

    if round(peso_total_votos, 2) == 100.0:
        print("\n✅ ÉXITO: El voto grupal sumado representa el 100% del quórum presente.")
    else:
        print(f"\n⚠️ INFO: El voto representa el {round(peso_total_votos, 2)}% del quórum.")

if __name__ == "__main__":
    verify_flow()
