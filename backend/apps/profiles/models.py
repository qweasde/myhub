import uuid
from pathlib import PurePosixPath

from django.conf import settings
from django.db import models
from django.db.models.functions import Lower


# Random names: no user-controlled filenames in storage, no cache collisions on re-upload
def random_name(folder: str, filename: str) -> str:
    return f"{folder}/{uuid.uuid4().hex}{PurePosixPath(filename).suffix.lower()}"


def upload_avatar(instance, filename):
    return random_name("avatars", filename)


def upload_project_image(instance, filename):
    return random_name("projects", filename)


class Profile(models.Model):
    class Theme(models.TextChoices):
        MINIMAL = "minimal", "Минимализм"
        DARK = "dark", "Тёмная"
        DEVELOPER = "developer", "Разработчик"
        PORTFOLIO = "portfolio", "Портфолио"
        CREATIVE = "creative", "Креатив"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile"
    )
    display_name = models.CharField(max_length=80, blank=True)
    profession = models.CharField(max_length=80, blank=True)
    bio = models.TextField(max_length=1000, blank=True)
    location = models.CharField(max_length=80, blank=True)
    website = models.URLField(blank=True)
    contact_email = models.EmailField(blank=True)
    avatar = models.ImageField(upload_to=upload_avatar, blank=True)
    theme = models.CharField(max_length=20, choices=Theme.choices, default=Theme.MINIMAL)
    is_published = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"@{self.user.username}"


class OrderedModel(models.Model):
    order = models.PositiveIntegerField(default=0)

    class Meta:
        abstract = True
        ordering = ["order", "id"]


class Link(OrderedModel):
    class Icon(models.TextChoices):
        GITHUB = "github"
        LINKEDIN = "linkedin"
        TELEGRAM = "telegram"
        INSTAGRAM = "instagram"
        YOUTUBE = "youtube"
        BEHANCE = "behance"
        DRIBBBLE = "dribbble"
        X = "x"
        EMAIL = "email"
        WEBSITE = "website"

    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="links")
    title = models.CharField(max_length=80)
    url = models.URLField(max_length=500)
    icon = models.CharField(max_length=20, choices=Icon.choices, default=Icon.WEBSITE)
    is_visible = models.BooleanField(default=True)

    class Meta(OrderedModel.Meta):
        pass

    def __str__(self):
        return self.title


class Project(OrderedModel):
    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="projects")
    title = models.CharField(max_length=100)
    description = models.TextField(max_length=2000, blank=True)
    image = models.ImageField(upload_to=upload_project_image, blank=True)
    github_url = models.URLField(max_length=500, blank=True)
    demo_url = models.URLField(max_length=500, blank=True)
    technologies = models.JSONField(default=list, blank=True)
    is_featured = models.BooleanField(default=False)

    class Meta(OrderedModel.Meta):
        pass

    def __str__(self):
        return self.title


class Skill(OrderedModel):
    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="skills")
    name = models.CharField(max_length=40)

    class Meta(OrderedModel.Meta):
        constraints = [
            models.UniqueConstraint("profile", Lower("name"), name="unique_skill_per_profile_ci"),
        ]

    def __str__(self):
        return self.name


class Block(OrderedModel):
    """A section of the public page. What it shows comes from the profile; `config` tweaks it."""

    class Type(models.TextChoices):
        PROFILE = "profile", "Шапка профиля"
        LINKS = "links", "Ссылки"
        TEXT = "text", "Текст"
        PROJECTS = "projects", "Проекты"
        SKILLS = "skills", "Навыки"
        CONTACT = "contact", "Контакты"
        EXPERIENCE = "experience", "Опыт работы"
        EDUCATION = "education", "Образование"
        LANGUAGES = "languages", "Языки"

    # Every type except TEXT may appear at most once per profile
    REPEATABLE = {Type.TEXT}
    # The header can be hidden or moved, but not deleted
    UNDELETABLE = {Type.PROFILE}

    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="blocks")
    type = models.CharField(max_length=20, choices=Type.choices)
    is_visible = models.BooleanField(default=True)
    config = models.JSONField(default=dict, blank=True)

    class Meta(OrderedModel.Meta):
        pass

    def __str__(self):
        return f"{self.get_type_display()} (@{self.profile.user.username})"


DEFAULT_BLOCKS = [Block.Type.PROFILE, Block.Type.LINKS, Block.Type.PROJECTS, Block.Type.SKILLS]


def create_default_blocks(profile: Profile) -> None:
    Block.objects.bulk_create(
        Block(profile=profile, type=block_type, order=order)
        for order, block_type in enumerate(DEFAULT_BLOCKS, start=1)
    )


# --- Resume -----------------------------------------------------------------


class Experience(OrderedModel):
    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="experience")
    position = models.CharField(max_length=100)
    company = models.CharField(max_length=100)
    location = models.CharField(max_length=80, blank=True)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)  # empty = current job
    description = models.TextField(max_length=2000, blank=True)

    class Meta(OrderedModel.Meta):
        pass

    def __str__(self):
        return f"{self.position} @ {self.company}"


class Education(OrderedModel):
    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="education")
    institution = models.CharField(max_length=150)
    degree = models.CharField(max_length=100, blank=True)  # "Бакалавр", "Курс"
    field = models.CharField(max_length=100, blank=True)  # "Прикладная информатика"
    start_year = models.PositiveSmallIntegerField(null=True, blank=True)
    end_year = models.PositiveSmallIntegerField(null=True, blank=True)
    description = models.TextField(max_length=1000, blank=True)

    class Meta(OrderedModel.Meta):
        pass

    def __str__(self):
        return self.institution


class SpokenLanguage(OrderedModel):
    class Level(models.TextChoices):
        A1 = "A1", "A1 — начальный"
        A2 = "A2", "A2 — элементарный"
        B1 = "B1", "B1 — средний"
        B2 = "B2", "B2 — выше среднего"
        C1 = "C1", "C1 — продвинутый"
        C2 = "C2", "C2 — свободный"
        NATIVE = "native", "Родной"

    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="languages")
    name = models.CharField(max_length=40)
    level = models.CharField(max_length=10, choices=Level.choices)

    class Meta(OrderedModel.Meta):
        pass

    def __str__(self):
        return f"{self.name} ({self.level})"
