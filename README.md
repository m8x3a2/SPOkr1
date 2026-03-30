# TestApp v2 — Платформа онлайн-тестирования

Веб-приложение для создания и прохождения тестов с разграничением прав по ролям.

## Стек технологий

- **Backend:** Python, FastAPI, SQLAlchemy
- **Database:** PostgreSQL
- **Frontend:** React + Vite
- **Auth:** JWT-токены, bcrypt

## Роли пользователей

| Роль | Возможности |
|------|-------------|
| Гость | Просмотр и прохождение тестов без сохранения результата |
| Клиент | Прохождение тестов, история результатов, статистика |
| Администратор | Создание/редактирование/удаление тестов, управление пользователями |

## Структура проекта

```
PySPO/
├── backend/
│   ├── main.py
│   ├── models.py
│   ├── schemas.py
│   ├── database.py
│   ├── auth.py
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   └── pages/
    │       ├── Login.jsx
    │       ├── Register.jsx
    │       ├── Tests.jsx
    │       └── Admin.jsx
    ├── index.html
    └── package.json
```

## Установка и запуск

### Требования
- Python 3.10+
- Node.js 18+
- PostgreSQL

### 1. Создать базу данных

Откройте pgAdmin 4 или psql и выполните:

```sql
CREATE DATABASE testdb02;
```

> Используется новая БД `testdb02`, так как схема изменилась.

### 2. Настроить подключение

Откройте `backend/database.py` и укажите ваш пароль:

```python
DATABASE_URL = "postgresql://postgres:ВАШ_ПАРОЛЬ@localhost:5432/testdb02"
```

### 3. Бэкенд

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# Linux/Mac
source .venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload
```

Бэкенд: `http://localhost:8000`  
Документация API: `http://localhost:8000/docs`

> Таблицы создаются автоматически при первом запуске (`Base.metadata.create_all`).

### 4. Фронтенд

```bash
cd frontend
npm install
npm run dev
```

Фронтенд: `http://localhost:5173`

## Создание администратора

1. Зарегистрируйтесь через сайт
2. В pgAdmin 4 или psql выполните:

```sql
\c testdb02
UPDATE users SET role = 'admin' WHERE username = 'ваш_логин';
```

3. Перелогиньтесь — появится кнопка «⚙️ Админ»

## Новая схема БД (v2)

Таблицы создаются автоматически. Для справки — что изменилось:

- `questions` — добавлено поле `question_type` (`single` / `multi`)
- `question_options` — новая таблица: варианты ответов (2–20 штук), поле `is_correct`
- `tags` + `test_tags` — теги для тестов (many-to-many)
- `results` — добавлены поля `test_title_snapshot` и `total_questions_snapshot` (сохраняют название теста и кол-во вопросов на момент прохождения)

## API эндпоинты

| Метод | URL | Описание | Доступ |
|-------|-----|----------|--------|
| POST | /register | Регистрация | Все |
| POST | /login | Вход | Все |
| GET | /tests?search=&tag= | Список тестов с поиском | Все |
| GET | /tests/{id} | Вопросы теста | Все |
| GET | /tags | Все теги | Все |
| POST | /submit | Сдать тест | Клиент |
| GET | /my-results | История результатов | Клиент |
| GET | /my-stats | Общая статистика | Клиент |
| POST | /admin/tests | Создать тест | Админ |
| PUT | /admin/tests/{id} | Обновить тест | Админ |
| DELETE | /admin/tests/{id} | Удалить тест | Админ |
| GET | /admin/users | Все пользователи | Админ |
| PUT | /admin/users/{id}/role | Изменить роль | Админ |
| DELETE | /admin/users/{id} | Удалить пользователя | Админ |
| GET | /admin/results | Все результаты | Админ |
| DELETE | /admin/results/{id} | Удалить результат | Админ |
