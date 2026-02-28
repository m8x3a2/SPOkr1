# TestApp — Платформа онлайн-тестирования

Веб-приложение для создания и прохождения тестов с разграничением прав по ролям.

## Стек технологий

- **Backend:** Python, FastAPI, SQLAlchemy
- **Database:** PostgreSQL
- **Frontend:** React + Vite
- **Auth:** JWT-токены, bcrypt

## Роли пользователей

| Роль | Возможности |
|------|-------------|
| Гость | Просмотр списка тестов, регистрация, вход |
| Клиент | Прохождение тестов, просмотр своих результатов |
| Администратор | Создание/удаление тестов, просмотр всех пользователей и результатов |

## Структура проекта

```
PySPO/
├── backend/
│   ├── main.py          # FastAPI приложение, все эндпоинты
│   ├── models.py        # Модели базы данных (SQLAlchemy)
│   ├── schemas.py       # Pydantic схемы
│   ├── database.py      # Подключение к PostgreSQL
│   ├── auth.py          # JWT авторизация, хеширование паролей
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

### 1. Клонировать репозиторий

```bash
git clone https://github.com/ВАШ_НИКНЕЙМ/PySPO.git
cd PySPO
```

### 2. База данных

Создайте базу данных PostgreSQL:

```sql
CREATE DATABASE testdb01;
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
```

Создайте файл `.env` в папке `backend` (или отредактируйте `database.py`):

```
DATABASE_URL=postgresql://postgres:ВАШ_ПАРОЛЬ@localhost:5432/testdb
```

Запуск:

```bash
uvicorn main:app --reload
```

Бэкенд будет доступен на `http://localhost:8000`  
Документация API: `http://localhost:8000/docs`

### 4. Фронтенд

```bash
cd frontend
npm install
npm run dev
```

Фронтенд будет доступен на `http://localhost:5173`

## Создание администратора

1. Зарегистрируйтесь через сайт
2. В PostgreSQL выполните:

```sql
\c testdb
UPDATE users SET role = 'admin' WHERE username = 'ваш_логин';
```

3. Перелогиньтесь — появится кнопка «Админ»

## API эндпоинты

| Метод | URL | Описание | Доступ |
|-------|-----|----------|--------|
| POST | /register | Регистрация | Все |
| POST | /login | Вход | Все |
| GET | /tests | Список тестов | Все |
| GET | /tests/{id} | Вопросы теста | Все |
| POST | /submit | Сдать тест | Клиент |
| GET | /my-results | Мои результаты | Клиент |
| POST | /admin/tests | Создать тест | Админ |
| DELETE | /admin/tests/{id} | Удалить тест | Админ |
| GET | /admin/users | Все пользователи | Админ |
| GET | /admin/results | Все результаты | Админ |
