from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import crud, schemas, database, auth, models

router = APIRouter(
    prefix="/attendees",
    tags=["attendees"],
    responses={404: {"description": "Not found"}},
)

@router.get("/", response_model=List[schemas.Attendee])
def read_attendees(skip: int = 0, limit: int = 1000, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    attendees = crud.get_attendees(db, skip=skip, limit=limit)
    return attendees

@router.post("/", response_model=schemas.Attendee)
def create_attendee(attendee: schemas.AttendeeCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_admin_user)):
    return crud.create_attendee(db=db, attendee=attendee)

@router.put("/{attendee_id}/checkin", response_model=schemas.Attendee)
def check_in_attendee(attendee_id: int, checkin: schemas.AttendeeCheckIn, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_admin_user)):
    db_attendee = crud.update_attendee_checkin(db, attendee_id=attendee_id, attended=checkin.attended)
    if db_attendee is None:
        raise HTTPException(status_code=404, detail="Attendee not found")
    return db_attendee

@router.get("/quorum")
def read_quorum(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    return crud.get_quorum(db)
