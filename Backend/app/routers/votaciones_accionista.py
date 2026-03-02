from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import models, session as database, schemas
from ..core import auth

router = APIRouter(
    prefix="/accionista",
    tags=["Votación-Accionista"]
)

@router.post("/auth", response_model=schemas.AccionistaToken)
def login_accionista(
    data: schemas.AccionistaLogin,
    db: Session = Depends(database.get_db)
):
    identificacion = data.num_doc.strip()
    
    # 1. Buscar asistencias por este documento (asistente o titular)
    asistencias = db.query(models.Asistencia).join(models.Accionista).filter(
        (models.Asistencia.asistente_identificacion == identificacion) |
        ((models.Asistencia.es_titular == True) & (models.Accionista.num_doc == identificacion))
    ).all()

    if not asistencias:
        raise HTTPException(status_code=404, detail="No se encontró registro de asistencia para esta identificación.")

    asistentes_validos = [a for a in asistencias if a.asistio]
    if not asistentes_validos:
        raise HTTPException(status_code=403, detail="Debe registrar su asistencia en la entrada antes de poder votar.")

    # 2. Obtener nombre para mostrar
    nombre_mostrar = asistentes_validos[0].asistente_nombre or asistentes_validos[0].accionista.nombre_titular
    
    # 3. Generar Token
    token_data = {
        "sub": identificacion,
        "role": "asistente"
    }
    
    from datetime import timedelta
    access_token = auth.create_access_token(data=token_data, expires_delta=timedelta(hours=12))

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "nombre_titular": nombre_mostrar,
        "numero_accionista": 0
    }

@router.get("/pregunta-activa")
def obtener_pregunta_activa(
    db: Session = Depends(database.get_db),
    identificacion: str = Depends(auth.get_current_asistente)
):
    # Obtener pregunta en estado 'activa'
    pregunta = db.query(models.Pregunta).filter(models.Pregunta.estado == "activa").first()
    
    if not pregunta:
        return {"activa": False, "mensaje": "No hay votaciones activas en este momento."}
        
    # Verificar si este asistente ya votó (checamos a través de sus asistencias)
    asistencias = db.query(models.Asistencia).join(models.Accionista).filter(
        (models.Asistencia.asistente_identificacion == identificacion) |
        ((models.Asistencia.es_titular == True) & (models.Accionista.num_doc == identificacion))
    ).all()
    
    accionista_ids = [a.accionista_id for a in asistencias if a.asistio]
    
    votos_existentes = db.query(models.Voto).filter(
        models.Voto.pregunta_id == pregunta.id,
        models.Voto.accionista_id.in_(accionista_ids)
    ).count()
    
    return {
        "activa": True,
        "ya_voto": votos_existentes > 0,
        "pregunta": {
            "id": pregunta.id,
            "enunciado": pregunta.enunciado,
            "opciones": [{"id": opc.id, "texto": opc.texto} for opc in pregunta.opciones]
        }
    }

@router.post("/votar", response_model=schemas.VotoMovilResponse)
def accionista_vota(
    voto: schemas.VotoAccionistaCreate,
    db: Session = Depends(database.get_db),
    identificacion: str = Depends(auth.get_current_asistente)
):
    # Reutilizar validaciones del módulo general
    pregunta = db.query(models.Pregunta).filter(models.Pregunta.id == voto.pregunta_id).first()
    if not pregunta or pregunta.estado != "activa":
        raise HTTPException(status_code=400, detail="La votación no está activa")

    # Validar opción
    opciones_validas = [opc.texto.lower() for opc in pregunta.opciones]
    if voto.opcion.lower() not in opciones_validas:
         raise HTTPException(status_code=400, detail=f"Opción no válida.")

    # Obtener TODAS las asistencias de esta persona
    asistencias = db.query(models.Asistencia).join(models.Accionista).filter(
        (models.Asistencia.asistente_identificacion == identificacion) |
        ((models.Asistencia.es_titular == True) & (models.Accionista.num_doc == identificacion))
    ).all()
    
    asistencias_validas = [a for a in asistencias if a.asistio]
    if not asistencias_validas:
        raise HTTPException(status_code=404, detail="Asistente no encontrado o no autorizado")

    # Validar quórum congelado o en vivo
    from sqlalchemy import func
    config = db.query(models.ParametrosAsamblea).first()
    if config and config.quorum_final_calculado and config.quorum_final_calculado > 0:
        base_calculo = config.quorum_final_calculado
    else:
        # Calcular quórum en vivo 
        base_calculo = db.query(func.sum(models.Accionista.porcentaje_base))\
            .join(models.Asistencia)\
            .filter(models.Asistencia.asistio == True)\
            .filter(models.Asistencia.fuera_de_quorum == False).scalar() or 0.0

    if base_calculo == 0:
         raise HTTPException(status_code=400, detail="No hay quórum en sala para realizar la votación.")

    votos_creados = 0
    total_peso = 0.0

    for asistencia in asistencias_validas:
        # Verificar si "este" accionista representado ya votó
        voto_existente = db.query(models.Voto).filter(
            models.Voto.pregunta_id == voto.pregunta_id,
            models.Voto.accionista_id == asistencia.accionista_id
        ).first()

        if voto_existente:
            continue # Salta si ya tiene voto

        peso_normalizado = (asistencia.accionista.porcentaje_base / base_calculo) * 100
        
        nuevo_voto = models.Voto(
            periodo=config.periodo_activo if config else "2025",
            pregunta_id=voto.pregunta_id,
            accionista_id=asistencia.accionista_id,
            opcion=voto.opcion.lower(),
            porcentaje_voto=peso_normalizado
        )
        db.add(nuevo_voto)
        
        # Log de la acción individual
        db.add(models.Log(
            nivel="INFO",
            origen="APP_ACCIONISTA",
            accion="REGISTRO_VOTO_APP",
            mensaje=f"Asistente ({identificacion}) votó '{voto.opcion}' por Accionista {asistencia.accionista.num_doc}. Peso: {peso_normalizado:.4f}%",
            usuario_id=None
        ))
        
        votos_creados += 1
        total_peso += peso_normalizado

    if votos_creados == 0:
         raise HTTPException(status_code=400, detail="Usted ya emitió un voto para esta pregunta en todos sus representados.")

    db.commit()
    
    return {
        "mensaje": "Voto múltiple registrado con éxito",
        "votos_procesados": votos_creados,
        "total_peso": total_peso
    }
