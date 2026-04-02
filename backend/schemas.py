from pydantic import BaseModel, Field, field_validator, model_validator
from typing import List, Optional, Dict
import re


# --- AUTH ---

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=40,
                          description="3–40 символов")
    password: str = Field(..., min_length=6, max_length=40,
                          description="6–40 символов")

    @field_validator("username")
    @classmethod
    def username_strip(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError("Имя пользователя должно быть не менее 3 символов")
        if len(v) > 40:
            raise ValueError("Имя пользователя не более 40 символов")
        return v

    @field_validator("password")
    @classmethod
    def password_strip(cls, v: str) -> str:
        # Не делаем strip для пароля — пробелы в нём допустимы
        if len(v) < 6:
            raise ValueError("Пароль должен быть не менее 6 символов")
        if len(v) > 40:
            raise ValueError("Пароль не более 40 символов")
        return v


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
    text: str = Field(..., min_length=1, max_length=200)
    is_correct: bool
    order: int = 0

    @field_validator("text")
    @classmethod
    def text_strip(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Вариант ответа не может быть пустым")
        if len(v) > 200:
            raise ValueError("Вариант ответа не более 200 символов")
        return v


# --- Questions ---

class QuestionOut(BaseModel):
    id: int
    text: str
    question_type: str
    options: List[OptionOut]

    class Config:
        from_attributes = True


class QuestionCreate(BaseModel):
    text: str = Field(..., min_length=1, max_length=200)
    question_type: str = "single"
    options: List[OptionCreate]

    @field_validator("text")
    @classmethod
    def text_strip(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Текст вопроса не может быть пустым")
        if len(v) > 200:
            raise ValueError("Текст вопроса не более 200 символов")
        return v

    @field_validator("question_type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        if v not in ("single", "multi"):
            raise ValueError("question_type должен быть 'single' или 'multi'")
        return v

    @model_validator(mode="after")
    def validate_options(self) -> "QuestionCreate":
        opts = self.options
        if len(opts) < 2:
            raise ValueError("Вопрос должен содержать минимум 2 варианта ответа")
        if len(opts) > 30:
            raise ValueError("Вопрос может содержать максимум 30 вариантов ответа")
        if not any(o.is_correct for o in opts):
            raise ValueError("В вопросе должен быть хотя бы один правильный ответ")
        return self


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
    title: str = Field(..., min_length=1, max_length=100)
    questions: List[QuestionCreate]
    tags: List[str] = []

    @field_validator("title")
    @classmethod
    def title_strip(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Название теста не может быть пустым")
        if len(v) > 100:
            raise ValueError("Название теста не более 100 символов")
        return v

    @field_validator("tags", mode="before")
    @classmethod
    def normalize_tags(cls, tags: list) -> list:
        result = []
        for t in tags:
            t = str(t).strip().lower()
            if not t:
                continue
            if len(t) > 40:
                raise ValueError(f"Тег «{t[:20]}…» превышает 40 символов")
            result.append(t)
        # убираем дубли, сохраняем порядок
        seen = set()
        return [x for x in result if not (x in seen or seen.add(x))]

    @model_validator(mode="after")
    def validate_questions(self) -> "TestCreate":
        if len(self.questions) < 1:
            raise ValueError("Тест должен содержать хотя бы один вопрос")
        if len(self.questions) > 100:
            raise ValueError("Тест может содержать максимум 100 вопросов")
        return self


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
