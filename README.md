# Cyber Volunteers Final — fixed login build

Исправления в этой сборке:
- backend `/api/auth/login` принимает и JSON, и form-data/form-urlencoded
- frontend всегда отправляет JSON в понятном формате
- ошибка авторизации теперь показывается в форме вместо "чёрного экрана"
- хеширование паролей использует `pbkdf2_sha256`, без проблемного `bcrypt`

## Быстрый запуск на Windows (cmd)

### Backend
```bat
cd C:\path\to\cyber_volunteers_final\backend
if exist .venv rmdir /s /q .venv
python -m venv .venv
.venv\Scripts\activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
if exist app.db del app.db
if exist cyber_volunteers.db del cyber_volunteers.db
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Проверка backend:
- http://127.0.0.1:8000/api/health
- http://127.0.0.1:8000/docs

### Frontend
Во втором окне cmd:
```bat
cd C:\path\to\cyber_volunteers_final\frontend
npm install
npm run dev
```

Открыть:
- http://localhost:5173

## Демо-аккаунты
- координатор: `coord@beeline.local` / `coord12345`
- суперадмин: `admin@beeline.local` / `admin12345`
- волонтёр: `volunteer@beeline.local` / `vol12345`


## Исправление запуска на Windows
Приложение теперь само создаёт папку `backend/app/static/uploads` при старте, поэтому ошибка `Directory app/static/uploads does not exist` больше не должна появляться.
