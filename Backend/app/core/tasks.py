import asyncio
from datetime import datetime
from sqlalchemy.orm import Session
from ..database import models, session as database
from ..routers import config as config_router

async def verificar_inicio_automatico():
    """
    Tarea en segundo plano que verifica cada minuto si hay alguna asamblea 
    que deba iniciar automáticamente basándose en la fecha límite configurada.
    """
    print("Iniciando monitor de inicio automático de asamblea...")
    while True:
        try:
            # Creamos una nueva sesión para cada verificación
            db = next(database.get_db())
            try:
                # Buscamos la configuración de la asamblea
                conf = db.query(models.ParametrosAsamblea).first()
                
                if conf and not conf.asamblea_iniciada and conf.inicio_automatico and conf.limite_registro_asistencia:
                    ahora = datetime.now()
                    # Si ya pasamos la hora límite, iniciamos la asamblea
                    if ahora >= conf.limite_registro_asistencia:
                        print(f"[{ahora}] Hora límite alcanzada ({conf.limite_registro_asistencia}). Iniciando asamblea automáticamente...")
                        config_router.iniciar_asamblea_core(db, email_usuario="SISTEMA (AUTO-START)")
                        print("Asamblea iniciada automáticamente con éxito.")
            except Exception as e:
                print(f"Error en verificar_inicio_automatico (DB): {str(e)}")
            finally:
                db.close()
        except Exception as e:
            print(f"Error en verificar_inicio_automatico (Loop): {str(e)}")
            
        # Esperar 60 segundos antes de la siguiente verificación
        await asyncio.sleep(60)
