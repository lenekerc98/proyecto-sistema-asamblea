from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models, crud, schemas

def init_db():
    db = SessionLocal()
    try:
        # Create Roles
        roles = ["admin", "shareholder"]
        for role_name in roles:
            existing_role = db.query(models.Role).filter(models.Role.name == role_name).first()
            if not existing_role:
                new_role = models.Role(name=role_name)
                db.add(new_role)
                db.commit()
                print(f"Role '{role_name}' created.")

        # Create Admin User
        admin_role = db.query(models.Role).filter(models.Role.name == "admin").first()
        existing_admin = crud.get_user_by_username(db, "admin")
        if not existing_admin:
            user_in = schemas.UserCreate(
                username="admin",
                password="adminpassword",
                role_id=admin_role.id
            )
            crud.create_user(db, user_in)
            print("Admin user created (username: admin, password: adminpassword)")
        else:
             print("Admin user already exists.")

    finally:
        db.close()

if __name__ == "__main__":
    init_db()
