import sys
import os
import json

backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../Backend'))
sys.path.append(backend_path)

from app.database import session as database
from app.routers.votaciones import obtener_resultados

db = database.SessionProd()
try:
    res = obtener_resultados(pregunta_id=3, db=db)
    print("Resultados:")
    print(res.json())
except Exception as e:
    import traceback
    traceback.print_exc()
