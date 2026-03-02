from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from decimal import Decimal

# Token
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# User
class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str
    role_id: int
    attendee_id: Optional[int] = None

class User(UserBase):
    id: int
    role_id: int
    attendee_id: Optional[int]
    created_at: datetime

    class Config:
        orm_mode = True

# Attendee
class AttendeeBase(BaseModel):
    name: str
    identification: str
    shares: int
    percentage: Decimal
    observations: Optional[str] = None

class AttendeeCreate(AttendeeBase):
    pass

class Attendee(AttendeeBase):
    id: int
    attended: bool
    created_at: datetime

    class Config:
        orm_mode = True

class AttendeeCheckIn(BaseModel):
    attended: bool

# Question
class QuestionBase(BaseModel):
    text: str
    order: int = 0

class QuestionCreate(QuestionBase):
    pass

class QuestionUpdateStatus(BaseModel):
    status: str

class Question(QuestionBase):
    id: int
    status: str
    created_at: datetime

    class Config:
        orm_mode = True

# Vote
class VoteCreate(BaseModel):
    question_id: int
    vote_option: str # YES, NO, BLANK, ABSTAIN

class Vote(BaseModel):
    id: int
    question_id: int
    attendee_id: int
    vote_option: str
    recorded_shares: int
    created_at: datetime

    class Config:
        orm_mode = True

class VoteResult(BaseModel):
    vote_option: str
    total_shares: int
    vote_count: int
