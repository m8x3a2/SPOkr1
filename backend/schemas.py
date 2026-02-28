from pydantic import BaseModel
from typing import List

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

class QuestionOut(BaseModel):
    id: int
    text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct: str   # ✅ исправлено: поле correct теперь включено,
                   # иначе при редактировании теста правильный ответ терялся
    class Config:
        from_attributes = True

class QuestionCreate(BaseModel):
    text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct: str

class TestOut(BaseModel):
    id: int
    title: str
    class Config:
        from_attributes = True

class TestCreate(BaseModel):
    title: str
    questions: List[QuestionCreate]

class TestDetail(BaseModel):
    id: int
    title: str
    questions: List[QuestionOut]
    class Config:
        from_attributes = True

class SubmitAnswer(BaseModel):
    test_id: int
    answers: dict  # {question_id: "a"/"b"/"c"/"d"}

class ResultOut(BaseModel):
    test_id: int
    score: int
    class Config:
        from_attributes = True
