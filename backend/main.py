from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
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
        raise HTTPException(400, "Username already taken")
    new_user = models.User(
        username=user.username,
        password=auth.hash_password(user.password)
    )
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

@app.get("/me", response_model=schemas.UserOut)
def me(user: models.User = Depends(auth.get_current_user)):
    return user

# --- TESTS (public) ---

@app.get("/tests", response_model=list[schemas.TestOut])
def get_tests(db: Session = Depends(get_db)):
    return db.query(models.Test).all()

@app.get("/tests/{test_id}", response_model=schemas.TestDetail)
def get_test(test_id: int, db: Session = Depends(get_db)):
    test = db.query(models.Test).filter(models.Test.id == test_id).first()
    if not test:
        raise HTTPException(404, "Test not found")
    return test

# --- SUBMIT (clients) ---

@app.post("/submit", response_model=schemas.ResultOut)
def submit(data: schemas.SubmitAnswer, db: Session = Depends(get_db),
           user: models.User = Depends(auth.get_current_user)):
    questions = db.query(models.Question).filter(models.Question.test_id == data.test_id).all()
    score = sum(1 for q in questions if data.answers.get(str(q.id)) == q.correct)
    result = models.Result(user_id=user.id, test_id=data.test_id, score=score)
    db.add(result)
    db.commit()
    db.refresh(result)
    return result

@app.get("/my-results")
def my_results(db: Session = Depends(get_db), user: models.User = Depends(auth.get_current_user)):
    results = db.query(models.Result).filter(models.Result.user_id == user.id).all()
    output = []
    for r in results:
        total = db.query(models.Question).filter(models.Question.test_id == r.test_id).count()
        output.append({"test_id": r.test_id, "score": r.score, "total": total})
    return output

# --- ADMIN: ТЕСТЫ (полный CRUD) ---

@app.post("/admin/tests", response_model=schemas.TestOut)
def create_test(data: schemas.TestCreate, db: Session = Depends(get_db),
                admin=Depends(auth.require_admin)):
    test = models.Test(title=data.title)
    db.add(test)
    db.commit()
    db.refresh(test)
    for q in data.questions:
        question = models.Question(test_id=test.id, **q.dict())
        db.add(question)
    db.commit()
    return test

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
    test.title = data.title
    # Cascade delete-orphan в модели сам удалит старые вопросы при очистке списка
    test.questions.clear()
    db.flush()  # применяем удаление до добавления новых
    for q in data.questions:
        question = models.Question(test_id=test.id, **q.dict())
        db.add(question)
    db.commit()
    db.refresh(test)
    return test

@app.delete("/admin/tests/{test_id}")
def delete_test(test_id: int, db: Session = Depends(get_db), admin=Depends(auth.require_admin)):
    test = db.query(models.Test).filter(models.Test.id == test_id).first()
    if not test:
        raise HTTPException(404, "Not found")
    db.delete(test)
    db.commit()
    return {"ok": True}

# --- ADMIN: ПОЛЬЗОВАТЕЛИ ---

@app.get("/admin/users", response_model=list[schemas.UserOut])
def all_users(db: Session = Depends(get_db), admin=Depends(auth.require_admin)):
    return db.query(models.User).all()

@app.put("/admin/users/{user_id}/role")
def change_role(user_id: int, data: schemas.RoleUpdate, db: Session = Depends(get_db),
                admin=Depends(auth.require_admin)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    if data.role not in ["client", "admin"]:
        raise HTTPException(400, "Role must be 'client' or 'admin'")
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

# --- ADMIN: РЕЗУЛЬТАТЫ ---

@app.get("/admin/results")
def all_results(db: Session = Depends(get_db), admin=Depends(auth.require_admin)):
    results = db.query(models.Result).all()
    return [{"id": r.id, "user_id": r.user_id, "test_id": r.test_id, "score": r.score} for r in results]

@app.delete("/admin/results/{result_id}")
def delete_result(result_id: int, db: Session = Depends(get_db), admin=Depends(auth.require_admin)):
    result = db.query(models.Result).filter(models.Result.id == result_id).first()
    if not result:
        raise HTTPException(404, "Result not found")
    db.delete(result)
    db.commit()
    return {"ok": True}
