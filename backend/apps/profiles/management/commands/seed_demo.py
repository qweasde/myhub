from allauth.account.models import EmailAddress
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.accounts.models import User
from apps.profiles.models import (
    Block,
    Education,
    Experience,
    Link,
    Profile,
    Project,
    Skill,
    SpokenLanguage,
)
from apps.profiles.serializers import detect_icon

USERNAME = "demo"
EMAIL = "demo@myhub.site"

PROFILE = {
    "display_name": "Алексей Петров",
    "profession": "Python / Django backend developer",
    "bio": (
        "Пять лет делаю бэкенды на Django и DRF: от MVP за две недели до сервисов "
        "под сотни тысяч пользователей. Люблю PostgreSQL, понятные API и тесты, "
        "которые ловят баги до продакшена."
    ),
    "location": "Москва",
    "website": "https://petrov.dev",
    "contact_email": EMAIL,
    "theme": "minimal",
    "is_published": True,
}

LINKS = [
    ("GitHub", "https://github.com/petrov-dev"),
    ("LinkedIn", "https://www.linkedin.com/in/petrov-dev"),
    ("Telegram", "https://t.me/petrov_dev"),
    ("YouTube", "https://www.youtube.com/@petrov-dev"),
    ("Хабр", "https://habr.com/ru/users/petrov-dev"),
    ("Почта", f"mailto:{EMAIL}"),
]

PROJECTS = [
    {
        "title": "MyCar",
        "description": "Цифровой профиль автомобиля: история обслуживания, расходы, "
        "напоминания о ТО и страховке.",
        "technologies": ["Django", "DRF", "Vue", "PostgreSQL", "Celery"],
        "github_url": "https://github.com/petrov-dev/mycar",
        "demo_url": "https://mycar.petrov.dev",
        "is_featured": True,
    },
    {
        "title": "MyHub",
        "description": "Персональный сайт, который собирается из данных пользователя: "
        "резюме, проекты, ссылки и интеграции.",
        "technologies": ["Django", "Next.js", "PostgreSQL", "Redis", "S3"],
        "github_url": "https://github.com/petrov-dev/myhub",
        "demo_url": "https://myhub.site",
        "is_featured": True,
    },
    {
        "title": "Billing API",
        "description": "Сервис подписок и платежей с вебхуками ЮKassa, ретраями и "
        "идемпотентными операциями.",
        "technologies": ["FastAPI", "PostgreSQL", "RabbitMQ", "Docker"],
        "github_url": "https://github.com/petrov-dev/billing-api",
        "demo_url": "",
        "is_featured": False,
    },
    {
        "title": "Telegram-бот для записи",
        "description": "Запись клиентов к мастерам: слоты, напоминания и оплата прямо в чате.",
        "technologies": ["aiogram", "PostgreSQL", "Redis"],
        "github_url": "https://github.com/petrov-dev/booking-bot",
        "demo_url": "https://t.me/booking_demo_bot",
        "is_featured": False,
    },
]

SKILLS = [
    "Python", "Django", "DRF", "FastAPI", "PostgreSQL", "Redis", "Celery",
    "Docker", "Kafka", "S3", "Git", "Linux",
]  # fmt: skip

EXPERIENCE = [
    {
        "position": "Senior backend developer",
        "company": "Финтех-стартап «Кошелёк»",
        "location": "Москва, удалённо",
        "start_date": "2023-04-01",
        "end_date": None,
        "description": "Платёжный сервис на Django и Celery: подписки, вебхуки банков, отчёты. "
        "Ускорил тяжёлые отчёты в 8 раз за счёт индексов и денормализации.",
    },
    {
        "position": "Python developer",
        "company": "Агентство «Пиксель»",
        "location": "Москва",
        "start_date": "2020-09-01",
        "end_date": "2023-03-31",
        "description": "Бэкенды для интернет-магазинов и CRM: DRF, PostgreSQL, "
        "интеграции с 1С и маркетплейсами.",
    },
]

EDUCATION = [
    {
        "institution": "МГТУ им. Н. Э. Баумана",
        "degree": "Бакалавр",
        "field": "Программная инженерия",
        "start_year": 2016,
        "end_year": 2020,
        "description": "",
    },
    {
        "institution": "Яндекс Практикум",
        "degree": "Курс",
        "field": "Мидл Python-разработчик",
        "start_year": 2021,
        "end_year": 2021,
        "description": "",
    },
]

LANGUAGES = [("Русский", "native"), ("English", "B2"), ("Deutsch", "A2")]

BLOCKS = [
    (Block.Type.PROFILE, {}),
    (Block.Type.LINKS, {"layout": "list"}),
    (
        Block.Type.TEXT,
        {
            "title": "Чем могу помочь",
            "body": (
                "Проектирую и пишу REST API, настраиваю фоновые задачи и очереди, "
                "оптимизирую медленные запросы к базе.\n"
                "Помогаю командам навести порядок в бэкенде: тесты, CI, понятная структура проекта."
            ),
        },
    ),
    (Block.Type.PROJECTS, {"title": "Проекты", "featured_only": False}),
    (Block.Type.SKILLS, {"title": "Технологии"}),
    (Block.Type.EXPERIENCE, {"title": "Опыт работы"}),
    (Block.Type.EDUCATION, {"title": "Образование"}),
    (Block.Type.LANGUAGES, {"title": "Языки"}),
    (
        Block.Type.CONTACT,
        {
            "title": "Связаться со мной",
            "text": "Открыт к работе и интересным проектам. Отвечаю в течение дня.",
        },
    ),
]


class Command(BaseCommand):
    help = "Create or reset the @demo user: a fully filled reference profile (no images)."

    def add_arguments(self, parser):
        parser.add_argument("--password", default="demo-password-2026")

    @transaction.atomic
    def handle(self, *args, password, **options):
        user, created = User.objects.get_or_create(username=USERNAME, defaults={"email": EMAIL})
        user.email = EMAIL
        user.set_password(password)
        user.save()
        EmailAddress.objects.update_or_create(
            user=user, email=EMAIL, defaults={"verified": True, "primary": True}
        )

        profile, _ = Profile.objects.get_or_create(user=user)
        avatar = profile.avatar  # keep a manually uploaded photo across resets
        Profile.objects.filter(pk=profile.pk).update(**PROFILE)

        # Reset everything else to the reference state; project images are dropped with them
        for project in profile.projects.all():
            if project.image:
                project.image.delete(save=False)
        for model in (Block, Link, Project, Skill, Experience, Education, SpokenLanguage):
            model.objects.filter(profile=profile).delete()

        Link.objects.bulk_create(
            Link(profile=profile, title=title, url=url, icon=detect_icon(url), order=i)
            for i, (title, url) in enumerate(LINKS, start=1)
        )

        Project.objects.bulk_create(
            Project(profile=profile, order=i, **data) for i, data in enumerate(PROJECTS, start=1)
        )
        Skill.objects.bulk_create(
            Skill(profile=profile, name=name, order=i) for i, name in enumerate(SKILLS, start=1)
        )
        Experience.objects.bulk_create(
            Experience(profile=profile, order=i, **data)
            for i, data in enumerate(EXPERIENCE, start=1)
        )
        Education.objects.bulk_create(
            Education(profile=profile, order=i, **data) for i, data in enumerate(EDUCATION, start=1)
        )
        SpokenLanguage.objects.bulk_create(
            SpokenLanguage(profile=profile, name=name, level=level, order=i)
            for i, (name, level) in enumerate(LANGUAGES, start=1)
        )
        Block.objects.bulk_create(
            Block(profile=profile, type=block_type, config=config, order=i)
            for i, (block_type, config) in enumerate(BLOCKS, start=1)
        )

        action = "Создан" if created else "Сброшен"
        self.stdout.write(
            self.style.SUCCESS(
                f"{action} @{USERNAME}: вход {EMAIL} / {password}"
                + (" (фото сохранено)" if avatar else "")
            )
        )
