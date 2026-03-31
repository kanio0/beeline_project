# Деплой: GitHub Pages + Render

## 1. Backend на Render

1. Залей репозиторий на GitHub.
2. На Render выбери **New + → Blueprint** и укажи репозиторий.
3. Render прочитает `render.yaml` и создаст сервис `beeline-project-api`.
4. В Render добавь `DATABASE_URL` от PostgreSQL. Подойдут Render Postgres, Neon или Supabase.
5. После деплоя возьми URL backend, например: `https://beeline-project-api.onrender.com`

## 2. Frontend на GitHub Pages

1. Открой `frontend/.env.production`
2. Впиши адрес backend:

```env
VITE_API_URL=https://beeline-project-api.onrender.com/api
```

3. Закоммить изменения и запушь в `main`.
4. На GitHub открой **Settings → Pages**
5. В `Build and deployment` выбери **GitHub Actions**
6. Дождись выполнения workflow `Deploy frontend to GitHub Pages`

Фронтенд будет доступен по адресу: `https://kanio0.github.io/beeline_project/`

## 3. Что уже настроено

- `frontend/vite.config.js` уже содержит `base: '/beeline_project/'`
- `frontend/src/main.jsx` уже использует `HashRouter`
- `frontend/src/api/client.js` уже читает `VITE_API_URL`
- `.github/workflows/deploy.yml` уже собирает и публикует фронтенд
- `backend` уже настроен на CORS для `https://kanio0.github.io`

## 4. Если нужен бот

На Render можно включить Telegram-бота, если задать переменные:

- `RUN_BOT=true`
- `BOT_TOKEN=...`

Но для первого деплоя лучше оставить `RUN_BOT=false`.
