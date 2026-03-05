from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import models, session as database, schemas
from ..core import auth

router = APIRouter(
    prefix="/plantillas",
    tags=["Plantillas de Email"]
)

@router.get("/", response_model=List[schemas.EmailPlantillaOut])
def listar_plantillas(
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    return db.query(models.EmailPlantilla).all()

@router.post("/", response_model=schemas.EmailPlantillaOut)
def crear_plantilla(
    plantilla: schemas.EmailPlantillaCreate,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    nueva = models.EmailPlantilla(**plantilla.dict())
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return nueva

@router.put("/{id}", response_model=schemas.EmailPlantillaOut)
def actualizar_plantilla(
    id: int,
    plantilla: schemas.EmailPlantillaUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    db_plantilla = db.query(models.EmailPlantilla).filter(models.EmailPlantilla.id == id).first()
    if not db_plantilla:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")
    
    for key, value in plantilla.dict(exclude_unset=True).items():
        setattr(db_plantilla, key, value)
    
    db.commit()
    db.refresh(db_plantilla)
    return db_plantilla

@router.delete("/{id}")
def eliminar_plantilla(
    id: int,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    db_plantilla = db.query(models.EmailPlantilla).filter(models.EmailPlantilla.id == id).first()
    if not db_plantilla:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")
    
    db.delete(db_plantilla)
    db.commit()
    return {"mensaje": "Plantilla eliminada exitosamente"}

# --- REPORTES PDF ---

@router.get("/reportes", response_model=List[schemas.PlantillaReporteOut])
def listar_plantillas_reporte(
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    from ..database.seeders import seed_templates
    seed_templates(db)
    return db.query(models.PlantillaReporte).all()

@router.put("/reportes/{id}", response_model=schemas.PlantillaReporteOut)
def actualizar_plantilla_reporte(
    id: int,
    plantilla: schemas.PlantillaReporteUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    db_plantilla = db.query(models.PlantillaReporte).filter(models.PlantillaReporte.id == id).first()
    if not db_plantilla:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")
    
    for key, value in plantilla.dict(exclude_unset=True).items():
        setattr(db_plantilla, key, value)
    
    db.commit()
    db.refresh(db_plantilla)
    return db_plantilla
