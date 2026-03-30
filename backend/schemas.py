from pydantic import BaseModel
from typing import List, Optional, Dict


class UserCreate(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    role: str

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class RoleUpdate(BaseModel):
    role: str


# --- Options ---

class OptionOut(BaseModel):
    id: int
    text: str
    is_correct: bool
    order: int

    class Config:
        from_attributes = True


class OptionCreate(BaseModel):
    text: str
    is_correct: bool
    order: int = 0


# --- Questions ---

class QuestionOut(BaseModel):
    id: int
    text: str
    question_type: str
    options: List[OptionOut]

    class Config:
        from_attributes = True


class QuestionCreate(BaseModel):
    text: str
    question_type: str = "single"  # "single" или "multi"
    options: List[OptionCreate]


# --- Tests ---

class TagOut(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class TestOut(BaseModel):
    id: int
    title: str
    tags: List[TagOut] = []

    class Config:
        from_attributes = True


class TestCreate(BaseModel):
    title: str
    questions: List[QuestionCreate]
    tags: List[str] = []  # список названий тегов


class TestDetail(BaseModel):
    id: int
    title: str
    questions: List[QuestionOut]
    tags: List[TagOut] = []

    class Config:
        from_attributes = True


# --- Submit ---

class SubmitAnswer(BaseModel):
    test_id: int
    # Для single: {question_id: "option_id"}
    # Для multi:  {question_id: ["option_id1", "option_id2"]}
    answers: Dict[str, object]


# --- Results ---

class ResultOut(BaseModel):
    id: int
    test_id: Optional[int]
    test_title_snapshot: Optional[str]
    total_questions_snapshot: Optional[int]
    score: int

    class Config:
        from_attributes = True
