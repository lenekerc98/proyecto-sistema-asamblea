from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import models, schemas, session as database
from ..core import auth

router = APIRouter(
    prefix="/roles",
    tags=["Gestión de Roles"]
)

# ==========================================
# GESTIÓN DE ROLES DE SISTEMA (USUARIOS)
# ==========================================

@router.get("/sistema", response_model=List[schemas.RolOut])
def listar_roles_sistema(db: Session = Depends(database.get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    return db.query(models.Rol).all()

@router.post("/sistema", response_model=schemas.RolOut, status_code=status.HTTP_201_CREATED)
def crear_rol_sistema(rol: schemas.RolCreate, db: Session = Depends(database.get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    if current_user.rol.nombre != "admin": # type: ignore
        raise HTTPException(status_code=403, detail="Privilegios insuficientes")
    
    if db.query(models.Rol).filter(models.Rol.nombre == rol.nombre).first():
        raise HTTPException(status_code=400, detail="Este rol ya existe")
        
    nuevo_rol = models.Rol(**rol.model_dump())
    db.add(nuevo_rol)
    db.commit()
    db.refresh(nuevo_rol)
    return nuevo_rol

@router.put("/sistema/{rol_id}", response_model=schemas.RolOut)
def actualizar_rol_sistema(rol_id: int, datos: schemas.RolUpdate, db: Session = Depends(database.get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    if current_user.rol.nombre != "admin": # type: ignore
        raise HTTPException(status_code=403, detail="Privilegios insuficientes")
    
    rol = db.query(models.Rol).filter(models.Rol.id == rol_id).first()
    if not rol:
        raise HTTPException(status_code=404, detail="Rol no encontrado")
    
    update_data = datos.model_dump(exclude_unset=True)
    
    # Si se intenta cambiar el nombre a uno que ya existe
    if "nombre" in update_data and update_data["nombre"] != rol.nombre:
        if db.query(models.Rol).filter(models.Rol.nombre == update_data["nombre"]).first():
            raise HTTPException(status_code=400, detail="Este nombre de rol ya existe")

    for key, value in update_data.items():
        setattr(rol, key, value)
    
    db.commit()
    db.refresh(rol)
    return rol

@router.delete("/sistema/{rol_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_rol_sistema(rol_id: int, db: Session = Depends(database.get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    if current_user.rol.nombre != "admin": # type: ignore
        raise HTTPException(status_code=403, detail="Privilegios insuficientes")
        
    rol = db.query(models.Rol).filter(models.Rol.id == rol_id).first()
    if not rol:
        raise HTTPException(status_code=404, detail="Rol no encontrado")
        
    if db.query(models.Usuario).filter(models.Usuario.rol_id == rol_id).first():
        raise HTTPException(status_code=400, detail="No se puede eliminar: hay usuarios asignados a este rol")
        
    db.delete(rol)
    db.commit()

# ==========================================
# GESTIÓN DE ROLES DE ACCIONISTAS (TIPO VÍNCULO)
# ==========================================

@router.get("/vinculos", response_model=List[schemas.TipoVinculoOut])
def listar_tipos_vinculo(db: Session = Depends(database.get_db)):
    """Público internamente, necesario para cargar los dropdowns"""
    return db.query(models.TipoVinculo).all()

@router.post("/vinculos", response_model=schemas.TipoVinculoOut, status_code=status.HTTP_201_CREATED)
def crear_tipo_vinculo(vinculo: schemas.TipoVinculoCreate, db: Session = Depends(database.get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    if current_user.rol.nombre != "admin": # type: ignore
        raise HTTPException(status_code=403, detail="Privilegios insuficientes")
        
    if db.query(models.TipoVinculo).filter(models.TipoVinculo.nombre == vinculo.nombre).first():
        raise HTTPException(status_code=400, detail="Este tipo de vínculo ya existe")
        
    nuevo_vin = models.TipoVinculo(**vinculo.model_dump())
    db.add(nuevo_vin)
    db.commit()
    db.refresh(nuevo_vin)
    return nuevo_vin

@router.put("/vinculos/{vinculo_id}", response_model=schemas.TipoVinculoOut)
def actualizar_tipo_vinculo(vinculo_id: int, datos: schemas.TipoVinculoUpdate, db: Session = Depends(database.get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    if current_user.rol.nombre != "admin": # type: ignore
        raise HTTPException(status_code=403, detail="Privilegios insuficientes")
        
    vin = db.query(models.TipoVinculo).filter(models.TipoVinculo.id == vinculo_id).first()
    if not vin:
        raise HTTPException(status_code=404, detail="Vínculo no encontrado")
        
    update_data = datos.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(vin, key, value)
        
    db.commit()
    db.refresh(vin)
    return vin

@router.delete("/vinculos/{vinculo_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_tipo_vinculo(vinculo_id: int, db: Session = Depends(database.get_db), current_user: models.Usuario = Depends(auth.get_current_user)):
    if current_user.rol.nombre != "admin": # type: ignore
        raise HTTPException(status_code=403, detail="Privilegios insuficientes")
        
    vinculo = db.query(models.TipoVinculo).filter(models.TipoVinculo.id == vinculo_id).first()
    if not vinculo:
        raise HTTPException(status_code=404, detail="Tipo de Vínculo no encontrado")
        
    if db.query(models.PersonaRelacionada).filter(models.PersonaRelacionada.tipo_vinculo_id == vinculo_id).first():
        raise HTTPException(status_code=400, detail="No se puede eliminar: hay accionistas usando este vínculo")
        
    db.delete(vinculo)
    db.commit()
