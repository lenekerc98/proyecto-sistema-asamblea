from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from ..database import models, schemas, session as database
from ..core import auth

router = APIRouter(
    prefix="/logs",
    tags=["Logs del Sistema"]
)

@router.get("/", response_model=List[schemas.LogOut])
def obtener_logs(
    nivel: Optional[str] = None,
    origen: Optional[str] = None,
    limit: int = 100,
    skip: int = 0,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    # Solo usuarios autenticados pueden ver los logs.
    # Idealmente restringir a rol 'Admin' (rol_id=1)
    if current_user.rol_id != 0:
        raise HTTPException(status_code=403, detail="No tienes permisos para ver los logs del sistema")

    query = db.query(models.Log)
    
    if nivel:
        query = query.filter(models.Log.nivel == nivel)
    
    if origen:
        query = query.filter(models.Log.origen == origen)
        
    # Ordenar por fecha descendente
    query = query.order_by(models.Log.fecha.desc())
    
    logs = query.offset(skip).limit(limit).all()
    return logs

@router.get("/usuarios", response_model=List[schemas.UsuarioOut])
def listar_usuarios(
    skip: int = 0, limit: int = 100,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    if current_user.rol_id != 0:
        raise HTTPException(status_code=403, detail="No tienes permisos para ver usuarios")
    return db.query(models.Usuario).offset(skip).limit(limit).all()

@router.get("/sesiones", response_model=List[schemas.LogOut])
def listar_sesiones(
    skip: int = 0, limit: int = 100,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    if current_user.rol_id != 0:
        raise HTTPException(status_code=403, detail="No tienes permisos para ver sesiones")
    return db.query(models.Log).filter(models.Log.accion == "LOGIN").order_by(models.Log.fecha.desc()).offset(skip).limit(limit).all()

@router.get("/errores", response_model=List[schemas.LogOut])
def listar_errores(
    skip: int = 0, limit: int = 100,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    if current_user.rol_id != 0:
        raise HTTPException(status_code=403, detail="No tienes permisos para ver errores")
    return db.query(models.Log).filter(models.Log.nivel == "ERROR").order_by(models.Log.fecha.desc()).offset(skip).limit(limit).all()

@router.get("/historial", response_model=List[schemas.LogOut])
def listar_historial(
    skip: int = 0, limit: int = 100,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    if current_user.rol_id != 0:
        raise HTTPException(status_code=403, detail="No tienes permisos para ver el historial")
    return db.query(models.Log).order_by(models.Log.fecha.desc()).offset(skip).limit(limit).all()

@router.get("/dashboard-stats")
def obtener_estadisticas(
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    if current_user.rol_id != 0:
        raise HTTPException(status_code=403, detail="No tienes permisos")
    
    total_usuarios = db.query(func.count(models.Usuario.id)).scalar()
    usuarios_activos = db.query(func.count(models.Usuario.id)).filter(models.Usuario.activo == True).scalar()
    usuarios_inactivos = total_usuarios - usuarios_activos
    
    # Errores hoy (opcionalmente filtrar por fecha)
    total_errores = db.query(func.count(models.Log.id)).filter(models.Log.nivel == "ERROR").scalar()
    
    # Sesiones hoy (opcionalmente filtrar por fecha)
    total_sesiones = db.query(func.count(models.Log.id)).filter(models.Log.accion == "LOGIN").scalar()
    
    # Emails Enviados
    total_emails = db.query(func.count(models.Log.id)).filter(models.Log.origen == "EMAIL").scalar()
    
    return {
        "usuarios_total": total_usuarios,
        "usuarios_activos": usuarios_activos,
        "usuarios_inactivos": usuarios_inactivos,
        "errores_total": total_errores,
        "sesiones_total": total_sesiones,
        "emails_total": total_emails
    }

@router.get("/usuarios_inactivos/buscar", response_model=List[schemas.UsuarioOut])
def buscar_usuarios_inactivos(
    skip: int = 0, limit: int = 100,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    if current_user.rol_id != 0:
        raise HTTPException(status_code=403, detail="No tienes permisos")
    return db.query(models.Usuario).filter(models.Usuario.activo == False).offset(skip).limit(limit).all()

@router.put("/usuarios/{user_id}/reactivar", response_model=schemas.UsuarioOut)
def reactivar_usuario(
    user_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    if current_user.rol_id != 0:
        raise HTTPException(status_code=403, detail="No tienes permisos")
    
    db_user = db.query(models.Usuario).filter(models.Usuario.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
    db_user.activo = True
    db.commit()
    db.refresh(db_user)
    
    # Log
    db.add(models.Log(nivel="INFO", origen="USUARIO", accion="REACTIVATE", mensaje=f"Usuario reactivado: {db_user.email}", usuario_id=current_user.id))
    db.commit()
    
    return db_user

@router.put("/usuarios/{user_id}/editar", response_model=schemas.UsuarioOut)
def editar_usuario_admin(
    user_id: int,
    usuario_update: schemas.UsuarioUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    if current_user.rol_id != 0:
        raise HTTPException(status_code=403, detail="No tienes permisos")
        
    db_user = db.query(models.Usuario).filter(models.Usuario.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
    # Update fields present
    if usuario_update.nombres: db_user.nombres = usuario_update.nombres
    if usuario_update.apellidos: db_user.apellidos = usuario_update.apellidos
    if usuario_update.email: db_user.email = usuario_update.email
    if usuario_update.cedula: db_user.cedula = usuario_update.cedula
    if usuario_update.rol_id: db_user.rol_id = usuario_update.rol_id
    if usuario_update.activo is not None: db_user.activo = usuario_update.activo

    db.commit()
    db.refresh(db_user)
    
    db.add(models.Log(nivel="INFO", origen="USUARIO", accion="UPDATE_ADMIN", mensaje=f"Usuario editado por Admin: {db_user.email}", usuario_id=current_user.id))
    db.commit()
    
    return db_user
