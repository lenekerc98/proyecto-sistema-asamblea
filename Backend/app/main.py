import os
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from .database import models, session as database
from .routers import usuarios, accionistas, config, logs, votaciones, roles, votaciones_accionista, plantillas, database_admin

# Cargar variables de entorno
load_dotenv()

import asyncio
from .core import tasks

# Inicializar FastAPI
app = FastAPI(title="API Asamblea Landuni S.A.")

@app.on_event("startup")
async def startup_event():
    # Iniciar monitor de inicio automático en segundo plano
    asyncio.create_task(tasks.verificar_inicio_automatico())

# --- HANDLER PARA LOGS DE ERRORES 422 (VALIDACIÓN) ---
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # Intentar guardar en logs
    db = next(database.get_db())
    try:
        # Extraer detalle legible
        detalles = str(exc.errors())
        mensaje_log = f"Error 422 en {request.method} {request.url.path}: {detalles}"
        
        # Obtener IP 
        client_host = request.client.host if request.client else "N/A"
        
        db.add(models.Log(
            nivel="WARNING",
            origen="SISTEMA",
            accion="VAL_ERROR_422",
            mensaje=mensaje_log[:490], # Truncar si es muy largo
            ip_address=client_host
        ))
        db.commit()
    except Exception as e:
        print(f"No se pudo guardar log de error 422: {e}")
    finally:
        db.close()
    
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": exc.body},
    )

# --- CONFIGURACIÓN DE CORS DINÁMICO ---
origins_env = os.getenv("ALLOWED_ORIGINS", "*")
if origins_env == "*":
    # Permitir cualquier origen con regex para habilitar allow_credentials=True en desarrollo
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex='https?://.*',
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    allow_origins = [o.strip() for o in origins_env.split(",")]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allow_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Crear las tablas en la Base de Datos (Si no existen)
models.Base.metadata.create_all(bind=database.engine)

@app.get("/", tags=["General"])
def read_root():
    return {"mensaje": "Servidor de Votaciones Activo"}

# Registrar Routers
app.include_router(usuarios.router)
app.include_router(accionistas.router)
app.include_router(config.router)
app.include_router(logs.router)
app.include_router(votaciones.router)
app.include_router(roles.router)
app.include_router(votaciones_accionista.router)
app.include_router(plantillas.router)
app.include_router(database_admin.router)
