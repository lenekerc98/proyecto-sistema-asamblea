from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, ForeignKey, Text, TIMESTAMP, DateTime, func
from sqlalchemy.orm import sessionmaker, relationship, declarative_base
from datetime import datetime

# --- CONFIGURACIÓN DE LA SIMULACIÓN ---
Base = declarative_base()

class Accionista(Base):
    __tablename__ = "accionistas"
    id = Column(Integer, primary_key=True)
    numero_accionista = Column(Integer, unique=True)
    nombre_titular = Column(String)
    porcentaje_base = Column(Float)

class Asistencia(Base):
    __tablename__ = "asistencias"
    id = Column(Integer, primary_key=True)
    accionista_id = Column(Integer, ForeignKey("accionistas.id"))
    asistente_identificacion = Column(String)
    asistente_nombre = Column(String)
    es_titular = Column(Boolean)
    fuera_de_quorum = Column(Boolean, default=False)
    asistio = Column(Boolean, default=True)

class Pregunta(Base):
    __tablename__ = "preguntas"
    id = Column(Integer, primary_key=True)
    enunciado = Column(String)
    estado = Column(String, default="activa")

class Voto(Base):
    __tablename__ = "votos"
    id = Column(Integer, primary_key=True)
    pregunta_id = Column(Integer, ForeignKey("preguntas.id"))
    accionista_id = Column(Integer, ForeignKey("accionistas.id"))
    opcion = Column(String)
    porcentaje_voto = Column(Float)

class ParametrosAsamblea(Base):
    __tablename__ = "parametros_asamblea"
    id = Column(Integer, primary_key=True)
    asamblea_iniciada = Column(Boolean, default=True)
    quorum_final_calculado = Column(Float)

# Setup Database
engine = create_engine("sqlite:///:memory:")
Base.metadata.create_all(engine)
Session = sessionmaker(bind=engine)
db = Session()

def run_election_demo():
    print("="*60)
    print(" SIMULACIÓN DE ELECCIÓN: REPRESENTACIÓN MÚLTIPLE (QR) ")
    print("="*60)

    # 1. Crear Accionistas
    acc_data = [
        (101, "Titular Alpha", 10.0),
        (102, "Empresa Beta", 25.0),
        (103, "Familia Gamma", 5.0),
        (104, "Inversor Delta", 15.0)
    ]
    accionistas = []
    for num, nom, porc in acc_data:
        a = Accionista(numero_accionista=num, nombre_titular=nom, porcentaje_base=porc)
        db.add(a)
        accionistas.append(a)
    db.commit()

    # 2. Registrar Asistencia (Juan Perez representa a 3 accionistas)
    # Juan Perez (ID: 12345) representa a Alpha, Beta y Gamma.
    asistente_id = "12345678"
    for acc in accionistas[:3]:
        ast = Asistencia(accionista_id=acc.id, asistente_identificacion=asistente_id, asistente_nombre="Juan Pérez (Delegado)")
        db.add(ast)
    
    # Delta asiste por sí mismo
    ast_self = Asistencia(accionista_id=accionistas[3].id, asistente_identificacion="99999999", asistente_nombre="Inversor Delta", es_titular=True)
    db.add(ast_self)
    db.commit()

    # 3. Iniciar Asamblea (Quórum = 10 + 25 + 5 + 15 = 55%)
    # El "Nuevo 100%" será ese 55.
    config = ParametrosAsamblea(quorum_final_calculado=55.0)
    db.add(config)
    db.commit()

    # 4. Crear Pregunta
    pregunta = Pregunta(enunciado="¿Aprueba el Plan de Inversión 2026?")
    db.add(pregunta)
    db.commit()

    print(f"\nCONTEXTO:")
    print(f"- Quórum Presente (Base): 55.0%")
    print(f"- Representante: Juan Pérez (ID: {asistente_id})")
    print(f"- Accionistas Representados por Juan: 3 (Alpha, Beta, Gamma)")
    print(f"- Total Acciones Representadas por Juan: {10+25+5}.0%")

    # 5. Votación Grupal (Juan vota 'SI' por sus 3 representados)
    print(f"\n>>> Juan Pérez escanea el QR y vota 'SÍ' por todo su grupo...")
    asistencias_juan = db.query(Asistencia).filter(Asistencia.asistente_identificacion == asistente_id).all()
    for ast in asistencias_juan:
        # Normalización
        acc = db.query(Accionista).get(ast.accionista_id)
        peso = (acc.porcentaje_base / config.quorum_final_calculado) * 100
        voto = Voto(pregunta_id=pregunta.id, accionista_id=acc.id, opcion="si", porcentaje_voto=peso)
        db.add(voto)
    
    # Delta vota 'NO'
    acc_delta = accionistas[3]
    peso_delta = (acc_delta.porcentaje_base / config.quorum_final_calculado) * 100
    db.add(Voto(pregunta_id=pregunta.id, accionista_id=acc_delta.id, opcion="no", porcentaje_voto=peso_delta))
    
    db.commit()

    # 6. Reporte Final
    print("\n" + "="*60)
    print(" RESULTADOS DE LA ELECCIÓN (PESO NORMALIZADO) ")
    print("="*60)
    votos = db.query(Voto).all()
    res = {"si": 0.0, "no": 0.0}
    for v in votos:
        res[v.opcion] += v.porcentaje_voto
    
    print(f"Pregunta: {pregunta.enunciado}")
    print(f"Bases de cálculo: El quórum actual (55.0%) se toma como el NUEVO 100%.\en")
    
    print(f"OPCIÓN [SÍ]: {round(res['si'], 2)}%")
    print(f"  - (Suma de Alpha: {round((10/55)*100,2)}% + Beta: {round((25/55)*100,2)}% + Gamma: {round((5/55)*100,2)}%)")
    print(f"OPCIÓN [NO]: {round(res['no'], 2)}%")
    print(f"  - (Delta: {round((15/55)*100,2)}%)")
    
    print("-" * 30)
    print(f"TOTAL: {round(res['si'] + res['no'], 1)}%")

if __name__ == "__main__":
    run_election_demo()
