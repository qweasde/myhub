# MyHub

Персональный сайт, который собирается из данных пользователя. Концепция — в [idea.md](idea.md).

## Стек

- **backend/** — Django 5.2, DRF, drf-spectacular, django-allauth (headless, сессии), Celery + Redis, django-storages (MinIO/S3), PostgreSQL 17
- **frontend/** — Next.js 16 (App Router, Cache Components), React 19, TypeScript, Tailwind CSS v4

Браузер ходит только на Next.js: `/api/*`, `/_allauth/*` и `/media/*` проксируются в Django (rewrites в `frontend/next.config.ts`), поэтому cookie сессии и CSRF работают без CORS. Публичный профиль `/@username` переписывается на маршрут `/u/[username]`.

## Запуск через Docker

```bash
cp backend/.env.example backend/.env
docker compose up --build
```

| Сервис | Адрес |
|---|---|
| Сайт | http://localhost:3000 |
| API / Swagger | http://localhost:8000/api/v1/docs |
| Django admin | http://localhost:8000/admin |
| Mailpit (письма) | http://localhost:8025 |
| MinIO console | http://localhost:9001 (myhub / myhub-secret) |

Суперпользователь: `docker compose exec backend python manage.py createsuperuser`

## Локальный запуск без Docker для кода

Инфраструктура в Docker, код — локально:

```bash
docker compose up -d db redis minio minio-init mailpit

cd backend
python -m venv .venv && .venv/Scripts/activate   # Linux/macOS: source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver

cd ../frontend
npm install
npm run dev
```

## Проверки

```bash
cd backend && ruff check . && ruff format --check . && pytest
cd frontend && npm run lint && npm run build
```

## Roadmap MVP 0.1

1. [x] Каркас: монорепо, docker-compose, Django + Next.js, CI
2. [ ] Аккаунты: регистрация/вход через allauth headless, username, защита `/dashboard`
3. [ ] Profile, Links, Projects, Skills: модели, API, страницы dashboard
4. [ ] Blocks: конструктор, drag & drop (dnd-kit), live preview
5. [ ] Публичная страница `/@username`: темы, OG-теги, адаптив
6. [ ] Аналитика: события, агрегация в Celery, `/dashboard/analytics`
7. [ ] Деплой на VPS (Docker Compose + Caddy)
