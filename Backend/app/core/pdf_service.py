import io
from xhtml2pdf import pisa
from jinja2 import Template
from sqlalchemy.orm import Session
from ..database import models

class PDFService:
    @staticmethod
    def generate_pdf(template_slug: str, data: dict, db: Session):
        """
        Genera un PDF basado en un slug de plantilla guardada en la Base de Datos.
        """
        plantilla = db.query(models.PlantillaReporte).filter(models.PlantillaReporte.slug == template_slug).first()
        
        if not plantilla:
            raise ValueError(f"No se encontró la plantilla con slug '{template_slug}'")

        # 1. Preparar Jinja2
        template = Template(plantilla.contenido_html)
        
        # 2. Renderizar HTML con los datos
        html_rendered = template.render(**data)
        
        # 3. Convertir HTML a PDF usando xhtml2pdf
        result_bytes = io.BytesIO()
        pisa_status = pisa.CreatePDF(
            io.StringIO(html_rendered),
            dest=result_bytes
        )
        
        if pisa_status.err:
            raise Exception("Error al generar el PDF del reporte.")
        
        result_bytes.seek(0)
        return result_bytes

    @staticmethod
    def get_default_acta_data(db: Session, periodo: str):
        # Lógica para extraer datos reales
        from ..routers.votaciones import obtener_resultados 
        config = db.query(models.ParametrosAsamblea).first()
        preguntas = db.query(models.Pregunta).filter(models.Pregunta.periodo == periodo).order_by(models.Pregunta.numero_orden).all()
        
        preguntas_data = []
        for p in preguntas:
            res = obtener_resultados(p.id, db)
            preguntas_data.append({
                "enunciado": p.enunciado,
                "estado": p.estado,
                "resultados": [
                   {"opcion": r.opcion, "votos_count": r.votos_count, "porcentaje_total": r.porcentaje_total}
                   for r in res.resultados
                ]
            })
            
        from datetime import datetime
        return {
            "periodo": periodo,
            "fecha": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "quorum_inicial": round(config.quorum_final_calculado or 0, 4),
            "preguntas": preguntas_data
        }
