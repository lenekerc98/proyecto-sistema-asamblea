from sqlalchemy.orm import Session
from sqlalchemy import func
import models, schemas
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

# User
def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        username=user.username, 
        password_hash=hashed_password, 
        role_id=user.role_id,
        attendee_id=user.attendee_id
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# Attendee
def get_attendees(db: Session, skip: int = 0, limit: int = 1000):
    return db.query(models.Attendee).order_by(models.Attendee.name).offset(skip).limit(limit).all()

def create_attendee(db: Session, attendee: schemas.AttendeeCreate):
    db_attendee = models.Attendee(**attendee.dict())
    db.add(db_attendee)
    db.commit()
    db.refresh(db_attendee)
    return db_attendee

def update_attendee_checkin(db: Session, attendee_id: int, attended: bool):
    db_attendee = db.query(models.Attendee).filter(models.Attendee.id == attendee_id).first()
    if db_attendee:
        db_attendee.attended = attended
        db.commit()
        db.refresh(db_attendee)
    return db_attendee

def get_quorum(db: Session):
    result = db.query(
        func.sum(models.Attendee.shares).label("total_shares"),
        func.sum(models.Attendee.percentage).label("total_percentage")
    ).filter(models.Attendee.attended == True).first()
    return result

# Question
def get_questions(db: Session):
    return db.query(models.Question).order_by(models.Question.order.asc(), models.Question.created_at.desc()).all()

def create_question(db: Session, question: schemas.QuestionCreate):
    db_question = models.Question(**question.dict())
    db.add(db_question)
    db.commit()
    db.refresh(db_question)
    return db_question

def update_question_status(db: Session, question_id: int, status: str):
    db_question = db.query(models.Question).filter(models.Question.id == question_id).first()
    if db_question:
        db_question.status = status
        db.commit()
        db.refresh(db_question)
    return db_question

# Vote
def create_vote(db: Session, vote: schemas.VoteCreate, user_id: int, attendee_id: int, shares: int):
    # Check if already voted
    existing_vote = db.query(models.Vote).filter(
        models.Vote.question_id == vote.question_id,
        models.Vote.attendee_id == attendee_id
    ).first()
    
    if existing_vote:
        raise ValueError("Vote already cast for this question.")

    db_vote = models.Vote(
        question_id=vote.question_id,
        vote_option=vote.vote_option,
        attendee_id=attendee_id,
        user_id=user_id,
        recorded_shares=shares
    )
    db.add(db_vote)
    db.commit()
    db.refresh(db_vote)
    return db_vote

def get_vote_results(db: Session, question_id: int):
    return db.query(
        models.Vote.vote_option,
        func.sum(models.Vote.recorded_shares).label("total_shares"),
        func.count(models.Vote.id).label("vote_count")
    ).filter(models.Vote.question_id == question_id).group_by(models.Vote.vote_option).all()
