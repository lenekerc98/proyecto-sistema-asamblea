from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import models, session as database, schemas
from ..core import auth

router = APIRouter(
    prefix="/configuracion",
    tags=["Configuración"]
)

def check_admin(user: models.Usuario):
    # En la base de datos, el rol de administrador es típicamente el ID 1 o tiene el nombre "Admin".
    rol_nombre = user.rol.nombre.lower() if user.rol else ""
    if user.rol_id not in [0, 1] and rol_nombre not in ["administrador", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Solo el usuario administrador puede realizar estos cambios"
        )

# ==========================================
# ENDPOINTS: PARÁMETROS DE CORREO (Restored)
# ==========================================

@router.get("/email", response_model=schemas.ParametrosMailOut)
def obtener_email_config(
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    config = db.query(models.ParametrosMail).first()
    if not config:
        config = models.ParametrosMail()
        db.add(config)
        db.commit()
        db.refresh(config)
    return config

@router.put("/email", response_model=schemas.ParametrosMailOut)
def actualizar_email_config(
    datos: schemas.ParametrosMailCreate,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    check_admin(current_user)
    config = db.query(models.ParametrosMail).first()
    if not config:
        config = models.ParametrosMail()
        db.add(config)
    
    for key, value in datos.dict(exclude_unset=True).items():
        setattr(config, key, value)
    
    db.commit()
    db.refresh(config)
    return config

@router.post("/email/test", status_code=status.HTTP_200_OK)
def probar_email_config(
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    check_admin(current_user)
    
    config = db.query(models.ParametrosMail).first()
    if not config or not config.sender_email:
        raise HTTPException(status_code=400, detail="No hay correo remitente configurado para enviar la prueba.")
        
    destinatario = config.sender_email

    from ..core import utils
    try:
        resultado = utils.enviar_correo_prueba(destinatario, db)
        if not resultado:
            raise HTTPException(status_code=400, detail="Falló el envío del correo de prueba por motivos desconocidos.")
        return {"mensaje": f"Correo de prueba enviado exitosamente a {destinatario}"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ==========================================
# ENDPOINTS: PARÁMETROS DE ASAMBLEA
# ==========================================

@router.get("/publica")
def obtener_configuracion_publica(db: Session = Depends(database.get_db)):
    config = db.query(models.ParametrosAsamblea).first()
    if not config:
        return {"permitir_registro_publico": True}
    return {"permitir_registro_publico": config.permitir_registro_publico}


@router.get("/asamblea", response_model=schemas.ParametrosAsambleaOut)
def obtener_parametros_asamblea(db: Session = Depends(database.get_db)):
    config = db.query(models.ParametrosAsamblea).first()
    if not config:
        config = models.ParametrosAsamblea()
        db.add(config)
        db.commit()
        db.refresh(config)
    return config

@router.put("/asamblea", response_model=schemas.ParametrosAsambleaOut)
def actualizar_parametros_asamblea(
    datos: schemas.ParametrosAsambleaUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    check_admin(current_user)
    config = db.query(models.ParametrosAsamblea).first()
    if not config:
        config = models.ParametrosAsamblea()
        db.add(config)

    for key, value in datos.dict(exclude_unset=True).items():
        setattr(config, key, value)
    
    db.commit()
    db.refresh(config)
    
    db.add(models.Log(
        nivel="WARNING",
        origen="SISTEMA",
        accion="UPDATE_CONFIG_ASAMBLEA",
        mensaje=f"Parámetros de asamblea actualizados por {current_user.email}",
        usuario_id=current_user.id
    ))
    db.commit()
    return config

def iniciar_asamblea_core(db: Session, usuario_id: int = None, email_usuario: str = "SISTEMA"):
    config = db.query(models.ParametrosAsamblea).first()
    if not config:
        config = models.ParametrosAsamblea()
        db.add(config)
        db.commit()

    if config.asamblea_iniciada:
        return config

    from sqlalchemy import func
    total_quorum = db.query(func.sum(models.Accionista.porcentaje_base))\
        .join(models.Asistencia)\
        .filter(models.Asistencia.asistio == True)\
        .filter(models.Asistencia.fuera_de_quorum == False).scalar() or 0.0
    
    config.asamblea_iniciada = True
    config.quorum_final_calculado = total_quorum
    
    db.add(models.Log(
        nivel="WARNING",
        origen="SISTEMA",
        accion="INICIO_ASAMBLEA",
        mensaje=f"Asamblea iniciada oficialmente por {email_usuario}. Quórum congelado en {total_quorum}%",
        usuario_id=usuario_id
    ))
    
    db.commit()

    # --- NOTIFICACIÓN AUTOMÁTICA DE INICIO ---
    if config.notificar_inicio_asamblea:
        from ..core import utils
        
        # Obtener todos los usuarios activos
        usuarios_activos = db.query(models.Usuario).filter(models.Usuario.activo == True).all()
        enviados = 0
        errores = 0
        
        for u in usuarios_activos:
            try:
                # Usamos la nueva función de utilidad para notificar el inicio
                email_sent = utils.enviar_notificacion_asamblea_iniciada(
                    u.email,
                    f"{u.nombres} {u.apellidos}",
                    config.nombre_evento,
                    db
                )
                
                if email_sent:
                    enviados += 1
                else:
                    errores += 1
            except Exception as e:
                errores += 1
                print(f"Error enviando notificación a {u.email}: {str(e)}")
        
        # Log del resultado masivo
        db.add(models.Log(
            nivel="INFO",
            origen="SISTEMA",
            accion="NOTIFICACION_MASIVA_INICIO",
            mensaje=f"Aviso de inicio enviado a usuarios. Exitosos: {enviados}, Fallidos: {errores}",
            usuario_id=usuario_id
        ))
        db.commit()

    db.refresh(config)
    return config

@router.post("/asamblea/iniciar", response_model=schemas.ParametrosAsambleaOut)
def iniciar_asamblea(
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    check_admin(current_user)
    return iniciar_asamblea_core(db, current_user.id, current_user.email)

@router.post("/asamblea/fijar-quorum", response_model=schemas.ParametrosAsambleaOut)
def fijar_quorum_manual(
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    """
    Fija el quórum actual como el 100% definitivo para las votaciones.
    Esto permite a la administración establecer la base de cálculo independientemente del inicio oficial de la asamblea.
    """
    check_admin(current_user)
    config = db.query(models.ParametrosAsamblea).first()
    if not config:
        config = models.ParametrosAsamblea()
        db.add(config)

    from sqlalchemy import func
    total_quorum = db.query(func.sum(models.Accionista.porcentaje_base))\
        .join(models.Asistencia)\
        .filter(models.Asistencia.asistio == True)\
        .filter(models.Asistencia.fuera_de_quorum == False).scalar() or 0.0
    
    config.quorum_final_calculado = total_quorum
    
    db.add(models.Log(
        nivel="INFO",
        origen="SISTEMA",
        accion="FIJAR_QUORUM",
        mensaje=f"Quórum fijado manualmente en {total_quorum}% por {current_user.email}.",
        usuario_id=current_user.id
    ))
    
    db.commit()
    db.refresh(config)
    return config

@router.post("/asamblea/reiniciar", response_model=schemas.ParametrosAsambleaOut)
def reiniciar_asamblea(
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    check_admin(current_user)
    config = db.query(models.ParametrosAsamblea).first()
    if not config:
        raise HTTPException(status_code=404, detail="No hay configuración de asamblea que reiniciar.")
    
    if config.asamblea_finalizada:
        raise HTTPException(status_code=400, detail="No se puede reiniciar una asamblea que ya ha sido finalizada formalmente.")

    config.asamblea_iniciada = False
    config.quorum_final_calculado = 0.0
    
    db.add(models.Log(
        nivel="WARNING",
        origen="SISTEMA",
        accion="REINICIO_ASAMBLEA",
        mensaje=f"Asamblea reiniciada por {current_user.email}. El estado vuelve a NO INICIADA.",
        usuario_id=current_user.id
    ))
    
    db.commit()
    db.refresh(config)
    return config

@router.post("/asamblea/finalizar", response_model=schemas.ParametrosAsambleaOut)
def finalizar_asamblea(
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    check_admin(current_user)
    config = db.query(models.ParametrosAsamblea).first()
    if not config:
        raise HTTPException(status_code=404, detail="No hay configuración de asamblea.")
    
    if not config.asamblea_iniciada:
        raise HTTPException(status_code=400, detail="La asamblea debe estar iniciada para poder finalizarla.")

    config.asamblea_finalizada = True
    
    db.add(models.Log(
        nivel="WARNING",
        origen="SISTEMA",
        accion="FINALIZACION_ASAMBLEA",
        mensaje=f"Asamblea finalizada oficialmente por {current_user.email}. Evento cerrado.",
        usuario_id=current_user.id
    ))
    
    db.commit()
    db.refresh(config)
    return config
