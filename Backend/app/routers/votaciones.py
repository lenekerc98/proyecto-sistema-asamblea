from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
import pandas as pd
import io
from datetime import datetime
from typing import List
from ..database import models, session as database, schemas
from ..core import auth

router = APIRouter(
    prefix="/votaciones",
    tags=["Votaciones"]
)

# ==========================================
# GESTIÓN DE PREGUNTAS
# ==========================================

@router.post("/preguntas/", response_model=schemas.PreguntaOut)
def crear_pregunta(
    pregunta: schemas.PreguntaCreate,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    # 1. Obtener Periodo Activo
    config = db.query(models.ParametrosAsamblea).first()
    periodo_actual = config.periodo_activo if config else "2025"

    # 2. Crear la pregunta base
    nueva_p = models.Pregunta(
        periodo=periodo_actual,
        numero_orden=pregunta.numero_orden,
        enunciado=pregunta.enunciado,
        tipo_votacion=pregunta.tipo_votacion,
        estado=pregunta.estado
    )
    db.add(nueva_p)
    db.commit()
    db.refresh(nueva_p)

    # 2. Crear las opciones si existen
    if pregunta.opciones:
        for texto_opc in pregunta.opciones:
            nueva_opc = models.Opcion(pregunta_id=nueva_p.id, texto=texto_opc)
            db.add(nueva_opc)
        db.commit()
        db.refresh(nueva_p)
        
    return nueva_p

@router.get("/preguntas/", response_model=List[schemas.PreguntaOut])
def listar_preguntas(db: Session = Depends(database.get_db)):
    config = db.query(models.ParametrosAsamblea).first()
    periodo = config.periodo_activo if config else "2025"
    return db.query(models.Pregunta).filter(models.Pregunta.periodo == periodo).order_by(models.Pregunta.numero_orden).all()

@router.put("/preguntas/{id}", response_model=schemas.PreguntaOut)
def actualizar_pregunta(
    id: int,
    datos: schemas.PreguntaUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    p = db.query(models.Pregunta).filter(models.Pregunta.id == id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Pregunta no encontrada")
    
    if datos.estado == "activa":
        config = db.query(models.ParametrosAsamblea).first()
        if not config or not config.asamblea_iniciada:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se puede activar la votación porque la asamblea aún no ha sido iniciada oficialmente."
            )

    for key, value in datos.dict(exclude_unset=True).items():
        setattr(p, key, value)
    
    db.commit()
    db.refresh(p)
    return p

@router.delete("/preguntas/{id}")
def eliminar_pregunta(
    id: int,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    p = db.query(models.Pregunta).filter(models.Pregunta.id == id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Pregunta no encontrada")
    db.delete(p)
    db.commit()
    return {"mensaje": "Pregunta eliminada exitosamente"}

# --- ENDPOINTS ADICIONALES PARA OPCIONES ---

@router.post("/preguntas/{pregunta_id}/opciones", response_model=schemas.OpcionOut)
def agregar_opcion(
    pregunta_id: int,
    opcion: schemas.OpcionCreate,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    pregunta = db.query(models.Pregunta).filter(models.Pregunta.id == pregunta_id).first()
    if not pregunta:
        raise HTTPException(status_code=404, detail="Pregunta no encontrada")
    
    nueva_opc = models.Opcion(pregunta_id=pregunta_id, texto=opcion.texto)
    db.add(nueva_opc)
    db.commit()
    db.refresh(nueva_opc)
    return nueva_opc

@router.delete("/opciones/{opcion_id}")
def eliminar_opcion(
    opcion_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    opcion = db.query(models.Opcion).filter(models.Opcion.id == opcion_id).first()
    if not opcion:
        raise HTTPException(status_code=404, detail="Opción no encontrada")
    
    db.delete(opcion)
    db.commit()
    return {"mensaje": "Opción eliminada exitosamente"}

# ==========================================
# REGISTRO DE VOTOS
# ==========================================

@router.post("/votar/", response_model=schemas.VotoOut)
def registrar_voto(
    voto: schemas.VotoCreate,
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    # 1. Verificar si la pregunta existe y está activa
    pregunta = db.query(models.Pregunta).filter(models.Pregunta.id == voto.pregunta_id).first()
    if not pregunta:
        raise HTTPException(status_code=404, detail="Pregunta no encontrada")
    if pregunta.estado != "activa":
        raise HTTPException(status_code=400, detail="La votación no está activa")

    # 2. Verificar si el accionista existe
    accionista = db.query(models.Accionista).filter(models.Accionista.numero_accionista == voto.numero_accionista).first()
    if not accionista:
        raise HTTPException(status_code=404, detail="Accionista no encontrado")

    # 3. Verificar si el accionista está presente y dentro del quórum
    asistencia = db.query(models.Asistencia).filter(models.Asistencia.accionista_id == accionista.id).first()
    if not asistencia or not asistencia.asistio:
        raise HTTPException(status_code=400, detail="El accionista no marcó asistencia")
    if asistencia.fuera_de_quorum:
        raise HTTPException(status_code=403, detail="El accionista llegó tarde y no tiene derecho a voto")

    # 4. Verificar si ya votó en esta pregunta
    voto_existente = db.query(models.Voto).filter(
        models.Voto.pregunta_id == voto.pregunta_id,
        models.Voto.accionista_id == accionista.id
    ).first()
    if voto_existente:
        raise HTTPException(status_code=400, detail="El accionista ya emitió su voto para esta pregunta")

    # Validar que la opción sea válida para esta pregunta
    opciones_validas = [opc.texto.lower() for opc in pregunta.opciones]
    if voto.opcion.lower() not in opciones_validas:
        raise HTTPException(
            status_code=400, 
            detail=f"Opción '{voto.opcion}' no es válida para esta pregunta. Válidas: {opciones_validas}"
        )

    # 5. Calcular peso del voto (Normalización)
    from sqlalchemy import func
    config = db.query(models.ParametrosAsamblea).first()
    if config and config.quorum_final_calculado and config.quorum_final_calculado > 0:
        base_calculo = config.quorum_final_calculado
    else:
        # Calcular quórum en vivo de asistentes actuales
        base_calculo = db.query(func.sum(models.Accionista.porcentaje_base))\
            .join(models.Asistencia)\
            .filter(models.Asistencia.asistio == True)\
            .filter(models.Asistencia.fuera_de_quorum == False).scalar() or 0.0

    if base_calculo == 0:
         raise HTTPException(status_code=400, detail="No hay quórum en sala para realizar la votación")

    peso_normalizado = (accionista.porcentaje_base / base_calculo) * 100

    # 6. Registrar Voto
    periodo_current = config.periodo_activo if config else "2025"
    nuevo_voto = models.Voto(
        periodo=periodo_current,
        pregunta_id=voto.pregunta_id,
        accionista_id=accionista.id,
        opcion=voto.opcion.lower(),
        porcentaje_voto=accionista.porcentaje_base,
        peso_relativo=peso_normalizado
    )
    db.add(nuevo_voto)
    
    # Log
    db.add(models.Log(
        nivel="INFO",
        origen="SISTEMA",
        accion="REGISTRO_VOTO",
        mensaje=f"Accionista {accionista.numero_accionista} votó '{voto.opcion}' en Pregunta {pregunta.id}. Peso: {peso_normalizado}%",
        usuario_id=current_user.id
    ))
    
    db.commit()
    db.refresh(nuevo_voto)
    return nuevo_voto

@router.delete("/restablecer-todos")
def restablecer_todos_votos(
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    if current_user.rol.nombre != "admin":
        raise HTTPException(status_code=403, detail="No tienes permisos para realizar esta acción")
        
    votos_borrados = db.query(models.Voto).delete()
    db.commit()

    db.add(models.Log(
        nivel="WARNING",
        origen="SISTEMA",
        accion="RESTABLECER_VOTOS",
        mensaje=f"Se borraron TODOS los registros de votación ({votos_borrados} votos)",
        usuario_id=current_user.id
    ))
    db.commit()
    
    return {"mensaje": f"Se han eliminado {votos_borrados} registros de votación correctamente."}

# ==========================================
# RESULTADOS
# ==========================================

import unicodedata

def normalizar_texto(texto: str) -> str:
    if not texto: return ""
    # Quitar acentos, pasar a minúsculas y quitar espacios
    s = ''.join(c for c in unicodedata.normalize('NFD', texto) if unicodedata.category(c) != 'Mn')
    return s.lower().strip().replace(" ", "")

@router.get("/resultados/{pregunta_id}", response_model=schemas.ResultadoVotacion)
def obtener_resultados(pregunta_id: int, db: Session = Depends(database.get_db)):
    pregunta = db.query(models.Pregunta).filter(models.Pregunta.id == pregunta_id).first()
    if not pregunta:
        raise HTTPException(status_code=404, detail="Pregunta no encontrada")

    # Necesitamos el quórum final para el cálculo base 100%
    config = db.query(models.ParametrosAsamblea).first()
    quorum_base = config.quorum_final_calculado if (config and config.quorum_final_calculado and config.quorum_final_calculado > 0) else 0

    # Cargar votos con relación al accionista para tener su porcentaje_base original
    votos = db.query(models.Voto).options(joinedload(models.Voto.accionista)).filter(models.Voto.pregunta_id == pregunta_id).all()
    
    res_dict = {}
    mapeo_nombres = {}
    
    for opc in pregunta.opciones:
        norm = normalizar_texto(opc.texto)
        res_dict[norm] = {"count": 0, "porcentaje": 0.0}
        mapeo_nombres[norm] = opc.texto.upper()
        
    for v in votos:
        v_norm = normalizar_texto(v.opcion)
        if v_norm not in res_dict:
            res_dict[v_norm] = {"count": 0, "porcentaje": 0.0}
            mapeo_nombres[v_norm] = v.opcion.upper()
            
        res_dict[v_norm]["count"] += 1
        
        # RECALCULAR PESO EN TIEMPO REAL
        # Usamos el quórum fijo si existe, o calculamos el quórum 'en vivo' si aún no se fijó.
        if quorum_base > 0:
            base_calculo = quorum_base
        else:
            # Calcular quórum en vivo de asistentes actuales
            from sqlalchemy import func
            quorum_vivo = db.query(func.sum(models.Accionista.porcentaje_base))\
                .join(models.Asistencia)\
                .filter(models.Asistencia.asistio == True)\
                .filter(models.Asistencia.fuera_de_quorum == False).scalar() or 0.0
            base_calculo = quorum_vivo if quorum_vivo > 0 else 1.0 # Evitar división por cero

        if v.accionista:
            peso_real = (v.accionista.porcentaje_base / base_calculo) * 100
            res_dict[v_norm]["porcentaje"] += peso_real
        else:
            # Fallback final si la base es anormal
            res_dict[v_norm]["porcentaje"] += v.porcentaje_voto

    resultados_opciones = [
        schemas.ResultadoOpcion(
            opcion=mapeo_nombres[norm_key],
            votos_count=val["count"],
            porcentaje_total=round(val["porcentaje"], 4)
        ) for norm_key, val in res_dict.items()
    ]

    return schemas.ResultadoVotacion(
        pregunta_id=pregunta.id,
        pregunta_enunciado=pregunta.enunciado,
        total_participantes=len(votos),
        resultados=resultados_opciones
    )

from sqlalchemy.orm import joinedload

@router.get("/detalle-votos/{pregunta_id}", response_model=schemas.DetalleVotosRespuesta)
def obtener_detalle_votos(pregunta_id: int, db: Session = Depends(database.get_db)):
    # Usar joinedload para asegurar que la relación 'accionista' esté disponible
    votos = db.query(models.Voto).options(joinedload(models.Voto.accionista)).filter(models.Voto.pregunta_id == pregunta_id).all()
    
    return schemas.DetalleVotosRespuesta(
        pregunta_id=pregunta_id,
        votos=[
            schemas.VotoDetalle(
                accionista_id=v.accionista_id,
                numero_accionista=v.accionista.numero_accionista,
                nombre_titular=v.accionista.nombre_titular,
                opcion=v.opcion,
                porcentaje_voto=v.porcentaje_voto,
                peso_relativo=v.peso_relativo
            ) for v in votos if v.accionista
        ]
    )

# ==========================================
# ENDPOINTS: PORTAL MÓVIL (QR)
# ==========================================

@router.get("/movil/preguntas/{identificacion}", response_model=List[schemas.PreguntaOut])
def listar_preguntas_movil(identificacion: str, db: Session = Depends(database.get_db)):
    # 1. Verificar si la identificación del asistente existe en asistencias
    asistente = db.query(models.Asistencia).filter(models.Asistencia.asistente_identificacion == identificacion).first()
    if not asistente:
        # Intentar buscar por identificación del titular si no se registró asistente diferente
        asistente = db.query(models.Asistencia).join(models.Accionista).filter(
            (models.Asistencia.asistente_identificacion == identificacion) |
            (models.Accionista.identificacion_titular == identificacion)
        ).first()
        
    if not asistente:
        raise HTTPException(status_code=404, detail="No se encontró registro de asistencia para esta identificación")

    # 2. Devolver solo preguntas "activas"
    return db.query(models.Pregunta).filter(models.Pregunta.estado == "activa").order_by(models.Pregunta.numero_orden).all()

@router.post("/movil/votar", response_model=schemas.VotoMovilResponse)
def votar_grupo_movil(datos: schemas.VotoMovilRequest, db: Session = Depends(database.get_db)):
    # 1. Verificar pregunta y sus opciones
    pregunta = db.query(models.Pregunta).filter(models.Pregunta.id == datos.pregunta_id).first()
    if not pregunta or pregunta.estado != "activa":
        raise HTTPException(status_code=400, detail="La pregunta no existe o no está activa")

    # Validar que la opción sea válida para esta pregunta
    opciones_validas = [opc.texto.lower() for opc in pregunta.opciones]
    if datos.opcion.lower() not in opciones_validas:
        raise HTTPException(
            status_code=400, 
            detail=f"Opción '{datos.opcion}' no es válida para esta pregunta. Válidas: {opciones_validas}"
        )

    # 2. Obtener TODAS las asistencias asociadas a esta identificación de asistente
    asistencias = db.query(models.Asistencia).join(models.Accionista).filter(
        (models.Asistencia.asistente_identificacion == datos.asistente_identificacion) |
        ((models.Asistencia.es_titular == True) & (models.Accionista.identificacion_titular == datos.asistente_identificacion))
    ).all()

    if not asistencias:
        raise HTTPException(status_code=404, detail="Asistente no encontrado o no tiene accionistas representados")

    # 3. Validar quórum congelado
    config = db.query(models.ParametrosAsamblea).first()
    if not config or not config.asamblea_iniciada or not config.quorum_final_calculado:
        raise HTTPException(status_code=400, detail="La asamblea no ha sido iniciada con quórum congelado")

    votos_creados = 0
    total_peso = 0.0

    for ast in asistencias:
        if ast.fuera_de_quorum:
            continue
            
        # Verificar si ya votó para esta pregunta
        voto_previo = db.query(models.Voto).filter(
            models.Voto.pregunta_id == datos.pregunta_id,
            models.Voto.accionista_id == ast.accionista_id
        ).first()
        
        if voto_previo:
            continue

        # Calcular peso
        peso = (ast.accionista.porcentaje_base / config.quorum_final_calculado) * 100
        periodo_voto = config.periodo_activo if config else "2025"
        
        nuevo_voto = models.Voto(
            periodo=periodo_voto,
            pregunta_id=datos.pregunta_id,
            accionista_id=ast.accionista_id,
            opcion=datos.opcion.lower(),
            porcentaje_voto=ast.accionista.porcentaje_base,
            peso_relativo=peso
        )
        db.add(nuevo_voto)
        votos_creados += 1
        total_peso += peso

    if votos_creados == 0:
        raise HTTPException(status_code=400, detail="No se procesaron votos (ya votaron o llegaron fuera de quórum)")

    db.add(models.Log(
        nivel="INFO",
        origen="MOVIL",
        accion="VOTO_GRUPAL",
        mensaje=f"Asistente {datos.asistente_identificacion} emitió {votos_creados} votos. Peso total: {round(total_peso, 3)}%"
    ))
    
    db.commit()
    return {
        "mensaje": f"Se han registrado {votos_creados} votos exitosamente",
        "votos_procesados": votos_creados,
        "total_peso": round(total_peso, 3)
    }

@router.get("/movil/info/{identificacion}")
def obtener_informacion_asistente_movil(identificacion: str, db: Session = Depends(database.get_db)):
    # 1. Obtener todas las asistencias del grupo
    asistencias = db.query(models.Asistencia).join(models.Accionista).filter(
        (models.Asistencia.asistente_identificacion == identificacion) |
        ((models.Asistencia.es_titular == True) & (models.Accionista.identificacion_titular == identificacion))
    ).all()
    
    if not asistencias:
        raise HTTPException(status_code=404, detail="No se encontró registro para esta identificación")

    # 2. Resumen
    resumen_accionistas = []
    total_acciones = 0
    total_porcentaje = 0.0
    nombre_asistente = asistencias[0].asistente_nombre or asistencias[0].accionista.nombre_titular

    for ast in asistencias:
        resumen_accionistas.append({
            "numero": ast.accionista.numero_accionista,
            "nombre": ast.accionista.nombre_titular,
            "acciones": ast.accionista.total_acciones,
            "vota": not ast.fuera_de_quorum
        })
        total_acciones += ast.accionista.total_acciones
        total_porcentaje += ast.accionista.porcentaje_base

    return {
        "asistente": nombre_asistente,
        "total_representados": len(asistencias),
        "total_acciones": total_acciones,
        "porcentaje_total_asamblea": round(total_porcentaje, 3),
        "detalle": resumen_accionistas}

@router.get("/reportes/resultados-votacion")
def exportar_votaciones_reporte(
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    config = db.query(models.ParametrosAsamblea).first()
    periodo = config.periodo_activo if config else "2025"
    
    preguntas = db.query(models.Pregunta).filter(models.Pregunta.periodo == periodo).order_by(models.Pregunta.numero_orden).all()
    
    # --- HOJA 1: RESUMEN AGREGADO POR PREGUNTA ---
    resumen_data = []
    
    # --- HOJA 2: DETALLE INDIVIDUAL DE VOTOS ---
    detalle_data = []
    
    for p in preguntas:
        # Obtener resultados agregados (reusando lógica interna o similar)
        res = obtener_resultados(p.id, db)
        
        for r in res.resultados:
            resumen_data.append({
                "Pregunta ID": p.id,
                "Enunciado": p.enunciado,
                "Opción": r.opcion,
                "Votos Cantidad": r.votos_count,
                "% Participación (Base Quórum)": r.porcentaje_total
            })
            
        # Detalle de votos para esta pregunta
        votos = db.query(models.Voto).options(joinedload(models.Voto.accionista)).filter(models.Voto.pregunta_id == p.id).all()
        for v in votos:
            detalle_data.append({
                "Pregunta ID": p.id,
                "Enunciado": p.enunciado,
                "Socio ID": v.accionista.numero_accionista if v.accionista else "N/A",
                "Socio Nombre": v.accionista.nombre_titular if v.accionista else "N/A",
                "Elección": v.opcion.upper(),
                "Acciones": v.porcentaje_voto,
                "% Peso en Votación": v.peso_relativo,
                "Fecha/Hora Voto": v.creado_en.strftime("%Y-%m-%d %H:%M:%S") if hasattr(v, 'creado_en') and v.creado_en else "N/A"
            })
            
    # Crear Excel con dos hojas
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        if resumen_data:
            pd.DataFrame(resumen_data).to_excel(writer, index=False, sheet_name='Resumen de Resultados')
        if detalle_data:
            pd.DataFrame(detalle_data).to_excel(writer, index=False, sheet_name='Detalle de Votos por Socio')
            
    output.seek(0)
    return StreamingResponse(
        output, 
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=Reporte_Votaciones_{periodo}.xlsx"}
    )

from ..core.pdf_service import PDFService
from . import votaciones

@router.get("/reportes/acta")
def exportar_acta_asamblea(
    formato: str = "excel",
    db: Session = Depends(database.get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    from ..database.seeders import seed_templates
    seed_templates(db)
    
    config = db.query(models.ParametrosAsamblea).first()
    periodo = config.periodo_activo if config else "2025"
    
    # PDF BRANCH
    if formato == "pdf":
        try:
            from ..core.pdf_service import PDFService
            data_reporte = PDFService.get_default_acta_data(db, periodo)
            pdf_bytes = PDFService.generate_pdf("acta", data_reporte, db)
            
            return StreamingResponse(
                pdf_bytes,
                media_type="application/pdf",
                headers={"Content-Disposition": f"attachment; filename=Acta_Asamblea_{periodo}.pdf"}
            )
        except Exception as e:
            # Fallback a Excel si PDF falla o falta librería
            print(f"Error PDF: {e}")
            pass

    # EXCEL BRANCH (Existing or fallback)
    fecha = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    quorum_final = config.quorum_final_calculado if config else 0
    
    # 2. Resumen de Preguntas y Resultados
    preguntas = db.query(models.Pregunta).filter(models.Pregunta.periodo == periodo).order_by(models.Pregunta.numero_orden).all()
    
    resumen_data = []
    resumen_data.append({"Concepto": "Título", "Detalle": f"ACTA DE ASAMBLEA ORDINARIA - PERIODO {periodo}"})
    resumen_data.append({"Concepto": "Fecha de Generación", "Detalle": fecha})
    resumen_data.append({"Concepto": "Quórum Congelado al Inicio", "Detalle": f"{round(quorum_final, 4)}%"})
    resumen_data.append({"Concepto": "", "Detalle": ""}) # Espantador
    
    for p in preguntas:
        resumen_data.append({"Concepto": f"PREGUNTA {p.numero_orden}", "Detalle": p.enunciado})
        resumen_data.append({"Concepto": "Estado", "Detalle": p.estado.upper()})
        
        # Resultados de esta pregunta
        res = obtener_resultados(p.id, db)
        for r in res.resultados:
            resumen_data.append({"Concepto": f" - {r.opcion}", "Detalle": f"{r.votos_count} votos ({r.porcentaje_total}%)"})
        resumen_data.append({"Concepto": "", "Detalle": ""})

    df = pd.DataFrame(resumen_data)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Acta de Asamblea')
        
    output.seek(0)
    return StreamingResponse(
        output, 
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=Acta_Asamblea_{periodo}.xlsx"}
    )
