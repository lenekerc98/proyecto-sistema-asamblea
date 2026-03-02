import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from sqlalchemy.orm import Session
from ..database import models
import os

def enviar_correo_clave_temporal(email_destino: str, username: str, clave_temporal: str, db: Session):
    # 1. Obtener configuración
    config = db.query(models.ParametrosMail).first()
    if not config:
        print("No hay configuración de correo. Omitiendo envío.")
        return False

    # 2. Construir el mensaje
    mensaje = MIMEMultipart("alternative")
    mensaje["From"] = config.sender_email
    mensaje["To"] = email_destino
    mensaje["Subject"] = "Credenciales de Acceso - Sistema de Asamblea"

    # Versión Texto Plano
    text = f"""\
    Hola {username},
    Se ha creado una cuenta para ti en el Sistema de Asamblea.
    
    Tu contraseña temporal es: {clave_temporal}
    
    Por favor ingresa al sistema y cámbiala inmediatamente.
    """

    # Versión HTML
    html = f"""\
    <html>
      <body style="font-family: Arial, sans-serif; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #0056b3; text-align: center;">Bienvenido al Sistema de Asamblea</h2>
            <p>Hola <strong>{username}</strong>,</p>
            <p>Se ha generado una contraseña temporal para tu acceso:</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <div style="background-color: #f8f9fa; border: 1px dashed #0056b3; padding: 15px; display: inline-block; font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #333;">
                    {clave_temporal}
                </div>
            </div>
            
            <p>Utiliza esta contraseña para iniciar sesión. El sistema te pedirá cambiarla por una propia.</p>
            
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; text-align: center; color: #999;">Si no solicitaste esta cuenta, ignora este correo.</p>
        </div>
      </body>
    </html>
    """

    mensaje.attach(MIMEText(text, "plain"))
    mensaje.attach(MIMEText(html, "html"))

    # 3. Enviar
    try:
        if config.smtp_port == 465:
            # Puerto 465 usa SSL implícito
            server = smtplib.SMTP_SSL(config.smtp_server, config.smtp_port)
        else:
            # Puerto 587 (u otros) usa STARTTLS explícito
            server = smtplib.SMTP(config.smtp_server, config.smtp_port)
            if config.use_tls:
                server.starttls()

        server.login(config.sender_email, config.sender_password)
        server.sendmail(config.sender_email, email_destino, mensaje.as_string())
        server.quit()
        # LOG EXITOSO
        db.add(models.Log(nivel="INFO", origen="EMAIL", accion="ENVIO_CLAVE", mensaje=f"Correo clave temporal enviado a {email_destino}"))
        db.commit()
        return True
    except Exception as e:
        print(f"Error enviando correo: {e}")
        print(f"Detalle Config: Server={config.smtp_server}, Port={config.smtp_port}, User={config.sender_email}")
        
        # LOG ERROR
        try:
            db.add(models.Log(nivel="ERROR", origen="EMAIL", accion="ERROR_ENVIO", mensaje=f"Falló envío clave temporal a {email_destino}: {str(e)}"))
            db.commit()
        except:
            pass
            
        return False

def enviar_correo_prueba(email_destino: str, db: Session):
    # 1. Obtener configuración
    config = db.query(models.ParametrosMail).first()
    if not config:
        print("No hay configuración de correo. Omitiendo envío.")
        return False

    # 2. Construir el mensaje
    mensaje = MIMEMultipart("alternative")
    mensaje["From"] = config.sender_email
    mensaje["To"] = email_destino
    mensaje["Subject"] = "Prueba de Configuración - Sistema de Asamblea"

    # Versión Texto Plano
    text = """\
    Hola,
    
    Este es un correo de prueba para verificar la configuración del servidor SMTP.
    Si estás leyendo esto, la configuración es correcta.
    """

    # Versión HTML
    html = """\
    <html>
      <body style="font-family: Arial, sans-serif; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #28a745; text-align: center;">¡Configuración Exitosa!</h2>
            <p>Hola,</p>
            <p>Este es un correo de prueba enviado desde el <strong>Sistema de Asamblea</strong>.</p>
            
            <div style="background-color: #d4edda; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;">
                Si estás viendo este mensaje, tu configuración SMTP está funcionando correctamente.
            </div>
            
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; text-align: center; color: #999;">Sistema de Asamblea 2026</p>
        </div>
      </body>
    </html>
    """

    mensaje.attach(MIMEText(text, "plain"))
    mensaje.attach(MIMEText(html, "html"))

    # 3. Enviar
    try:
        if config.smtp_port == 465:
            # Puerto 465 usa SSL implícito
            server = smtplib.SMTP_SSL(config.smtp_server, config.smtp_port)
        else:
            # Puerto 587 (u otros) usa STARTTLS explícito
            server = smtplib.SMTP(config.smtp_server, config.smtp_port)
            if config.use_tls:
                server.starttls()

        server.login(config.sender_email, config.sender_password)
        server.sendmail(config.sender_email, email_destino, mensaje.as_string())
        server.quit()
        # LOG EXITOSO
        db.add(models.Log(nivel="INFO", origen="EMAIL", accion="ENVIO_PRUEBA", mensaje=f"Correo de PRUEBA enviado a {email_destino}"))
        db.commit()
        return True
    except Exception as e:
        print(f"Error enviando correo de prueba: {e}")
        # LOG ERROR
        try:
            db.add(models.Log(nivel="ERROR", origen="EMAIL", accion="ERROR_PRUEBA", mensaje=f"Falló envío prueba a {email_destino}: {str(e)}"))
            db.commit()
        except:
            pass
        raise Exception(f"No se pudo conectar al servidor SMTP: {str(e)}")

def enviar_correo_recuperacion(email_destino: str, username: str, token: str, db: Session):
    # 1. Obtener configuración
    config = db.query(models.ParametrosMail).first()
    if not config:
        print("No hay configuración de correo. Omitiendo envío.")
        return False

    # 2. Construir el mensaje
    mensaje = MIMEMultipart("alternative")
    mensaje["From"] = config.sender_email
    mensaje["To"] = email_destino
    mensaje["Subject"] = "Recuperación de Contraseña - Sistema de Asamblea"

    # Versión Texto Plano
    text = f"""\
    Hola {username},
    
    Has solicitado restablecer tu contraseña.
    
    Tu CÓDIGO de recuperación es: {token}
    
    Si no fuiste tú, ignora este mensaje.
    """

    # Versión HTML
    html = f"""\
    <html>
      <body style="font-family: Arial, sans-serif; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #FFC107; text-align: center;">Recuperación de Contraseña</h2>
            <p>Hola <strong>{username}</strong>,</p>
            <p>Has solicitado restablecer tu contraseña. Utiliza el siguiente código para crear una nueva:</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <div style="background-color: #fff3cd; border: 1px dashed #FFC107; padding: 15px; display: inline-block; font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #856404;">
                    {token}
                </div>
            </div>
            
            <p>Este código expirará pronto. Si no solicitaste este cambio, simplemente ignora este correo y tu contraseña actual seguirá funcionando.</p>
            
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; text-align: center; color: #999;">Sistema de Asamblea 2026</p>
        </div>
      </body>
    </html>
    """

    mensaje.attach(MIMEText(text, "plain"))
    mensaje.attach(MIMEText(html, "html"))

    # 3. Enviar
    try:
        if config.smtp_port == 465:
            # Puerto 465 usa SSL implícito
            server = smtplib.SMTP_SSL(config.smtp_server, config.smtp_port)
        else:
            # Puerto 587 (u otros) usa STARTTLS explícito
            server = smtplib.SMTP(config.smtp_server, config.smtp_port)
            if config.use_tls:
                server.starttls()

        server.login(config.sender_email, config.sender_password)
        server.sendmail(config.sender_email, email_destino, mensaje.as_string())
        server.quit()
        
        # LOG EXITOSO
        db.add(models.Log(nivel="INFO", origen="EMAIL", accion="ENVIO_RECOVERY", mensaje=f"Correo de recuperación enviado a {email_destino}"))
        db.commit()
        return True
    except Exception as e:
        print(f"Error enviando correo de recuperación: {e}")
        # LOG ERROR
        try:
            db.add(models.Log(nivel="ERROR", origen="EMAIL", accion="ERROR_RECOVERY", mensaje=f"Falló envío recuperación a {email_destino}: {str(e)}"))
            db.commit()
        except:
            pass # Si falla el log, no podemos hacer mucho más
        return False

def enviar_correo_creacion_password(email_destino: str, username: str, token: str, db: Session, es_nuevo: bool = True):
    # 1. Obtener configuración
    config = db.query(models.ParametrosMail).first()
    if not config:
        print("No hay configuración de correo. Omitiendo envío.")
        return False

    # Textos Dinámicos
    subject = "Crea tu Nueva Contraseña - Sistema de Asamblea" if es_nuevo else "Actualiza tu Contraseña - Sistema de Asamblea"
    header_title = "Bienvenido al Sistema de Asamblea" if es_nuevo else "Actualización de Contraseña"
    body_text_plain = "Se ha creado una cuenta para ti en el Sistema de Asamblea." if es_nuevo else "Se ha solicitado un cambio de contraseña para tu cuenta."
    body_text_html = "Tu cuenta ha sido creada exitosamente. Para poder acceder, necesitas establecer una contraseña segura." if es_nuevo else "Para restaurar o cambiar el acceso a tu cuenta, por favor actualiza tu contraseña de forma segura."
    button_text = "Crear mi Contraseña" if es_nuevo else "Actualizar mi Contraseña"

    # 2. Construir el mensaje
    mensaje = MIMEMultipart("alternative")
    mensaje["From"] = config.sender_email
    mensaje["To"] = email_destino
    mensaje["Subject"] = subject

    # Se obtiene la URL del frontend desde las variables de entorno
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
    enlace = f"{FRONTEND_URL}/crear-password?token={token}&email={email_destino}"

    # Versión Texto Plano
    text = f"""\
    Hola {username},
    
    {body_text_plain}
    
    Por favor, ingresa al siguiente enlace:
    {enlace}
    
    Si no esperabas esto, ignora este mensaje.
    """

    # Versión HTML
    html = f"""\
    <html>
      <body style="font-family: Arial, sans-serif; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #0d6efd; text-align: center;">{header_title}</h2>
            <p>Hola <strong>{username}</strong>,</p>
            <p>{body_text_html}</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{enlace}" style="background-color: #0d6efd; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">{button_text}</a>
            </div>
            
            <p>Este enlace es válido por 24 horas y solo se puede usar una vez.</p>
            <p>Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
            <p style="font-size: 12px; color: #0d6efd; word-break: break-all;">{enlace}</p>
            
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; text-align: center; color: #999;">Sistema de Asamblea 2026</p>
        </div>
      </body>
    </html>
    """

    mensaje.attach(MIMEText(text, "plain"))
    mensaje.attach(MIMEText(html, "html"))

    # 3. Enviar
    try:
        if config.smtp_port == 465:
            server = smtplib.SMTP_SSL(config.smtp_server, config.smtp_port)
        else:
            server = smtplib.SMTP(config.smtp_server, config.smtp_port)
            if config.use_tls:
                server.starttls()

        server.login(config.sender_email, config.sender_password)
        server.sendmail(config.sender_email, email_destino, mensaje.as_string())
        server.quit()
        
        # LOG EXITOSO
        db.add(models.Log(nivel="INFO", origen="EMAIL", accion="ENVIO_ACCESO", mensaje=f"Correo de acceso enviado a {email_destino}"))
        db.commit()
        return True
    except Exception as e:
        print(f"Error enviando correo de creación: {e}")
        # LOG ERROR
        try:
            db.add(models.Log(nivel="ERROR", origen="EMAIL", accion="ERROR_ACCESO", mensaje=f"Falló envío de acceso a {email_destino}: {str(e)}"))
            db.commit()
        except:
            pass
        return False
def enviar_correo_general(email_destino: str, asunto: str, cuerpo_html: str, db: Session):
    # 1. Obtener configuración
    config = db.query(models.ParametrosMail).first()
    if not config or not config.sender_email:
        return False

    # 2. Construir el mensaje
    mensaje = MIMEMultipart("alternative")
    mensaje["From"] = config.sender_email
    mensaje["To"] = email_destino
    mensaje["Subject"] = asunto

    mensaje.attach(MIMEText(cuerpo_html, "html"))

    # 3. Enviar
    try:
        if config.smtp_port == 465:
            server = smtplib.SMTP_SSL(config.smtp_server, config.smtp_port)
        else:
            server = smtplib.SMTP(config.smtp_server, config.smtp_port)
            if config.use_tls:
                server.starttls()

        server.login(config.sender_email, config.sender_password)
        server.sendmail(config.sender_email, email_destino, mensaje.as_string())
        server.quit()
        
        # LOG
        db.add(models.Log(nivel="INFO", origen="EMAIL", accion="ENVIO_MASIVO", mensaje=f"Correo MASIVO ({asunto}) enviado a {email_destino}"))
        db.commit()
        return True
    except Exception as e:
        print(f"Error enviando correo masivo a {email_destino}: {e}")
        try:
            db.add(models.Log(nivel="ERROR", origen="EMAIL", accion="ERROR_MASIVO", mensaje=f"Falló envío masivo a {email_destino}: {str(e)}"))
            db.commit()
        except:
            pass
        return False

def enviar_notificacion_asamblea_iniciada(email_destino: str, username: str, nombre_asamblea: str, db: Session):
    # 1. Obtener configuración de correo
    config = db.query(models.ParametrosMail).first()
    if not config or not config.sender_email:
        return False

    # 2. Construir el mensaje
    mensaje = MIMEMultipart("alternative")
    mensaje["From"] = config.sender_email
    mensaje["To"] = email_destino
    mensaje["Subject"] = f"Aviso: La {nombre_asamblea} ha iniciado"

    # Cuerpo del correo
    html = f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #28a745; text-align: center;">¡La Asamblea ha Iniciado!</h2>
            <p>Hola <strong>{username}</strong>,</p>
            <p>Le informamos que la <strong>{nombre_asamblea}</strong> ha iniciado oficialmente.</p>
            <p>Ya puede ingresar al sistema para participar en los procesos de votación y seguimiento.</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{os.getenv("FRONTEND_URL", "http://localhost:5173")}" style="background-color: #28a745; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Ingresar al Sistema</a>
            </div>
            
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; text-align: center; color: #999;">Sistema de Asamblea 2026</p>
        </div>
      </body>
    </html>
    """

    mensaje.attach(MIMEText(html, "html"))

    # 3. Enviar
    try:
        if config.smtp_port == 465:
            server = smtplib.SMTP_SSL(config.smtp_server, config.smtp_port)
        else:
            server = smtplib.SMTP(config.smtp_server, config.smtp_port)
            if config.use_tls:
                server.starttls()

        server.login(config.sender_email, config.sender_password)
        server.sendmail(config.sender_email, email_destino, mensaje.as_string())
        server.quit()
        
        # LOG
        db.add(models.Log(nivel="INFO", origen="EMAIL", accion="NOTIFICACION_INICIO", mensaje=f"Notificación de inicio enviada a {email_destino}"))
        db.commit()
        return True
    except Exception as e:
        print(f"Error enviando notificación de inicio a {email_destino}: {e}")
        return False
