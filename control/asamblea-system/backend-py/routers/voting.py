from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import crud, schemas, database, auth, models

router = APIRouter(
    prefix="/voting",
    tags=["voting"],
    responses={404: {"description": "Not found"}},
)

@router.get("/questions", response_model=List[schemas.Question])
def read_questions(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    return crud.get_questions(db)

@router.post("/questions", response_model=schemas.Question)
def create_question(question: schemas.QuestionCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_admin_user)):
    return crud.create_question(db=db, question=question)

@router.put("/questions/{question_id}/status", response_model=schemas.Question)
def update_question_status(question_id: int, status_update: schemas.QuestionUpdateStatus, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_admin_user)):
    return crud.update_question_status(db, question_id, status_update.status)

@router.post("/vote", response_model=schemas.Vote)
def vote(vote: schemas.VoteCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    if not current_user.attendee_id:
        raise HTTPException(status_code=400, detail="User is not linked to an attendee/shareholder.")
    
    # Check if attendee is checked in
    attendee = db.query(models.Attendee).filter(models.Attendee.id == current_user.attendee_id).first()
    if not attendee or not attendee.attended:
         raise HTTPException(status_code=400, detail="Attendee is not checked in.")

    # Check question status
    question = db.query(models.Question).filter(models.Question.id == vote.question_id).first()
    if not question or question.status != "OPEN":
        raise HTTPException(status_code=400, detail="Question is not open for voting.")

    try:
        return crud.create_vote(db, vote, current_user.id, current_user.attendee_id, attendee.shares)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/questions/{question_id}/results", response_model=List[schemas.VoteResult])
def read_results(question_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    return crud.get_vote_results(db, question_id)
