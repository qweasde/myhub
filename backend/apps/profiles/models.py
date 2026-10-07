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
