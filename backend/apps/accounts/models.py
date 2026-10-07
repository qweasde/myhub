from django.contrib.auth.models import AbstractUser
from django.core.validators import RegexValidator
from django.db import models

username_validator = RegexValidator(
    r"^[a-z0-9_]+$",
    "Username может содержать только строчные латинские буквы, цифры и _.",
)

# Usernames that would collide with app routes: myhub.site/@<username>
# fmt: off
RESERVED_USERNAMES = {
    "admin", "api", "app", "dashboard", "login", "logout", "register",
    "settings", "billing", "help", "support", "myhub", "static", "media",
}
# fmt: on


class User(AbstractUser):
    username = models.CharField(
        "username",
        max_length=32,
        unique=True,
        validators=[username_validator],
        error_messages={"unique": "Этот username уже занят."},
    )
    email = models.EmailField("email", unique=True)

    def clean(self):
        super().clean()
        self.username = self.username.lower()
