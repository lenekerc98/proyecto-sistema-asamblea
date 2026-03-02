
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

    # 5. Manejo de Contraseña
    # Opción A: Cambio Manual
    if usuario_update.password:
        db_user.password_hash = auth.get_password_hash(usuario_update.password)
    
    # Opción B: Enviar correo de restablecimiento
    if usuario_update.reset_password_email and db_user.email:
        from .. import utils
        access_token_expires = timedelta(hours=24)
        token_invitacion = auth.create_access_token(
            data={"sub": db_user.email, "type": "invite"}, 
            expires_delta=access_token_expires
        )
        # Reusamos la lógica de envío de invitación
        utils.enviar_correo_invitacion(
            db_user.email, 
            f"{db_user.nombres} {db_user.apellidos}", 
            token_invitacion, 
            db
        )

    db.commit()
    db.refresh(db_user)
    return db_user
