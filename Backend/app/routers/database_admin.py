from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import models, session as database
from ..core import auth
from typing import Dict

router = APIRouter(
    prefix="/database",
    tags=["Base de Datos - Administración"]
)

def verify_admin(current_user: models.Usuario = Depends(auth.get_current_user)):
    # Solo usuario 0,1 o rol de administrador
    rol_nombre = current_user.rol.nombre.lower() if current_user.rol else ""
    if current_user.rol_id not in [0, 1] and rol_nombre not in ["administrador", "admin"]:
        raise HTTPException(status_code=403, detail="No tienes permisos de administrador de base de datos.")
    return current_user

# ==========================================
# ENDPOINT: MÉTRICAS GENERALES DEL SISTEMA
# ==========================================
@router.get("/metrics", response_model=Dict[str, int])
def obtener_metricas(
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(verify_admin)
):
    try:
        total_usuarios = db.query(models.Usuario).count()
        total_accionistas = db.query(models.Accionista).count()
        total_asistencias = db.query(models.Asistencia).count()
        total_votos = db.query(models.Voto).count()
        total_logs = db.query(models.Log).count()
        
        return {
            "usuarios": total_usuarios,
            "accionistas": total_accionistas,
            "asistencias": total_asistencias,
            "votos": total_votos,
            "logs": total_logs
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo métricas: {str(e)}")

# ==========================================
# ENDPOINT: LIMPIEZA DE LOGS
# ==========================================
@router.delete("/clean/logs")
def limpiar_logs(
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(verify_admin)
):
    try:
        registros_borrados = db.query(models.Log).delete()
        db.commit()
        # Registrar este evento de vaciado directamente sin ORM previo porque acabamos de borrar
        db.add(models.Log(
            nivel="WARNING",
            origen="SISTEMA",
            accion="CLEAN_LOGS",
            mensaje=f"Se purgaron todos los historiales de LOGS ({registros_borrados} registros borrados)",
            usuario_id=current_user.id
        ))
        db.commit()
        return {"mensaje": f"Se eliminaron {registros_borrados} registros de logs."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error limpiando logs: {str(e)}")

# ==========================================
# ENDPOINT: LIMPIEZA DE VOTACIONES
# ==========================================
@router.delete("/clean/votaciones")
def limpiar_votaciones(
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(verify_admin)
):
    try:
        # Borrar todos los votos
        registros_borrados = db.query(models.Voto).delete()
        db.commit()

        db.add(models.Log(
            nivel="WARNING",
            origen="SISTEMA",
            accion="CLEAN_VOTACIONES",
            mensaje=f"Se purgaron todos los VOTOS del sistema ({registros_borrados} votos borrados)",
            usuario_id=current_user.id
        ))
        db.commit()
        return {"mensaje": f"Se eliminaron {registros_borrados} votos."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error limpiando votaciones: {str(e)}")

# ==========================================
# ENDPOINT: LIMPIEZA DE ASISTENCIAS
# ==========================================
@router.delete("/clean/asistencias")
def limpiar_asistencias(
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(verify_admin)
):
    try:
        registros_borrados = db.query(models.Asistencia).delete()
        
        # Opcionalmente se pueden reiniciar los parámetros relacionados si los hubiera.
        # EJ: parametros = db.query(models.ParametrosAsamblea).first()
        # si hay algún parametro de "Asamblea Iniciada", etc.
        
        db.commit()

        db.add(models.Log(
            nivel="WARNING",
            origen="SISTEMA",
            accion="CLEAN_ASISTENCIAS",
            mensaje=f"Se purgaron todas las ASISTENCIAS ({registros_borrados} registros borrados)",
            usuario_id=current_user.id
        ))
        db.commit()
        return {"mensaje": f"Se eliminaron {registros_borrados} registros de asistencia."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error limpiando asistencias: {str(e)}")
