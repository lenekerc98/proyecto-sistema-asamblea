from fastapi import APIRouter, Depends, HTTPException, status, Request, Header
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import List, Optional
from ..database import models, session as database, schemas
from ..core import auth

router = APIRouter(
    tags=["Usuarios"]
)

# ==========================================
# ENDPOINT 1: LOGIN (Generar Token)
# ==========================================
@router.post("/login", response_model=schemas.Token)
async def login_for_access_token(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(database.get_db)
):
    # 1. Buscar al usuario POR EMAIL (OAuth2 usa 'username' pero aquí recibiremos el correo)
    user = db.query(models.Usuario).filter(models.Usuario.email == form_data.username).first()
    
    # Datos de cliente
    ip = request.client.host if request.client else "Unknown"
    ua = request.headers.get("user-agent", "Unknown")

    # 2. Verificar contraseña
    if not user or not auth.verify_password(form_data.password, user.password_hash):
        # LOG FAIL
        db.add(models.Log(
            nivel="WARNING", 
            origen="SISTEMA", 
            accion="LOGIN_FAILED",
            mensaje=f"Intento de login fallido para: {form_data.username}",
            ip_address=ip,
            user_agent=ua,
            es_sospechoso=True
        ))
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 3. Generar Token
    # Extraer remember_me del body (OAuth2PasswordRequestForm no lo tiene, así que lo buscamos en el request)
    try:
        body = await request.form()
        remember_me = body.get("remember_me", "false").lower() == "true"
    except:
        remember_me = False

    if remember_me:
        access_token_expires = timedelta(minutes=auth.REMEMBER_ME_TIMEOUT_MINUTES)
    else:
        access_token_expires = timedelta(minutes=auth.SESSION_TIMEOUT_MINUTES)
    
    # Obtener el nombre del rol si existe
    rol_nombre = user.rol.nombre if user.rol else "Sin Rol"
    
    access_token = auth.create_access_token(
        data={"sub": user.email, "role": rol_nombre}, 
        expires_delta=access_token_expires
    )
    
    # LOG SUCCESS
    db.add(models.Log(
        nivel="INFO", 
        origen="USUARIO", 
        accion="LOGIN",
        mensaje=f"Login exitoso: {user.email}",
        usuario_id=user.id,
        ip_address=ip,
        user_agent=ua
    ))
    db.commit()
    
    return {"access_token": access_token, "token_type": "bearer"}


# ==========================================
# ENDPOINT: CREAR USUARIO (REGISTRO)
# ==========================================
@router.post("/crear-usuarios/", response_model=schemas.UsuarioOut, status_code=status.HTTP_201_CREATED)
def crear_usuario(
    usuario: schemas.UsuarioCreate, 
    db: Session = Depends(database.get_db),
    authorization: Optional[str] = Header(None)
):
    # 0. Verificar si el registro público está permitido
    config = db.query(models.ParametrosAsamblea).first()
    if config and not config.permitir_registro_publico:
        # Validar si quien llama es un Administrador autenticado
        is_admin = False
        if authorization and authorization.startswith("Bearer "):
            token = authorization.split(" ")[1]
            try:
                from jose import jwt
                payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
                username = payload.get("sub")
                if username:
                    user_db = db.query(models.Usuario).filter(models.Usuario.email == username).first()
                    rol_nombre = user_db.rol.nombre.lower() if user_db and user_db.rol else ""
                    if user_db and (user_db.rol_id in [0, 1] or rol_nombre in ["admin", "administrador"]):
                        is_admin = True
            except:
                pass
        
        if not is_admin:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="El registro público de cuentas ha sido deshabilitado por el administrador.")

    # 1. Validar que el email no exista
    db_user = db.query(models.Usuario).filter(models.Usuario.email == usuario.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="El correo electrónico ya está registrado")

    # 1.1 Validar que la cédula no exista (si se envía)
    if usuario.cedula:
        db_cedula = db.query(models.Usuario).filter(models.Usuario.cedula == usuario.cedula).first()
        if db_cedula:
            raise HTTPException(status_code=400, detail="La cédula ya está registrada")

    # 2. Validar que el Rol exista
    db_rol = db.query(models.Rol).filter(models.Rol.id == usuario.rol_id).first()
    if not db_rol:
        raise HTTPException(status_code=400, detail="El ID del rol no es válido")

    # 3. Lógica de Contraseña
    if usuario.enviar_correo:
        # Si se enviará por correo, no guardamos contraseña válida temporalmente
        password_to_hash = "PENDING_SETUP" # Solo un placeholder
        hashed_password = password_to_hash
    else:
        # Generar contraseña aleatoria o usar la provista
        import secrets
        import string
        if not usuario.password:
            alphabet = string.ascii_letters + string.digits
            generated_password = ''.join(secrets.choice(alphabet) for i in range(12))
            password_to_hash = generated_password
            is_auto_generated = True
        else:
            password_to_hash = usuario.password
            is_auto_generated = False
        hashed_password = auth.get_password_hash(password_to_hash)

    # 4. Crear el modelo de Base de Datos
    nuevo_usuario = models.Usuario(
        nombres=usuario.nombres,
        apellidos=usuario.apellidos,
        email=usuario.email,
        cedula=usuario.cedula,
        password_hash=hashed_password,
        rol_id=usuario.rol_id,
        activo=True
    )
    
    # 4.1 Generar Token de Creación si aplica
    if usuario.enviar_correo:
        import secrets
        from datetime import datetime, timedelta
        token = secrets.token_urlsafe(32) # Token largo y seguro
        nuevo_usuario.creacion_token = token
        nuevo_usuario.creacion_token_expire = datetime.utcnow() + timedelta(hours=24) # Validez de 24 horas

    # 5. Guardar
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)
    
    # LOG
    db.add(models.Log(nivel="INFO", origen="USUARIO", mensaje=f"Usuario creado: {nuevo_usuario.email} (Rol ID: {nuevo_usuario.rol_id})"))
    db.commit()
    
    # 6. Enviar Correo
    from ..core import utils
    if usuario.enviar_correo:
        # Flujo de Invitar y Crear Nueva Contraseña
        email_sent = utils.enviar_correo_creacion_password(
            usuario.email,
            f"{usuario.nombres} {usuario.apellidos}",
            nuevo_usuario.creacion_token,
            db
        )
        if not email_sent:
            print("Error al enviar el correo de creación de contraseña.")
    elif is_auto_generated and usuario.email:
        # Flujo Anterior: Generada Automáticamente
        email_sent = utils.enviar_correo_clave_temporal(
            usuario.email, 
            f"{usuario.nombres} {usuario.apellidos}", 
            password_to_hash,
            db
        )
        if not email_sent:
            pass

    return nuevo_usuario

# ==========================================
# ENDPOINT: ESTABLECER NUEVA CONTRASEÑA (Por Correo)
# ==========================================
@router.post("/set-new-password", status_code=status.HTTP_200_OK)
def establecer_nueva_password(
    datos: schemas.PasswordCreationConfirm,
    db: Session = Depends(database.get_db)
):
    from datetime import datetime
    
    # 1. Buscar usuario por Token de Creación
    db_user = db.query(models.Usuario).filter(
        models.Usuario.creacion_token == datos.token,
        models.Usuario.creacion_token_expire > datetime.utcnow()
    ).first()

    if not db_user:
        raise HTTPException(status_code=400, detail="El enlace es inválido o ha expirado")

    # 2. Actualizar contraseña
    db_user.password_hash = auth.get_password_hash(datos.new_password)
    
    # 3. Limpiar Token
    db_user.creacion_token = None
    db_user.creacion_token_expire = None
    
    db.add(models.Log(nivel="INFO", origen="USUARIO", mensaje=f"Contraseña nueva establecida por enlace: {db_user.email}"))
    db.commit()
    
    return {"mensaje": "Contraseña establecida correctamente. Ya puedes iniciar sesión."}

# ==========================================
# ENDPOINT: CAMBIAR CONTRASEÑA (USUARIO LOGUEADO)
# ==========================================
@router.post("/change-password")
def cambiar_password(
    datos: schemas.ChangePassword,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    # 1. Verificar contraseña actual
    if not auth.verify_password(datos.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="La contraseña actual es incorrecta")

    # 2. Actualizar contraseña
    current_user.password_hash = auth.get_password_hash(datos.new_password)
    db.commit()
    
    return {"mensaje": "Contraseña actualizada correctamente"}

# ==========================================
# ENDPOINT: PERFIL DE USUARIO
# ==========================================
@router.get("/mi-perfil", response_model=schemas.UsuarioProfile)
def obtener_perfil(current_user: models.Usuario = Depends(auth.get_current_user)):
    return current_user

@router.put("/mi-perfil", response_model=schemas.UsuarioProfile)
def actualizar_mi_perfil(
    datos_update: schemas.UsuarioUpdate,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    # Validar Email
    if datos_update.email and datos_update.email != current_user.email:
        existe_email = db.query(models.Usuario).filter(
            models.Usuario.email == datos_update.email,
            models.Usuario.id != current_user.id
        ).first()
        if existe_email:
            raise HTTPException(status_code=400, detail="El correo electrónico ya está en uso")
            
    # Validar Cédula
    if datos_update.cedula and datos_update.cedula != current_user.cedula:
        existe_cedula = db.query(models.Usuario).filter(
            models.Usuario.cedula == datos_update.cedula,
            models.Usuario.id != current_user.id
        ).first()
        if existe_cedula:
            raise HTTPException(status_code=400, detail="La cédula ya está registrada")

    # Campos que el usuario puede editar libremente (Se ignora rol_id, estado, etc.)
    if datos_update.nombres is not None:
        current_user.nombres = datos_update.nombres
    if datos_update.apellidos is not None:
        current_user.apellidos = datos_update.apellidos
    if datos_update.email is not None:
        current_user.email = datos_update.email
    if datos_update.cedula is not None:
        current_user.cedula = datos_update.cedula
    if datos_update.firma_email is not None:
        current_user.firma_email = datos_update.firma_email

    db.add(models.Log(nivel="INFO", origen="USUARIO", mensaje=f"Perfil actualizado por el mismo usuario: {current_user.email}", usuario_id=current_user.id))
    db.commit()
    db.refresh(current_user)
    return current_user


# ==========================================
# ENDPOINT: ACTUALIZAR USUARIO
# ==========================================
@router.put("/usuarios/{user_id}", response_model=schemas.UsuarioOut)
def actualizar_usuario(
    user_id: int,
    usuario_update: schemas.UsuarioUpdate,
    db: Session = Depends(database.get_db),
    # current_user: models.Usuario = Depends(auth.get_current_user) # Descomentar para seguridad
):
    # 1. Buscar usuario a editar
    db_user = db.query(models.Usuario).filter(models.Usuario.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # 2. Validaciones de Unicidad
    # 2.1 Email
    if usuario_update.email and usuario_update.email != db_user.email:
        existe_email = db.query(models.Usuario).filter(
            models.Usuario.email == usuario_update.email,
            models.Usuario.id != user_id # Excluir al mismo usuario
        ).first()
        if existe_email:
            raise HTTPException(status_code=400, detail="El correo electrónico ya está en uso")
            
    # 2.2 Cédula
    if usuario_update.cedula and usuario_update.cedula != db_user.cedula:
        existe_cedula = db.query(models.Usuario).filter(
            models.Usuario.cedula == usuario_update.cedula,
            models.Usuario.id != user_id
        ).first()
        if existe_cedula:
            raise HTTPException(status_code=400, detail="La cédula ya está registrada")

    # 3. Validar Rol (si cambia)
    if usuario_update.rol_id:
        db_rol = db.query(models.Rol).filter(models.Rol.id == usuario_update.rol_id).first()
        if not db_rol:
            raise HTTPException(status_code=400, detail="El ID del rol no es válido")

    # 4. Actualizar campos básicos
    if usuario_update.nombres: db_user.nombres = usuario_update.nombres
    if usuario_update.apellidos: db_user.apellidos = usuario_update.apellidos
    if usuario_update.email: db_user.email = usuario_update.email
    if usuario_update.cedula: db_user.cedula = usuario_update.cedula
    if usuario_update.rol_id: db_user.rol_id = usuario_update.rol_id
    if usuario_update.activo is not None: db_user.activo = usuario_update.activo
    if usuario_update.firma_email is not None: db_user.firma_email = usuario_update.firma_email

    db.commit()
    db.refresh(db_user)
    
    # 5. Enviar correo de cambio de contraseña si el admin lo solicitó
    if getattr(usuario_update, 'enviar_correo_password', False):
        import secrets
        from datetime import datetime, timedelta
        from ..core import utils
        
        # Generar Token de Creación para cambio de contraseña
        db_user.creacion_token = secrets.token_urlsafe(32) # Token seguro
        db_user.creacion_token_expire = datetime.utcnow() + timedelta(hours=24)
        db.commit()
        
        email_sent = utils.enviar_correo_creacion_password(
            db_user.email,
            f"{db_user.nombres} {db_user.apellidos}",
            db_user.creacion_token,
            db,
            es_nuevo=False
        )
        if email_sent:
            db.add(models.Log(nivel="INFO", origen="USUARIO", mensaje=f"Enviado enlace de cambio de password a {db_user.email}"))
        else:
            print(f"Error al enviar correo de cambio de contraseña a {db_user.email}")
    
    # LOG
    db.add(models.Log(nivel="INFO", origen="USUARIO", mensaje=f"Usuario actualizado: {db_user.email} (ID: {user_id})"))
    db.commit()
    
    return db_user

# ==========================================
# ENDPOINT: SOLICITAR RECUPERACIÓN (Generar Token)
# ==========================================
@router.post("/reset-password-request", status_code=status.HTTP_200_OK)
def solicitar_recuperacion_password(
    pedido: schemas.PasswordResetRequest,
    db: Session = Depends(database.get_db),
):
    # 1. Buscar usuario por email
    db_user = db.query(models.Usuario).filter(models.Usuario.email == pedido.email).first()
    
    # Por seguridad, si no existe el usuario no avisamos (para evitar enumeración de correos)
    # Pero aquí, como es un sistema privado, podemos ser más informativos o no.
    if not db_user:
        raise HTTPException(status_code=404, detail="Correo no encontrado en el sistema")

    if not db_user.email:
        raise HTTPException(status_code=400, detail="El usuario no tiene email configurado")

    import secrets
    import string
    from datetime import datetime, timedelta
    from ..core import utils

    # 2. Generar Token (Código de 6 dígitos)
    token = ''.join(secrets.choice(string.digits) for i in range(6))
    
    # 3. Guardar Token y Expiración (1 hora)
    db_user.reset_token = token
    db_user.reset_token_expire = datetime.utcnow() + timedelta(hours=1)
    db.commit()
    
    # LOG
    db.add(models.Log(nivel="INFO", origen="USUARIO", mensaje=f"Solicitud recuperación contraseña: {db_user.email}"))
    db.commit()
    
    # 4. Enviar correo con el Token
    email_sent = utils.enviar_correo_recuperacion(
        db_user.email, 
        f"{db_user.nombres} {db_user.apellidos}", 
        token, 
        db
    )
    
    if not email_sent:
        return {"mensaje": "Token generado, pero falló el envío del correo. Revisa logs.", "token_debug": token}

    return {"mensaje": f"Se ha enviado un código de recuperación a {db_user.email}"}

# ==========================================
# ENDPOINT: CONFIRMAR RECUPERACIÓN (Usar Token)
# ==========================================
@router.post("/reset-password-confirm", status_code=status.HTTP_200_OK)
def confirmar_reset_password(
    datos: schemas.PasswordResetConfirm,
    db: Session = Depends(database.get_db)
):
    from datetime import datetime
    
    # 1. Buscar usuario por Token
    # Nota: En un sistema real masivo, es mejor pedir email + token para indexar mejor.
    # Aquí buscamos por token directo (asumiendo unicidad temporal suficiente o baja colisión en 6 dígitos para pocos usuarios)
    # Para mayor seguridad, pedimos email en el schema o iteramos. 
    # Mejor: Buscar el usuario que tenga ese token Y no haya expirado.
    
    db_user = db.query(models.Usuario).filter(
        models.Usuario.reset_token == datos.token,
        models.Usuario.reset_token_expire > datetime.utcnow()
    ).first()

    if not db_user:
        raise HTTPException(status_code=400, detail="Código inválido o expirado")

    # 2. Actualizar contraseña
    db_user.password_hash = auth.get_password_hash(datos.new_password)
    
    # 3. Limpiar Token
    db_user.reset_token = None
    db_user.reset_token_expire = None
    
    db.add(models.Log(nivel="INFO", origen="USUARIO", mensaje=f"Contraseña restablecida por token: {db_user.email}"))
    db.commit()
    
    return {"mensaje": "Contraseña actualizada correctamente. Ya puedes iniciar sesión."}

# ==========================================
# ENDPOINT: CAMBIAR CONTRASEÑA MANUAL (ADMIN)
# ==========================================
@router.put("/usuarios/{user_id}/password", status_code=status.HTTP_200_OK)
def actualizar_password_manual(
    user_id: int,
    password_data: schemas.UsuarioPasswordUpdate,
    db: Session = Depends(database.get_db),
    # current_user: models.Usuario = Depends(auth.get_current_user) # Descomentar para seguridad (Solo Admin)
):
    # 1. Buscar usuario
    db_user = db.query(models.Usuario).filter(models.Usuario.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # 2. Actualizar contraseña
    db_user.password_hash = auth.get_password_hash(password_data.password)
    
    db.add(models.Log(nivel="WARNING", origen="USUARIO", mensaje=f"Contraseña cambiada MANUALMENTE por Admin para: {db_user.email}"))
    db.commit()
    
    return {"mensaje": "Contraseña actualizada correctamente"}

# ==========================================
# ENDPOINT: LISTAR USUARIOS
# ==========================================
@router.get("/listar_usuarios/", response_model=List[schemas.UsuarioOut])
def listar_usuarios(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    usuarios = db.query(models.Usuario).offset(skip).limit(limit).all()
    return usuarios

# ==========================================
# ENDPOINT TEMPORAL: ACTUALIZAR ESQUEMA BD
# ==========================================
@router.get("/update-schema")
def update_schema_temp(db: Session = Depends(database.get_db)):
    from sqlalchemy import text
    try:
        db.execute(text('ALTER TABLE usuarios ADD COLUMN creacion_token VARCHAR(100);'))
    except Exception as e:
        print("creacion_token error:", e)
        
    try:
        db.execute(text('ALTER TABLE usuarios ADD COLUMN creacion_token_expire DATETIME;'))
    except Exception as e:
        print("creacion_token_expire error:", e)
        
    db.commit()
    return {"mensaje": "Esquema actualizado. Puedes probar nuevamente."}

@router.get("/update-schema-signature")
def update_schema_signature(db: Session = Depends(database.get_db)):
    from sqlalchemy import text
    try:
        db.execute(text('ALTER TABLE usuarios ADD COLUMN firma_email TEXT;'))
        db.commit()
    except Exception as e:
        db.rollback()
        return {"error": str(e)}
        
    return {"mensaje": "Columna firma_email agregada a la tabla usuarios correctamente."}
