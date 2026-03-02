
try:
    import sys
    import os
    print(f"Current working directory: {os.getcwd()}")
    print(f"sys.path: {sys.path}")
    
    import main
    print("Successfully imported main")
except Exception as e:
    import traceback
    traceback.print_exc()
