from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
import pandas as pd
import io
from datetime import datetime
from typing import List, Optional
from ..database import models, schemas, session as database
from ..core import auth

router = APIRouter(
    tags=["Accionistas"]
)

# ==========================================
# ENDPOINT: LISTAR / BUSCAR ACCIONISTAS
# ==========================================
@router.get("/accionistas/", response_model=List[schemas.AccionistaOut])
def listar_accionistas(
    skip: int = 0, 
    limit: int = 100, 
    busqueda: Optional[str] = None,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    config = db.query(models.ParametrosAsamblea).first()
    periodo = config.periodo_activo if config else "2025"
    
    query = db.query(models.Accionista).filter(models.Accionista.periodo == periodo)
    
    if busqueda:
        query = query.filter(
            (models.Accionista.nombre_titular.ilike(f"%{busqueda}%")) |
            (models.Accionista.num_doc.ilike(f"%{busqueda}%")) |
            (models.Accionista.numero_accionista.cast(models.String).ilike(f"%{busqueda}%"))
        )
    
    return query.offset(skip).limit(limit).all()

# ==========================================
# ENDPOINT: BUSCAR POR IDENTIFICACIÓN (Registro Rápido)
# ==========================================
@router.get("/accionistas/buscar/{identificacion}", response_model=schemas.AccionistaOut)
def obtener_accionista_por_identificacion(
    identificacion: str,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    config = db.query(models.ParametrosAsamblea).first()
    periodo = config.periodo_activo if config else "2025"
    
    accionista = db.query(models.Accionista).filter(
        models.Accionista.periodo == periodo,
        (
            (models.Accionista.num_doc == identificacion) |
            (models.Accionista.numero_accionista.cast(models.String) == identificacion)
        )
    ).first()
    
    if not accionista:
        raise HTTPException(status_code=404, detail="Accionista no encontrado")
    return accionista

# ==========================================
# ENDPOINT: OBTENER POR ID
# ==========================================
@router.get("/accionistas/{accionista_id}", response_model=schemas.AccionistaOut)
def obtener_accionista(
    accionista_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    accionista = db.query(models.Accionista).filter(models.Accionista.id == accionista_id).first()
    if not accionista:
        raise HTTPException(status_code=404, detail="Accionista no encontrado")
    return accionista

# ==========================================
# ENDPOINT: CREAR ACCIONISTA
# ==========================================
@router.post("/accionistas/", response_model=schemas.AccionistaOut, status_code=status.HTTP_201_CREATED)
def crear_accionista(
    accionista: schemas.AccionistaCreate,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    # Validar unicidad de número y documento
    if db.query(models.Accionista).filter(models.Accionista.numero_accionista == accionista.numero_accionista).first():
        raise HTTPException(status_code=400, detail="El número de accionista ya existe")
    
    if accionista.num_doc and db.query(models.Accionista).filter(models.Accionista.num_doc == accionista.num_doc).first():
        raise HTTPException(status_code=400, detail="El número de documento ya pertenece a otro accionista")
    
    config = db.query(models.ParametrosAsamblea).first()
    periodo_actual = config.periodo_activo if config else "2025"
    
    nuevo_acc = models.Accionista(**accionista.model_dump(), periodo=periodo_actual)
    db.add(nuevo_acc)
    db.commit()
    db.refresh(nuevo_acc)
    return nuevo_acc

# ==========================================
# ENDPOINT: ACTUALIZAR ACCIONISTA
# ==========================================
@router.put("/accionistas/{accionista_id}", response_model=schemas.AccionistaOut)
def actualizar_accionista(
    accionista_id: int,
    datos: schemas.AccionistaUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    accionista = db.query(models.Accionista).filter(models.Accionista.id == accionista_id).first()
    if not accionista:
        raise HTTPException(status_code=404, detail="Accionista no encontrado")
    
    update_data = datos.model_dump(exclude_unset=True)
    
    # Validaciones de unicidad si se cambia número o documento
    if "numero_accionista" in update_data:
        otro = db.query(models.Accionista).filter(
            models.Accionista.numero_accionista == update_data["numero_accionista"],
            models.Accionista.id != accionista_id
        ).first()
        if otro:
            raise HTTPException(status_code=400, detail="El número de accionista ya existe")
            
    if "num_doc" in update_data and update_data["num_doc"]:
        otro = db.query(models.Accionista).filter(
            models.Accionista.num_doc == update_data["num_doc"],
            models.Accionista.id != accionista_id
        ).first()
        if otro:
            raise HTTPException(status_code=400, detail="El número de documento ya pertenece a otro accionista")

    for key, value in update_data.items():
        setattr(accionista, key, value)
    
    db.commit()
    db.refresh(accionista)
    return accionista

# ==========================================
# ENDPOINT: REGISTRAR ASISTENCIA
# ==========================================
@router.post("/asistencia/")
def registrar_asistencia(
    datos: schemas.AsistenciaCreate, 
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    # 1. Obtener Configuración 
    config = db.query(models.ParametrosAsamblea).first()
    
    # Preparamos lista de IDs a procesar
    numeros = list(datos.numeros_accionista)
    if datos.numero_accionista and datos.numero_accionista not in numeros:
        numeros.append(datos.numero_accionista)
        
    if not numeros:
        raise HTTPException(status_code=400, detail="No se enviaron accionistas para registrar")

    # 2. Determinar si está "Fuera de Quórum" (Tardío)
    fuera_de_quorum = False
    if config and config.limite_registro_asistencia:
        from datetime import timedelta
        ahora = datetime.now()
        limite_con_prorroga = config.limite_registro_asistencia + timedelta(minutes=config.minutos_prorroga or 0)
        if ahora > limite_con_prorroga:
            fuera_de_quorum = True
    
    # Permitir que el admin fuerce el estado si viene en los datos
    if datos.fuera_de_quorum:
        fuera_de_quorum = True
        
    auditor_nombre = f"{current_user.nombres} {current_user.apellidos} ({current_user.email})"

    # 3. Iterar y procesar cada accionista
    for num_acc in numeros:
        accionista = db.query(models.Accionista).filter(models.Accionista.numero_accionista == num_acc).first()
        if not accionista:
            continue # Si no existe saltar

        asistencia_existente = db.query(models.Asistencia).filter(models.Asistencia.accionista_id == accionista.id).first()
        
        if asistencia_existente:
            asistencia_existente.asistio = datos.asistio
            asistencia_existente.fuera_de_quorum = fuera_de_quorum
            asistencia_existente.asistente_identificacion = datos.asistente_identificacion
            asistencia_existente.asistente_nombre = datos.asistente_nombre
            asistencia_existente.es_titular = datos.es_titular
            asistencia_existente.observaciones = datos.observaciones
            asistencia_existente.hora_registro = datetime.now()
            asistencia_existente.registrado_por = auditor_nombre
        else:
            periodo_actual = config.periodo_activo if config else "2025"
            nueva_asistencia = models.Asistencia(
                periodo=periodo_actual,
                accionista_id=accionista.id,
                asistio=datos.asistio,
                fuera_de_quorum=fuera_de_quorum,
                asistente_identificacion=datos.asistente_identificacion,
                asistente_nombre=datos.asistente_nombre,
                es_titular=datos.es_titular,
                observaciones=datos.observaciones,
                registrado_por=auditor_nombre
            )
            db.add(nueva_asistencia)
        
        # 4. LOG por cada accionista
        msg = f"Asistencia {'marcada' if datos.asistio else 'desmarcada'} para {accionista.numero_accionista}"
        if fuera_de_quorum:
            msg += " (FUERA DE QUÓRUM por llegada tardía)"
            
        db.add(models.Log(
            nivel="INFO" if not fuera_de_quorum else "WARNING",
            origen="SISTEMA",
            accion="REGISTRO_ASISTENCIA",
            mensaje=msg,
            usuario_id=current_user.id
        ))
    
    db.commit()
    return {
        "mensaje": "Asistencia(s) procesada(s) correctamente",
        "fuera_de_quorum": fuera_de_quorum
    }

# ==========================================
# ENDPOINT: RESTABLECER ASISTENCIAS GLOBALES
# ==========================================
@router.delete("/asistencia/restablecer-todas")
def restablecer_todas_asistencias(
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    if current_user.rol.nombre != "admin":
        raise HTTPException(status_code=403, detail="No tienes permisos para realizar esta acción")
        
    registros_borrados = db.query(models.Asistencia).delete()
    db.commit()

    db.add(models.Log(
        nivel="WARNING",
        origen="SISTEMA",
        accion="RESTABLECER_ASISTENCIAS",
        mensaje=f"Se borraron TODOS los registros de asistencia ({registros_borrados} registros)",
        usuario_id=current_user.id
    ))
    db.commit()
    
    return {"mensaje": f"Se han eliminado {registros_borrados} registros de asistencia correctamente."}

# ==========================================
# ENDPOINT: ELIMINAR ASISTENCIA INDIVIDUAL
# ==========================================
@router.delete("/asistencia/{numero_accionista}")
def eliminar_asistencia(
    numero_accionista: int,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    accionista = db.query(models.Accionista).filter(models.Accionista.numero_accionista == numero_accionista).first()
    if not accionista:
        raise HTTPException(status_code=404, detail="Accionista no encontrado")
    
    asistencia = db.query(models.Asistencia).filter(models.Asistencia.accionista_id == accionista.id).first()
    if not asistencia:
        raise HTTPException(status_code=404, detail="No hay registro de asistencia para este accionista")
    
    db.delete(asistencia)
    
    # LOG
    db.add(models.Log(
        nivel="WARNING",
        origen="SISTEMA",
        accion="ELIMINAR_ASISTENCIA",
        mensaje=f"Asistencia eliminada para accionista {numero_accionista}",
        usuario_id=current_user.id
    ))
    
    db.commit()
    return {"mensaje": "Asistencia eliminada correctamente"}

# ==========================================
# ENDPOINT: GESTIÓN DE REPRESENTANTES
# ==========================================
@router.post("/accionistas/{accionista_id}/representantes", response_model=schemas.RepresentanteOut)
def agregar_representante(
    accionista_id: int,
    representante: schemas.RepresentanteCreate,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    # Verificar que el accionista exista
    accionista = db.query(models.Accionista).filter(models.Accionista.id == accionista_id).first()
    if not accionista:
        raise HTTPException(status_code=404, detail="Accionista no encontrado")
    
    # Limpieza de datos: quitar campos de otros modelos si vienen
    rep_data = representante.model_dump()
    nuevo_rep = models.Representante(**rep_data, accionista_id=accionista_id)
    db.add(nuevo_rep)
    db.commit()
    db.refresh(nuevo_rep)
    return nuevo_rep

@router.get("/accionistas/{accionista_id}/representantes", response_model=List[schemas.RepresentanteOut])
def obtener_representantes(
    accionista_id: int,
    db: Session = Depends(database.get_db)
):
    return db.query(models.Representante).filter(models.Representante.accionista_id == accionista_id).all()

@router.put("/accionistas/{accionista_id}/representantes/{representante_id}", response_model=schemas.RepresentanteOut)
def actualizar_representante(
    accionista_id: int,
    representante_id: int,
    datos: schemas.RepresentanteUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    rep = db.query(models.Representante).filter(
        models.Representante.id == representante_id,
        models.Representante.accionista_id == accionista_id
    ).first()
    
    if not rep:
        raise HTTPException(status_code=404, detail="Representante no encontrado")
        
    update_data = datos.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(rep, key, value)
        
    db.commit()
    db.refresh(rep)
    return rep

@router.delete("/accionistas/{accionista_id}/representantes/{representante_id}")
def eliminar_representante(
    accionista_id: int,
    representante_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    rep = db.query(models.Representante).filter(
        models.Representante.id == representante_id,
        models.Representante.accionista_id == accionista_id
    ).first()
    
    if not rep:
        raise HTTPException(status_code=404, detail="Representante no encontrado")
        
    db.delete(rep)
    db.commit()
    return {"mensaje": "Representante eliminado correctamente"}

# ==========================================
# ENDPOINT: TIPOS DE REPRESENTACIÓN
# ==========================================
@router.get("/tipos-representacion/", response_model=List[schemas.TipoVinculoOut])
def listar_tipos_representacion(db: Session = Depends(database.get_db)):
    return db.query(models.TipoVinculo).filter(models.TipoVinculo.grupo.like("%representante%")).all()

# ==========================================
# ENDPOINT: CÁLCULO DE QUÓRUM
# ==========================================
@router.get("/quorum/")
def obtener_quorum(db: Session = Depends(database.get_db)):
    # 1. Suma de porcentajes de accionistas que ASISTIERON y están DENTRO del quórum
    total_quorum = db.query(func.sum(models.Accionista.porcentaje_base))\
        .join(models.Asistencia)\
        .filter(models.Asistencia.asistio == True)\
        .filter(models.Asistencia.fuera_de_quorum == False).scalar() or 0.0
    
    # 2. Total de asistentes (incluyendo los que no votan)
    total_asistentes = db.query(models.Asistencia).filter(models.Asistencia.asistio == True).count()
    
    # 3. Datos de configuración
    config = db.query(models.ParametrosAsamblea).first()
    minimo_inicio = config.porcentaje_minimo_inicio if config else 40.0
    
    return {
        "porcentaje_quorum": round(total_quorum, 3),
        "asistentes_totales": total_asistentes,
        "quorum_minimo_requerido": minimo_inicio,
        "puede_iniciar": total_quorum >= minimo_inicio
    }

# ==========================================
# GESTIÓN DE RELACIONADOS (VÍNCULOS)
# ==========================================

@router.post("/accionistas/{accionista_id}/relacionados", response_model=schemas.PersonaRelacionadaOut)
def agregar_persona_relacionada(
    accionista_id: int,
    datos: schemas.PersonaRelacionadaCreate,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    accionista = db.query(models.Accionista).filter(models.Accionista.id == accionista_id).first()
    if not accionista:
        raise HTTPException(status_code=404, detail="Accionista no encontrado")
    
    config = db.query(models.ParametrosAsamblea).first()
    periodo = config.periodo_activo if config else "2025"
    
    nuevo_v = models.PersonaRelacionada(**datos.model_dump(), accionista_id=accionista_id, periodo=periodo)
    db.add(nuevo_v)
    db.commit()
    db.refresh(nuevo_v)
    return nuevo_v

@router.put("/accionistas/{accionista_id}/relacionados/{relacionado_id}", response_model=schemas.PersonaRelacionadaOut)
def actualizar_persona_relacionada(
    accionista_id: int,
    relacionado_id: int,
    datos: schemas.PersonaRelacionadaUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    relacionado = db.query(models.PersonaRelacionada).filter(
        models.PersonaRelacionada.id == relacionado_id,
        models.PersonaRelacionada.accionista_id == accionista_id
    ).first()
    
    if not relacionado:
        raise HTTPException(status_code=404, detail="Relación no encontrada")
        
    update_data = datos.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(relacionado, key, value)
        
    db.commit()
    db.refresh(relacionado)
    return relacionado

@router.delete("/accionistas/{accionista_id}/relacionados/{relacionado_id}")
def eliminar_persona_relacionada(
    accionista_id: int,
    relacionado_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    relacionado = db.query(models.PersonaRelacionada).filter(
        models.PersonaRelacionada.id == relacionado_id,
        models.PersonaRelacionada.accionista_id == accionista_id
    ).first()
    
    if not relacionado:
        raise HTTPException(status_code=404, detail="Relación no encontrada")
        
    db.delete(relacionado)
    db.commit()
    return {"mensaje": "Vínculo eliminado correctamente"}

@router.get("/consultar-vinculo/{documento}", response_model=List[schemas.AccionistaOut])
def consultar_vinculo_por_documento(documento: str, db: Session = Depends(database.get_db)):
    """
    Busca una identificación en:
    1. Titulares (Accionistas)
    2. Representantes Legales
    3. Personas Relacionadas (Hijos, Herederos, etc.)
    Devuelve la información del accionista vinculado.
    """
    config = db.query(models.ParametrosAsamblea).first()
    periodo = config.periodo_activo if config else "2025"
    
    # 1. Buscar como titular
    titulares = db.query(models.Accionista).filter(
        models.Accionista.periodo == periodo,
        models.Accionista.num_doc == documento
    ).all()
    
    # 2. Buscar como representante
    reps = db.query(models.Accionista).join(models.Representante).filter(
        models.Accionista.periodo == periodo,
        models.Representante.identificacion == documento
    ).all()
    
    # 3. Buscar como relacionado
    relacionados = db.query(models.Accionista).join(models.PersonaRelacionada).filter(
        models.Accionista.periodo == periodo,
        models.PersonaRelacionada.num_doc == documento
    ).all()
    
    # Combinar resultados sin duplicados
    resultados_dict = {acc.id: acc for acc in (titulares + reps + relacionados)}
    resultados = list(resultados_dict.values())
    
    if not resultados:
        raise HTTPException(status_code=404, detail="No se encontró ningún vínculo con este documento")
        
    return resultados

@router.get("/relacionados-global/", response_model=List[schemas.PersonaRelacionadaFullOut])
def listar_todos_los_relacionados(
    skip: int = 0,
    limit: int = 100,
    busqueda: Optional[str] = None,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    config = db.query(models.ParametrosAsamblea).first()
    periodo = config.periodo_activo if config else "2025"
    
    query = db.query(models.PersonaRelacionada).filter(models.PersonaRelacionada.periodo == periodo)
    
    if busqueda:
        query = query.filter(
            (models.PersonaRelacionada.nombre.ilike(f"%{busqueda}%")) |
            (models.PersonaRelacionada.num_doc.ilike(f"%{busqueda}%"))
        )
        
    return query.offset(skip).limit(limit).all()

@router.get("/representantes-global/", response_model=List[schemas.RepresentanteOut])
def listar_todos_los_representantes(
    skip: int = 0,
    limit: int = 100,
    busqueda: Optional[str] = None,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    # Los representantes no tienen campo periodo directamente, pero sus titulares sí
    config = db.query(models.ParametrosAsamblea).first()
    periodo = config.periodo_activo if config else "2025"
    
    query = db.query(models.Representante).join(models.Accionista).filter(models.Accionista.periodo == periodo)
    
    if busqueda:
        query = query.filter(
            (models.Representante.nombre.ilike(f"%{busqueda}%")) |
            (models.Representante.identificacion.ilike(f"%{busqueda}%"))
        )
        
    return query.offset(skip).limit(limit).all()

# ==========================================
# ENDPOINT: DESCARGAR PLANTILLA EXCEL
# ==========================================
@router.get("/plantilla")
def descargar_plantilla():
    # Crear un DataFrame vacío con las columnas esperadas
    columnas = [
        "numero_accionista", 
        "nombre_titular", 
        "tipo_doc", 
        "num_doc", 
        "correo", 
        "telefono", 
        "total_acciones", 
        "porcentaje_base",
        "vinculo_nombre",
        "vinculo_doc",
        "vinculo_tipo",
        "vinculo_tiene_poder"
    ]
    df = pd.DataFrame(columns=columnas)
    
    # --- AÑADIR FILA DE EJEMPLO ---
    ejemplo = {
        "numero_accionista": 1,
        "nombre_titular": "EJEMPLO: JUAN PEREZ",
        "tipo_doc": "c",
        "num_doc": "0123456789",
        "correo": "juan@ejemplo.com",
        "telefono": "0999999999",
        "total_acciones": 100,
        "porcentaje_base": 0.5,
        "vinculo_nombre": "MARIA PEREZ (EJEMPLO HIJA)",
        "vinculo_doc": "0987654321",
        "vinculo_tipo": "H",
        "vinculo_tiene_poder": "NO"
    }
    df.loc[0] = ejemplo
    
    # Crear un buffer en memoria para el archivo Excel
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Plantilla Accionistas')
        
        # Opcional: Ajustar el ancho de las columnas
        worksheet = writer.sheets['Plantilla Accionistas']
        for i, col in enumerate(df.columns):
            worksheet.column_dimensions[chr(65 + i)].width = 25
            
    output.seek(0)
    
    # Retornar como un archivo descargable
    return StreamingResponse(
        output, 
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=plantilla_accionistas.xlsx"}
    )

# ==========================================
# ENDPOINT: IMPORTACIÓN MASIVA (EXCEL/CSV)
# ==========================================
@router.post("/importar", status_code=status.HTTP_201_CREATED)
async def importar_accionistas(
    file: UploadFile = File(...),
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    if not (file.filename.endswith('.xlsx') or file.filename.endswith('.csv')): # type: ignore
        raise HTTPException(status_code=400, detail="Formato de archivo inválido. Utilice .xlsx o .csv")
        
    configuracion = db.query(models.ParametrosAsamblea).first()
    periodo_actual = configuracion.periodo_activo if configuracion else "2025"

    try:
        contents = await file.read()
        if file.filename.endswith('.csv'): # type: ignore
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))
            
        # Reemplazar NaN por None
        df = df.where(pd.notnull(df), None)
        
        # OBTENER CONFIGURACIÓN PARA MODO DE IMPORTACIÓN
        config = db.query(models.ParametrosAsamblea).first()
        sobrescribir = config.sobrescribir_importacion if config else False

        if sobrescribir:
            # ELIMINAR TODO LO EXISTENTE PARA EL PERIODO (Cascada manejará representantes/asistencias/relacionados)
            db.query(models.Accionista).filter(models.Accionista.periodo == periodo_actual).delete()
            db.commit()
            current_sum_db = 0.0
            existing_nums = set()
        else:
            # MODO INCREMENTAL: VALIDAR TOPE DEL 100%
            current_sum_db = db.query(func.sum(models.Accionista.porcentaje_base))\
                .filter(models.Accionista.periodo == periodo_actual).scalar() or 0.0
                
            existing_nums = {n[0] for n in db.query(models.Accionista.numero_accionista)\
                            .filter(models.Accionista.periodo == periodo_actual).all()}

            # CALCULAR SUMA DE NUEVOS REGISTROS ÚNICOS EN EL ARCHIVO
            total_nuevos_porcentaje = 0.0
            vistos_en_archivo = set()
            for _, row in df.iterrows():
                num_acc = row.get('numero_accionista')
                if num_acc and not pd.isna(num_acc):
                    num_acc_int = int(num_acc)
                    if num_acc_int not in existing_nums and num_acc_int not in vistos_en_archivo:
                        total_nuevos_porcentaje += float(row.get('porcentaje_base', 0.0))
                        vistos_en_archivo.add(num_acc_int)

            if (current_sum_db + total_nuevos_porcentaje) > 100.005:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Error: La suma total de accionariado ({round(current_sum_db + total_nuevos_porcentaje, 2)}%) superaría el 100%. Actualmente hay {round(current_sum_db, 2)}% en el sistema. Por favor revise su plantilla."
                )

        exitosos = 0
        errores = []
        
        for index, row in df.iterrows():
            try:
                num_acc = row.get('numero_accionista')
                num_doc = row.get('num_doc')

                # Intentar buscar al accionista por número de accionista o por documento (el que venga)
                accionista_obj = None
                
                # 1. Por Número de Accionista
                if num_acc and not pd.isna(num_acc):
                    accionista_obj = db.query(models.Accionista).filter(
                        models.Accionista.numero_accionista == int(num_acc),
                        models.Accionista.periodo == periodo_actual
                    ).first()
                
                # 2. Por Documento (si no se encontró por número o si no se envió número)
                if not accionista_obj and num_doc:
                    num_doc_str = str(num_doc).strip().split('.')[0]
                    accionista_obj = db.query(models.Accionista).filter(
                        models.Accionista.num_doc == num_doc_str,
                        models.Accionista.periodo == periodo_actual
                    ).first()
                
                if not accionista_obj:
                    # SI NO EXISTE, VALIDAR REQUISITOS MÍNIMOS PARA CREAR
                    if not num_acc or pd.isna(num_acc):
                        errores.append(f"Fila {index+2}: El accionista no existe y falta numero_accionista para crearlo.")
                        continue
                    
                    if not row.get('nombre_titular') or pd.isna(row.get('nombre_titular')):
                        errores.append(f"Fila {index+2}: Faltan datos básicos para crear al accionista (nombre).")
                        continue

                    # Validar duplicados de documento SOLO si es nuevo
                    num_doc_str = str(num_doc).strip().split('.')[0] if num_doc else None
                    if num_doc_str:
                        existe_doc = db.query(models.Accionista).filter(models.Accionista.num_doc == num_doc_str).first()
                        if existe_doc:
                            errores.append(f"Fila {index+2}: El documento {num_doc_str} ya pertenece a otro socio (#{existe_doc.numero_accionista})")
                            continue
                    
                    # Crear el accionista nuevo
                    accionista_obj = models.Accionista(
                        periodo=periodo_actual,
                        numero_accionista=int(num_acc),
                        nombre_titular=str(row.get('nombre_titular', '')).strip(),
                        tipo_doc=str(row.get('tipo_doc', 'c')).strip(),
                        num_doc=num_doc_str,
                        correo=str(row.get('correo')).strip() if row.get('correo') else None,
                        telefono=str(row.get('telefono')).strip() if row.get('telefono') else None,
                        total_acciones=int(row.get('total_acciones', 0)),
                        porcentaje_base=float(row.get('porcentaje_base', 0.0))
                    )
                    db.add(accionista_obj)
                    db.flush()
                    exitosos += 1
                else:
                    # Si ya existe, podemos opcionalmente actualizar datos si vienen en la fila
                    if row.get('nombre_titular') and not pd.isna(row.get('nombre_titular')):
                        accionista_obj.nombre_titular = str(row.get('nombre_titular')).strip()
                    # (Podríamos actualizar más campos aquí si se desea)

                
                # --- PROCESAR VÍNCULO (Si existe en la fila) ---
                v_nombre = row.get('vinculo_nombre')
                v_tipo_nombre = row.get('vinculo_tipo')
                
                if v_nombre and v_tipo_nombre and not pd.isna(v_nombre) and not pd.isna(v_tipo_nombre):
                    v_tipo_str = str(v_tipo_nombre).strip()
                    # Buscar el tipo de vínculo por nombre o abreviatura (case insensitive)
                    tipo_v = db.query(models.TipoVinculo).filter(
                        (models.TipoVinculo.nombre.ilike(v_tipo_str)) |
                        (models.TipoVinculo.abreviatura.ilike(v_tipo_str))
                    ).first()
                    
                    if tipo_v:
                        v_doc = str(row.get('vinculo_doc', '')).strip().split('.')[0] if not pd.isna(row.get('vinculo_doc')) else None
                        grupos_vinculo = (tipo_v.grupo or "").split(',')
                        
                        if "representante" in grupos_vinculo:
                            # Validar que no exista ya este representante para este socio para evitar duplicar en re-importaciones
                            rep_existente = db.query(models.Representante).filter(
                                models.Representante.accionista_id == accionista_obj.id,
                                models.Representante.identificacion == (v_doc or "N/A")
                            ).first()
                            
                            if not rep_existente:
                                tiene_poder = str(row.get('vinculo_tiene_poder', '')).lower() in ['si', 'sí', 'true', '1', 'x']
                                nuevo_rep = models.Representante(
                                    accionista_id=accionista_obj.id,
                                    nombre=str(v_nombre).strip(),
                                    identificacion=v_doc or "N/A",
                                    tipo_id=tipo_v.id,
                                    tiene_poder_firmado=tiene_poder
                                )
                                db.add(nuevo_rep)
                        elif "familiar" in grupos_vinculo:
                            # Es un familiar o heredero
                            rel_existente = db.query(models.PersonaRelacionada).filter(
                                models.PersonaRelacionada.accionista_id == accionista_obj.id,
                                models.PersonaRelacionada.nombre == str(v_nombre).strip()
                            ).first()
                            
                            if not rel_existente:
                                nuevo_rel = models.PersonaRelacionada(
                                    accionista_id=accionista_obj.id,
                                    periodo=periodo_actual,
                                    nombre=str(v_nombre).strip(),
                                    tipo_doc="Cedula",
                                    num_doc=v_doc,
                                    tipo_vinculo_id=tipo_v.id
                                )
                                db.add(nuevo_rel)
                
            except Exception as e:
                db.rollback() 
                errores.append(f"Fila {index+2}: Error procesando datos - {str(e)}")
                db = next(database.get_db())
                
        # Commit final de todos los registros exitosos
        if exitosos > 0:
            db.commit()
            
            # Log de importación
            db.add(models.Log(
                nivel="INFO",
                origen="SISTEMA",
                accion="IMPORTACION_MASIVA",
                mensaje=f"Se importaron {exitosos} accionistas exitosamente. Archivo: {file.filename}",
                usuario_id=current_user.id
            ))
            db.commit()
            
        return {
            "mensaje": f"Importación finalizada. {exitosos} registros exitosos.",
            "exitosos": exitosos,
            "errores": errores
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error procesando el archivo: {str(e)}")

# ==========================================
# ENDPOINT: ELIMINAR ACCIONISTA (ADMIN)
# ==========================================
@router.delete("/accionistas/{accionista_id}")
def eliminar_accionista(
    accionista_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    accionista = db.query(models.Accionista).filter(models.Accionista.id == accionista_id).first()
    if not accionista:
        raise HTTPException(status_code=404, detail="Accionista no encontrado")
        
    db.delete(accionista)
    db.commit()
    
    return {"mensaje": "Accionista y todas sus relaciones fueron eliminados correctamente"}

@router.post("/limpiar", status_code=status.HTTP_200_OK)
def limpiar_accionistas(
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    """Borra todos los accionistas y sus datos relacionados para el periodo actual"""
    # Solo administradores
    rol_nombre = current_user.rol.nombre.lower() if current_user.rol else ""
    if current_user.rol_id not in [0, 1] and rol_nombre not in ["administrador", "admin"]:
        raise HTTPException(status_code=403, detail="No tienes permisos para limpiar la base de datos.")
    
    config = db.query(models.ParametrosAsamblea).first()
    periodo_actual = config.periodo_activo if config else "2025"
    
    # Eliminar accionistas (Cascada borrará representantes, asistencias, relacionados)
    try:
        db.query(models.Accionista).filter(models.Accionista.periodo == periodo_actual).delete()
        
        db.add(models.Log(
            nivel="WARNING",
            origen="USUARIO",
            accion="CLEAN_ACCIONISTAS",
            mensaje=f"Base de accionistas del periodo {periodo_actual} borrada totalmente por {current_user.email}",
            usuario_id=current_user.id
        ))
        
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al limpiar la base: {str(e)}")
        
    return {"mensaje": f"Se han eliminado todos los registros del periodo {periodo_actual} exitosamente."}
# ==========================================
# ENDPOINTS: COMUNICACIÓN MASIVA (EMAIL)
# ==========================================

@router.get("/comunicacion/destinatarios-count")
def obtener_conteo_destinatarios(
    filtro: str = "todos",
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    config = db.query(models.ParametrosAsamblea).first()
    periodo = config.periodo_activo if config else "2025"
    
    query = db.query(models.Accionista).filter(
        models.Accionista.periodo == periodo,
        models.Accionista.correo != None
    )
    
    if filtro == "asistentes":
        query = query.join(models.Asistencia).filter(models.Asistencia.asistio == True)
    elif filtro == "naturales":
        query = query.filter(models.Accionista.tipo_doc == "c")
    elif filtro == "juridicas":
        query = query.filter(models.Accionista.tipo_doc == "r")
        
    count = query.count()
    return {"count": count}

@router.get("/comunicacion/destinatarios-list", response_model=List[schemas.DestinatarioListItem])
def listar_destinatarios(
    filtro: str = "todos",
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    config = db.query(models.ParametrosAsamblea).first()
    periodo = config.periodo_activo if config else "2025"
    
    query = db.query(models.Accionista).filter(
        models.Accionista.periodo == periodo,
        models.Accionista.correo != None
    )
    
    if filtro == "asistentes":
        query = query.join(models.Asistencia).filter(models.Asistencia.asistio == True)
    elif filtro == "naturales":
        query = query.filter(models.Accionista.tipo_doc == "c")
    elif filtro == "juridicas":
        query = query.filter(models.Accionista.tipo_doc == "r")
        
    return query.all()

@router.post("/comunicacion/enviar-masivo")
def enviar_correo_masivo_accionistas(
    datos: schemas.EnvioMasivoRequest,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    config = db.query(models.ParametrosAsamblea).first()
    periodo_actual = config.periodo_activo if config else "2025"

    if datos.ids_accionistas:
        query = db.query(models.Accionista).filter(
            models.Accionista.id.in_(datos.ids_accionistas),
            models.Accionista.periodo == periodo_actual
        )
    else:
        query = db.query(models.Accionista).filter(
            models.Accionista.correo != None,
            models.Accionista.periodo == periodo_actual
        )
        
        if datos.filtro == "asistentes":
            query = query.join(models.Asistencia).filter(models.Asistencia.asistio == True)
        elif datos.filtro == "naturales":
            query = query.filter(models.Accionista.tipo_doc == "c")
        elif datos.filtro == "juridicas":
            query = query.filter(models.Accionista.tipo_doc == "r")
        
    destinatarios = query.all()
    exitosos = 0
    fallidos = 0
    
    # Obtener firma del usuario (personal) o global
    firma_usuario = current_user.firma_email
    if not firma_usuario:
        config_asamblea = db.query(models.ParametrosAsamblea).first()
        firma_usuario = config_asamblea.firma_email if config_asamblea else ""

    for acc in destinatarios:
        # Adjuntar firma al mensaje
        mensaje_con_firma = f"{datos.mensaje}<br><br>{firma_usuario}"
        res = utils.enviar_correo_general(acc.correo, datos.asunto, mensaje_con_firma, db) # type: ignore
        if res:
            exitosos += 1
        else:
            fallidos += 1
            
    # Log global
    db.add(models.Log(
        nivel="INFO", 
        origen="SISTEMA", 
        accion="ENVIO_MASIVO_GLOBAL", 
        mensaje=f"Envío masivo finalizado. Exitosos: {exitosos}, Fallidos: {fallidos}. Asunto: {datos.asunto}",
        usuario_id=current_user.id
    ))
    db.commit()
    
    return {
        "mensaje": "Proceso de envío finalizado",
        "total_procesados": len(destinatarios),
        "exitosos": exitosos,
        "fallidos": fallidos
    }

# ==========================================
# ENDPOINTS: REPORTERÍA / EXPORTACIÓN
# ==========================================

@router.get("/reportes/padron")
def exportar_padron_accionistas(
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    config = db.query(models.ParametrosAsamblea).first()
    periodo = config.periodo_activo if config else "2025"
    
    accionistas = db.query(models.Accionista).filter(models.Accionista.periodo == periodo).all()
    
    data = []
    for acc in accionistas:
        data.append({
            "Nº Accionista": acc.numero_accionista,
            "Nombre Titular": acc.nombre_titular,
            "Tipo Doc": acc.tipo_doc,
            "Num Doc": acc.num_doc,
            "Correo": acc.correo,
            "Teléfono": acc.telefono,
            "Total Acciones": acc.total_acciones,
            "% Participación": acc.porcentaje_base
        })
    
    df = pd.DataFrame(data)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Padrón de Accionistas')
    
    output.seek(0)
    return StreamingResponse(
        output, 
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=Padron_Accionistas_{periodo}.xlsx"}
    )

@router.get("/reportes/asistencia")
def exportar_asistencia(
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    config = db.query(models.ParametrosAsamblea).first()
    periodo = config.periodo_activo if config else "2025"
    
    # Unir asistencias con accionistas
    asistencias = db.query(models.Asistencia).join(models.Accionista).filter(models.Asistencia.periodo == periodo).all()
    
    data = []
    for asis in asistencias:
        acc = asis.accionista
        data.append({
            "Nº Accionista": acc.numero_accionista,
            "Nombre Titular": acc.nombre_titular,
            "Asistió": "SÍ" if asis.asistio else "NO",
            "Hora Registro": asis.hora_registro.strftime("%Y-%m-%d %H:%M:%S") if asis.hora_registro else "N/A",
            "Es Titular": "SÍ" if asis.es_titular else "NO",
            "Asistente Nombre": asis.asistente_nombre,
            "Asistente Doc": asis.asistente_identificacion,
            "Fuera de Quórum": "SÍ" if asis.fuera_de_quorum else "NO",
            "Registrado Por": asis.registrado_por,
            "Observaciones": asis.observaciones
        })
    
    df = pd.DataFrame(data)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Listado de Asistencia')
    
    output.seek(0)
    return StreamingResponse(
        output, 
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=Asistencia_Asamblea_{periodo}.xlsx"}
    )

@router.get("/reportes/quorum")
def exportar_quorum_detallado(
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    config = db.query(models.ParametrosAsamblea).first()
    periodo = config.periodo_activo if config else "2025"
    
    # Obtener el quórum calculado
    total_quorum_asamblea = db.query(func.sum(models.Accionista.porcentaje_base))\
        .join(models.Asistencia)\
        .filter(models.Asistencia.asistio == True)\
        .filter(models.Asistencia.fuera_de_quorum == False).scalar() or 0.0
    
    # Obtener lista de asistentes que conforman el quórum
    asistentes = db.query(models.Accionista).join(models.Asistencia).filter(
        models.Asistencia.asistio == True,
        models.Asistencia.fuera_de_quorum == False,
        models.Accionista.periodo == periodo
    ).all()
    
    data = []
    for acc in asistentes:
        asis = db.query(models.Asistencia).filter(models.Asistencia.accionista_id == acc.id).first()
        data.append({
            "Nº Accionista": acc.numero_accionista,
            "Nombre Titular": acc.nombre_titular,
            "Identificación Titular": acc.num_doc,
            "Total Acciones": acc.total_acciones,
            "% Participación (Base 100%)": acc.porcentaje_base,
            "% Peso en Quórum Actual": (acc.porcentaje_base / total_quorum_asamblea * 100) if total_quorum_asamblea > 0 else 0,
            "Persona que firmó": asis.asistente_nombre if asis else "N/A",
            "Identificación Firma": asis.asistente_identificacion if asis else "N/A",
            "Hora Ingreso": asis.hora_registro.strftime("%Y-%m-%d %H:%M:%S") if asis and asis.hora_registro else "N/A"
        })
    
    df = pd.DataFrame(data)
    
    # Añadir fila de resumen
    resumen = pd.DataFrame([{
        "Nº Accionista": "TOTAL",
        "Nombre Titular": f"{len(asistentes)} SOCIOS",
        "Total Acciones": sum([acc.total_acciones for acc in asistentes]),
        "% Participación (Base 100%)": total_quorum_asamblea,
        "% Peso en Quórum Actual": 100.0 if total_quorum_asamblea > 0 else 0
    }])
    df = pd.concat([df, resumen], ignore_index=True)
    
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Quórum Presente')
    
    output.seek(0)
    return StreamingResponse(
        output, 
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=Reporte_Quorum_{periodo}.xlsx"}
    )
