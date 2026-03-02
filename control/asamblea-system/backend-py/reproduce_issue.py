
import sys
import os

# Add current directory to sys.path explicitly
current_dir = os.getcwd()
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

print(f"sys.path: {sys.path}")

try:
    print("Attempting to import routers.auth...")
    from routers import auth
    print("Successfully imported routers.auth")
except Exception as e:
    print("Caught exception:")
    import traceback
    traceback.print_exc()
