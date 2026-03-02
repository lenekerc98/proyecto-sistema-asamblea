from fastapi.security import OAuth2PasswordRequestForm
from . import auth

@app.post("/token")
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(database.get_db)
):
    # Buscar usuario en la base de datos
    user = db.query(models.Usuario).filter(models.Usuario.username == form_data.username).first()
    
    if not user or not auth.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Crear el token incluyendo el ROL en el payload
    access_token = auth.create_access_token(
        data={"sub": user.username, "role": user.rol.nombre}
    )
    return {"access_token": access_token, "token_type": "bearer"}