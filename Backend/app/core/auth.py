from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from ..database import session as database, models

# Clave secreta para firmar los tokens (En producción, pon esto en un archivo .env)
SECRET_KEY = "clave_secreta_landuni_asamblea_2026_super_segura"
ALGORITHM = "HS256"

# -- TIEMPOS DE SESIÓN (En minutos) --
SESSION_TIMEOUT_MINUTES = 10        # Sesión corta por defecto
REMEMBER_ME_TIMEOUT_MINUTES = 480   # Sesión larga (8 horas)

# Configuración para encriptar contraseñas
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Le dice a FastAPI dónde está la ruta para hacer login
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# --- FUNCIONES DE SEGURIDAD ---

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# --- DEPENDENCIA PARA PROTEGER RUTAS ---
# Usa esta función en tus endpoints para obligar a que el usuario esté logueado
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Desencriptar el token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # Buscar el usuario en la BD
    user = db.query(models.Usuario).filter(models.Usuario.email == username).first()
    if user is None:
        raise credentials_exception
    return user

def get_current_accionista(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar su sesión de accionista",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        num_doc: str = payload.get("sub")
        rol: str = payload.get("role")
        if num_doc is None or rol != "accionista":
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    accionista = db.query(models.Accionista).filter(models.Accionista.num_doc == num_doc).first()
    if accionista is None:
        raise credentials_exception
        
    # Revalidar que sigue registrado como presente
    asistencia = db.query(models.Asistencia).filter(models.Asistencia.accionista_id == accionista.id).first()
    if not asistencia or not asistencia.asistio:
        raise HTTPException(status_code=403, detail="Su registro de asistencia ya no es válido")
        
    return accionista

def get_current_asistente(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar su sesión de votante",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        identificacion: str = payload.get("sub")
        rol: str = payload.get("role")
        if identificacion is None or rol != "asistente":
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # Devolver la identificación del asistente para que los endpoints puedan procesar los votos agrupados
    return identificacion