from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password = Column(String)
    role = Column(String, default="client")  # "client" или "admin"
    results = relationship("Result", back_populates="user", cascade="all, delete-orphan")


class Tag(Base):
    __tablename__ = "tags"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)


class TestTag(Base):
    __tablename__ = "test_tags"
    test_id = Column(Integer, ForeignKey("tests.id", ondelete="CASCADE"), primary_key=True)
    tag_id = Column(Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True)


class Test(Base):
    __tablename__ = "tests"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    questions = relationship("Question", back_populates="test", cascade="all, delete-orphan")
    tags = relationship("Tag", secondary="test_tags")


class Question(Base):
    __tablename__ = "questions"
    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(Integer, ForeignKey("tests.id"))
    text = Column(String)
    question_type = Column(String, default="single")  # "single" или "multi"
    # Варианты ответов хранятся в отдельной таблице
    options = relationship("QuestionOption", back_populates="question", cascade="all, delete-orphan")
    test = relationship("Test", back_populates="questions")


class QuestionOption(Base):
    __tablename__ = "question_options"
    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id"))
    text = Column(String)
    is_correct = Column(Boolean, default=False)
    order = Column(Integer, default=0)
    question = relationship("Question", back_populates="options")


class Result(Base):
    __tablename__ = "results"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    test_id = Column(Integer, ForeignKey("tests.id"), nullable=True)
    # Снапшот названия теста и количества вопросов — на случай если тест удалят
    test_title_snapshot = Column(String)
    total_questions_snapshot = Column(Integer)
    score = Column(Integer)
    user = relationship("User", back_populates="results")
