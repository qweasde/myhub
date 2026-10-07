from allauth.account.adapter import DefaultAccountAdapter
from django.core.exceptions import ValidationError

from .models import RESERVED_USERNAMES, username_validator


class AccountAdapter(DefaultAccountAdapter):
    def clean_username(self, username, shallow=False):
        username = username.lower()
        username_validator(username)
        if username in RESERVED_USERNAMES:
            raise ValidationError("Этот username зарезервирован.")
        return super().clean_username(username, shallow=shallow)
