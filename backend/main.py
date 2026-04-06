from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db, engine
import models, schemas, auth

models.Base.metadata.create_all(bind=engine)

app = FastAPI()



app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- AUTH ---

@app.post("/register", response_model=schemas.UserOut)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.username == user.username).first():
        raise HTTPException(409, "Username already taken")
    new_user = models.User(username=user.username, password=auth.hash_password(user.password))
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@app.post("/login", response_model=schemas.Token)
def login(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if not db_user or not auth.verify_password(user.password, db_user.password):
        raise HTTPException(401, "Wrong username or password")
    token = auth.create_token({"sub": db_user.username, "role": db_user.role})
    return {"access_token": token, "token_type": "bearer"}


@app.post("/token", response_model=schemas.Token, include_in_schema=False)
def token_for_swagger(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Служебный эндпоинт для авторизации в Swagger UI (OAuth2 form data)."""
    db_user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not db_user or not auth.verify_password(form_data.password, db_user.password):
        raise HTTPException(401, "Wrong username or password")
    token = auth.create_token({"sub": db_user.username, "role": db_user.role})
    return {"access_token": token, "token_type": "bearer"}

@app.get("/me", response_model=schemas.UserOut)
def me(user: models.User = Depends(auth.get_current_user)):
    return user


# --- TAGS ---

@app.get("/tags")
def get_all_tags(db: Session = Depends(get_db)):
    tags = db.query(models.Tag).all()
    return [{"id": t.id, "name": t.name} for t in tags]


# --- TESTS (public, page size 20) ---
# tags — comma-separated list of tag names, ALL must match (AND logic)

@app.get("/tests")
def get_tests(
    search: Optional[str] = Query(None),
    tags: Optional[str] = Query(None),   # "матан,линал"
    page: int = Query(1, ge=1),
    db: Session = Depends(get_db)
):
    PAGE_SIZE = 20
    query = db.query(models.Test)
    if search:
        query = query.filter(models.Test.title.ilike(f"%{search}%"))
    if tags:
        tag_list = [t.strip().lower() for t in tags.split(",") if t.strip()]
        for tag_name in tag_list:
            query = query.filter(
                models.Test.tags.any(models.Tag.name.ilike(f"%{tag_name}%"))
            )
    total = query.count()
    items = query.offset((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).all()
    return {"items": items, "total": total, "page": page,
            "pages": max(1, (total + PAGE_SIZE - 1) // PAGE_SIZE)}


@app.get("/tests/{test_id}", response_model=schemas.TestDetail)
def get_test(test_id: int, db: Session = Depends(get_db)):
    test = db.query(models.Test).filter(models.Test.id == test_id).first()
    if not test:
        raise HTTPException(404, "Test not found")
    return test


# --- SUBMIT ---

@app.post("/submit", response_model=schemas.ResultOut)
def submit(data: schemas.SubmitAnswer, db: Session = Depends(get_db),
           user: models.User = Depends(auth.get_current_user)):
    test = db.query(models.Test).filter(models.Test.id == data.test_id).first()
    if not test:
        raise HTTPException(404, "Test not found")
    questions = db.query(models.Question).filter(models.Question.test_id == data.test_id).all()
    score = 0
    for q in questions:
        correct_ids = {str(o.id) for o in q.options if o.is_correct}
        user_answer = data.answers.get(str(q.id))
        if q.question_type == "single":
            if str(user_answer) in correct_ids and len(correct_ids) > 0:
                score += 1
        else:
            if isinstance(user_answer, list):
                user_set = {str(a) for a in user_answer}
            else:
                user_set = {str(user_answer)} if user_answer else set()
            if user_set == correct_ids:
                score += 1
    result = models.Result(
        user_id=user.id, test_id=data.test_id,
        test_title_snapshot=test.title, total_questions_snapshot=len(questions), score=score
    )
    db.add(result)
    db.commit()
    db.refresh(result)
    return result


@app.get("/my-results")
def my_results(page: int = Query(1, ge=1), db: Session = Depends(get_db),
               user: models.User = Depends(auth.get_current_user)):
    PAGE_SIZE = 100
    query = db.query(models.Result).filter(
        models.Result.user_id == user.id).order_by(models.Result.id.desc())
    total = query.count()
    items = query.offset((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).all()
    return {"items": items, "total": total, "page": page,
            "pages": max(1, (total + PAGE_SIZE - 1) // PAGE_SIZE)}


@app.get("/my-stats")
def my_stats(db: Session = Depends(get_db), user: models.User = Depends(auth.get_current_user)):
    results = db.query(models.Result).filter(models.Result.user_id == user.id).all()
    if not results:
        return {"total_tests": 0, "total_questions": 0, "total_correct": 0, "avg_pct": 0}
    total_questions = sum(r.total_questions_snapshot or 0 for r in results)
    total_correct = sum(r.score for r in results)
    return {"total_tests": len(results), "total_questions": total_questions,
            "total_correct": total_correct,
            "avg_pct": round(total_correct / total_questions * 100) if total_questions > 0 else 0}


# --- ADMIN HELPERS ---

def _get_or_create_tag(db: Session, name: str) -> models.Tag:
    tag = db.query(models.Tag).filter(models.Tag.name == name.strip().lower()).first()
    if not tag:
        tag = models.Tag(name=name.strip().lower())
        db.add(tag)
        db.flush()
    return tag


def _build_test_from_data(test: models.Test, data: schemas.TestCreate, db: Session):
    test.title = data.title
    test.tags.clear()
    db.flush()
    for tag_name in data.tags:
        if tag_name.strip():
            tag = _get_or_create_tag(db, tag_name)
            test.tags.append(tag)
    test.questions.clear()
    db.flush()
    for q_data in data.questions:
        question = models.Question(test_id=test.id, text=q_data.text, question_type=q_data.question_type)
        db.add(question)
        db.flush()
        for i, opt in enumerate(q_data.options):
            db.add(models.QuestionOption(
                question_id=question.id, text=opt.text, is_correct=opt.is_correct, order=i))
    db.flush()



def _cleanup_orphan_tags(db: Session):
    """Удалить теги, не привязанные ни к одному тесту."""
    used_tag_ids = db.execute(
        models.TestTag.__table__.select().with_only_columns(models.TestTag.__table__.c.tag_id)
    ).scalars().all()
    if used_tag_ids:
        db.query(models.Tag).filter(models.Tag.id.notin_(used_tag_ids)).delete(synchronize_session=False)
    else:
        # Нет ни одной связи — удаляем все теги
        db.query(models.Tag).delete(synchronize_session=False)


# --- ADMIN: TESTS ---

@app.post("/admin/tests", response_model=schemas.TestOut)
def create_test(data: schemas.TestCreate, db: Session = Depends(get_db),
                admin=Depends(auth.require_admin)):
    # Проверка уникальности названия
    existing = db.query(models.Test).filter(
        models.Test.title.ilike(data.title.strip())).first()
    if existing:
        raise HTTPException(409, f"Тест с названием «{data.title.strip()}» уже существует")
    test = models.Test(title=data.title.strip())
    db.add(test)
    db.flush()
    _build_test_from_data(test, data, db)
    db.commit()
    db.refresh(test)
    return test


@app.get("/admin/tests-list")
def admin_tests_list(
    search: Optional[str] = Query(None),
    tags: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    db: Session = Depends(get_db),
    admin=Depends(auth.require_admin)
):
    PAGE_SIZE = 20
    query = db.query(models.Test)
    if search:
        query = query.filter(models.Test.title.ilike(f"%{search}%"))
    if tags:
        tag_list = [t.strip().lower() for t in tags.split(",") if t.strip()]
        for tag_name in tag_list:
            query = query.filter(
                models.Test.tags.any(models.Tag.name.ilike(f"%{tag_name}%"))
            )
    total = query.count()
    items = query.offset((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).all()
    return {"items": items, "total": total, "page": page,
            "pages": max(1, (total + PAGE_SIZE - 1) // PAGE_SIZE)}


@app.get("/admin/tests/{test_id}", response_model=schemas.TestDetail)
def admin_get_test(test_id: int, db: Session = Depends(get_db), admin=Depends(auth.require_admin)):
    test = db.query(models.Test).filter(models.Test.id == test_id).first()
    if not test:
        raise HTTPException(404, "Test not found")
    return test


@app.put("/admin/tests/{test_id}", response_model=schemas.TestOut)
def update_test(test_id: int, data: schemas.TestCreate, db: Session = Depends(get_db),
                admin=Depends(auth.require_admin)):
    test = db.query(models.Test).filter(models.Test.id == test_id).first()
    if not test:
        raise HTTPException(404, "Test not found")
    # Проверка уникальности при переименовании
    existing = db.query(models.Test).filter(
        models.Test.title.ilike(data.title.strip()),
        models.Test.id != test_id
    ).first()
    if existing:
        raise HTTPException(409, f"Тест с названием «{data.title.strip()}» уже существует")
    _build_test_from_data(test, data, db)
    db.commit()
    db.refresh(test)
    return test


@app.delete("/admin/tests/{test_id}")
def delete_test(test_id: int, db: Session = Depends(get_db), admin=Depends(auth.require_admin)):
    test = db.query(models.Test).filter(models.Test.id == test_id).first()
    if not test:
        raise HTTPException(404, "Not found")
    # Обнуляем test_id в results (снапшот названия сохранён, FK больше не нужен)
    db.query(models.Result).filter(models.Result.test_id == test_id).update(
        {models.Result.test_id: None}, synchronize_session=False
    )
    db.delete(test)
    db.flush()
    _cleanup_orphan_tags(db)
    db.commit()
    return {"ok": True}


@app.delete("/admin/tests-all")
def delete_all_tests(db: Session = Depends(get_db), admin=Depends(auth.require_admin)):
    """Удалить все тесты с соблюдением порядка FK."""
    count = db.query(models.Test).count()
    # 1. Обнуляем test_id в results (снапшот названия сохранён, FK не нужен)
    db.query(models.Result).update({models.Result.test_id: None}, synchronize_session=False)
    # 2. Удаляем дочерние таблицы в правильном порядке
    db.query(models.QuestionOption).delete(synchronize_session=False)
    db.query(models.Question).delete(synchronize_session=False)
    db.execute(models.TestTag.__table__.delete())
    db.query(models.Test).delete(synchronize_session=False)
    # 3. Удаляем осиротевшие теги (не привязанные ни к одному тесту)
    _cleanup_orphan_tags(db)
    db.commit()
    return {"ok": True, "deleted": count}


@app.get("/admin/tests-export")
def export_tests(db: Session = Depends(get_db), admin=Depends(auth.require_admin)):
    """Экспорт всех тестов в JSON-структуру, пригодную для импорта."""
    tests = db.query(models.Test).all()
    result = []
    for t in tests:
        result.append({
            "title": t.title,
            "tags": [tag.name for tag in t.tags],
            "questions": [
                {
                    "text": q.text,
                    "question_type": q.question_type,
                    "options": [
                        {"text": o.text, "is_correct": o.is_correct, "order": o.order}
                        for o in sorted(q.options, key=lambda x: x.order)
                    ]
                }
                for q in t.questions
            ]
        })
    return result


@app.post("/admin/tests-import")
def import_tests(
    data: List[schemas.TestCreate],
    skip_duplicates: bool = Query(True),
    db: Session = Depends(get_db),
    admin=Depends(auth.require_admin)
):
    """Импорт тестов из JSON. skip_duplicates=true — пропускать тесты с совпадающим названием."""
    imported, skipped = 0, 0
    for item in data:
        existing = db.query(models.Test).filter(
            models.Test.title.ilike(item.title.strip())).first()
        if existing:
            if skip_duplicates:
                skipped += 1
                continue
            else:
                raise HTTPException(409, f"Тест «{item.title}» уже существует")
        test = models.Test(title=item.title.strip())
        db.add(test)
        db.flush()
        _build_test_from_data(test, item, db)
        imported += 1
    db.commit()
    return {"ok": True, "imported": imported, "skipped": skipped}


# --- ADMIN: USERS ---

@app.get("/admin/users", response_model=List[schemas.UserOut])
def all_users(db: Session = Depends(get_db), admin=Depends(auth.require_admin)):
    return db.query(models.User).all()


@app.put("/admin/users/{user_id}/role")
def change_role(user_id: int, data: schemas.RoleUpdate, db: Session = Depends(get_db),
                admin=Depends(auth.require_admin)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    if data.role not in ["client", "admin"]:
        raise HTTPException(422, "Role must be 'client' or 'admin'")
    user.role = data.role
    db.commit()
    return {"ok": True, "username": user.username, "role": user.role}


@app.delete("/admin/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), admin=Depends(auth.require_admin)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    db.query(models.Result).filter(models.Result.user_id == user_id).delete()
    db.delete(user)
    db.commit()
    return {"ok": True}


# --- ADMIN: RESULTS (page size 50) ---

@app.get("/admin/results")
def all_results(page: int = Query(1, ge=1), db: Session = Depends(get_db),
                admin=Depends(auth.require_admin)):
    PAGE_SIZE = 50
    query = db.query(models.Result).order_by(models.Result.id.desc())
    total = query.count()
    items = query.offset((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).all()
    return {
        "items": [{"id": r.id, "user_id": r.user_id, "test_id": r.test_id,
                   "test_title_snapshot": r.test_title_snapshot,
                   "total_questions_snapshot": r.total_questions_snapshot,
                   "score": r.score} for r in items],
        "total": total, "page": page,
        "pages": max(1, (total + PAGE_SIZE - 1) // PAGE_SIZE)
    }


@app.delete("/admin/results/{result_id}")
def delete_result(result_id: int, db: Session = Depends(get_db), admin=Depends(auth.require_admin)):
    result = db.query(models.Result).filter(models.Result.id == result_id).first()
    if not result:
        raise HTTPException(404, "Result not found")
    db.delete(result)
    db.commit()
    return {"ok": True}
