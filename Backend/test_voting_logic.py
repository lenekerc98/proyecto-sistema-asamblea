from app import models, database, schemas
from sqlalchemy import text
from datetime import datetime

def test_logic():
    print("Iniciando prueba de lógica de votación...")
    db = database.SessionLocal()
    try:
        # 1. Crear Acciónista de prueba
        acc = models.Accionista(
            numero_accionista=999,
            nombre_titular="Prueba Voto",
            identificacion_titular="999",
            total_acciones=100,
            porcentaje_base=2.5
        )
        db.add(acc)
        db.commit()
        db.refresh(acc)
        
        # 2. Registrar Asistencia
        asistencia = models.Asistencia(
            accionista_id=acc.id,
            asistio=True,
            fuera_de_quorum=False
        )
        db.add(asistencia)
        
        # 3. Configurar Asamblea (Quórum Congelado al 50%)
        config = models.ConfiguracionAsamblea(
            nombre_evento="Prueba",
            asamblea_iniciada=True,
            quorum_final_calculado=50.0 # El nuevo 100%
        )
        db.add(config)
        
        # 4. Crear Pregunta
        pregunta = models.Pregunta(
            numero_orden=1,
            enunciado="¿Aprueba el balance?",
            estado="activa"
        )
        db.add(pregunta)
        db.commit()
        db.refresh(pregunta)
        
        # 5. Calcular Peso y Votar
        # Mi 2.5% del total es el (2.5 / 50) * 100 = 5% del quórum presente.
        peso = (acc.porcentaje_base / config.quorum_final_calculado) * 100
        voto = models.Voto(
            pregunta_id=pregunta.id,
            accionista_id=acc.id,
            opcion="si",
            porcentaje_voto=peso
        )
        db.add(voto)
        db.commit()
        print(f"Voto registrado con peso: {peso}%")
        
        # 6. Verificar Resultados
        votos = db.query(models.Voto).filter(models.Voto.pregunta_id == pregunta.id).all()
        total_aprobacion = sum([v.porcentaje_voto for v in votos])
        print(f"Total aprobación en la pregunta: {total_aprobacion}%")
        
        # Limpiar
        db.delete(voto)
        db.delete(pregunta)
        db.delete(config)
        db.delete(asistencia)
        db.delete(acc)
        db.commit()
        print("Prueba completada y limpieza realizada.")

    except Exception as e:
        db.rollback()
        print(f"Error en la prueba: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_logic()
