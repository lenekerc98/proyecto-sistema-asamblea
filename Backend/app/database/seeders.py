from sqlalchemy.orm import Session
from . import models

def seed_templates(db: Session):
    # Template para el Acta de Asamblea
    acta = db.query(models.PlantillaReporte).filter(models.PlantillaReporte.slug == 'acta').first()
    if not acta:
        html_acta = """
        <html>
        <head>
            <style>
                @page { size: letter; margin: 2cm; }
                body { font-family: Arial, sans-serif; font-size: 11px; }
                .header { text-align: center; margin-bottom: 20px; }
                .title { font-size: 16px; font-weight: bold; color: #1a365d; text-transform: uppercase; }
                .section-title { font-size: 12px; font-weight: bold; margin-top: 15px; border-bottom: 1px solid #ddd; padding-bottom: 5px; color: #2c5282; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th, td { border: 1px solid #e2e8f0; padding: 6px; text-align: left; }
                th { background-color: #f7fafc; color: #4a5568; }
                .footer { position: fixed; bottom: 0; width: 100%; text-align: center; font-size: 10px; color: #718096; }
                .result-row { border-left: 3px solid #6366f1; background-color: #f8fafc; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="title">Acta de Asamblea Ordinaria</div>
                <div style="font-size: 12px; margin-top: 5px;">Periodo Operativo: {{ periodo }}</div>
            </div>

            <div class="section-title">Información General</div>
            <table>
                <tr>
                    <th width="30%">Fecha y Hora Generación:</th>
                    <td>{{ fecha }}</td>
                </tr>
                <tr>
                    <th>Quórum Inicial:</th>
                    <td>{{ quorum_inicial }}%</td>
                </tr>
            </table>

            <div class="section-title">Escrutinio y Resultados de Votaciones</div>
            {% for pregunta in preguntas %}
                <div style="margin-top: 15px;">
                    <strong>PREGUNTA {{ loop.index }}: {{ pregunta.enunciado }}</strong><br/>
                    <small>Estado: {{ pregunta.estado.upper() }}</small>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th width="70%">Opción</th>
                            <th width="15%">Votos</th>
                            <th width="15%">%</th>
                        </tr>
                    </thead>
                    <tbody>
                        {% for r in pregunta.resultados %}
                        <tr>
                            <td>{{ r.opcion }}</td>
                            <td align="center">{{ r.votos_count }}</td>
                            <td align="center">{{ r.porcentaje_total }}%</td>
                        </tr>
                        {% endfor %}
                    </tbody>
                </table>
            {% endfor %}

            <div class="footer">
                Sistema de Asamblea Digital - Documento generado automáticamente para fines oficiales.
            </div>
        </body>
        </html>
        """
        acta = models.PlantillaReporte(
            slug='acta',
            nombre='Acta Resumen de Asamblea',
            contenido_html=html_acta,
            pie_pagina='Sistema de Asamblea v2.0'
        )
        db.add(acta)
        db.commit()
