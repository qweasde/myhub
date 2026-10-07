from allauth.account.models import EmailAddress
from rest_framework import serializers

from .models import User


class MeSerializer(serializers.ModelSerializer):
    email_verified = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "email", "email_verified", "date_joined"]
        read_only_fields = fields

    def get_email_verified(self, user) -> bool:
        return EmailAddress.objects.filter(user=user, email=user.email, verified=True).exists()
