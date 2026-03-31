# GitHub Pages: настройка для https://kanio0.github.io/beeline_project/

Что уже настроено:
- Vite `base` = `/beeline_project/`
- фронтенд использует `HashRouter`, поэтому роуты работают на GitHub Pages
- добавлен GitHub Actions workflow для автодеплоя
- добавлен `.env.production` для адреса backend API

## Что нужно сделать на GitHub

1. Загрузить этот проект в репозиторий `beeline_project`
2. Открыть `Settings -> Pages`
3. В `Build and deployment` выбрать `Source: GitHub Actions`
4. Закоммитить изменения в ветку `main`
5. Дождаться выполнения workflow `Deploy frontend to GitHub Pages`

Сайт будет доступен по адресу:
`https://kanio0.github.io/beeline_project/`

## Важный момент про backend

GitHub Pages публикует только фронтенд. Чтобы сайт полностью работал, нужно отдельно разместить backend и вписать его URL в:
`frontend/.env.production`

Пример:
`VITE_API_URL=https://your-backend.onrender.com/api`

После изменения `.env.production` нужно снова сделать commit/push — GitHub Actions пересоберёт фронтенд.
