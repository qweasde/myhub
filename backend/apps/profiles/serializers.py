from urllib.parse import urlparse

from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import URLValidator, validate_email
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from .models import Link, Profile, Project, Skill


@extend_schema_field({"type": "string", "format": "uri", "nullable": True, "readOnly": True})
class FileUrlField(serializers.Field):
    """Storage URL as is: absolute for S3/MinIO, `/media/...` locally (proxied by Next)."""

    def __init__(self, **kwargs):
        kwargs["read_only"] = True
        super().__init__(**kwargs)

    def get_attribute(self, instance):
        return getattr(instance, self.source)

    def to_representation(self, value):
        return value.url if value else None


class ProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    avatar = FileUrlField()

    class Meta:
        model = Profile
        fields = [
            "username",
            "display_name",
            "profession",
            "bio",
            "location",
            "website",
            "contact_email",
            "avatar",
            "is_published",
        ]


# Order matters: first match wins
ICON_DOMAINS = [
    ("github.com", Link.Icon.GITHUB),
    ("linkedin.com", Link.Icon.LINKEDIN),
    ("t.me", Link.Icon.TELEGRAM),
    ("telegram.me", Link.Icon.TELEGRAM),
    ("instagram.com", Link.Icon.INSTAGRAM),
    ("youtube.com", Link.Icon.YOUTUBE),
    ("youtu.be", Link.Icon.YOUTUBE),
    ("behance.net", Link.Icon.BEHANCE),
    ("dribbble.com", Link.Icon.DRIBBBLE),
    ("x.com", Link.Icon.X),
    ("twitter.com", Link.Icon.X),
]


def detect_icon(url: str) -> str:
    if url.startswith("mailto:"):
        return Link.Icon.EMAIL
    host = (urlparse(url).hostname or "").removeprefix("www.")
    for domain, icon in ICON_DOMAINS:
        if host == domain or host.endswith(f".{domain}"):
            return icon
    return Link.Icon.WEBSITE


def validate_link_url(value: str) -> str:
    try:
        if value.startswith("mailto:"):
            validate_email(value.removeprefix("mailto:"))
        else:
            URLValidator(schemes=["http", "https"])(value)
    except DjangoValidationError as exc:
        raise serializers.ValidationError("Введите корректную ссылку или email.") from exc
    return value


class LinkSerializer(serializers.ModelSerializer):
    icon = serializers.ChoiceField(choices=Link.Icon.choices, required=False)
    # Model URLField only allows http(s)/ftp; links may also be mailto:
    url = serializers.CharField(max_length=500, validators=[validate_link_url])

    class Meta:
        model = Link
        fields = ["id", "title", "url", "icon", "is_visible", "order"]
        read_only_fields = ["order"]

    def validate(self, attrs):
        # Pick the icon from the URL unless the user chose one explicitly
        if "url" in attrs and "icon" not in self.initial_data:
            attrs["icon"] = detect_icon(attrs["url"])
        return attrs


class ProjectSerializer(serializers.ModelSerializer):
    image = FileUrlField()
    technologies = serializers.ListField(
        child=serializers.CharField(max_length=30, allow_blank=True), max_length=15, required=False
    )

    class Meta:
        model = Project
        fields = [
            "id",
            "title",
            "description",
            "image",
            "github_url",
            "demo_url",
            "technologies",
            "is_featured",
            "order",
        ]
        read_only_fields = ["order"]

    def validate_technologies(self, value):
        # Trim and drop case-insensitive duplicates, keep the user's order
        seen, result = set(), []
        for tech in (t.strip() for t in value):
            if tech and tech.lower() not in seen:
                seen.add(tech.lower())
                result.append(tech)
        return result


class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = ["id", "name", "order"]
        read_only_fields = ["order"]

    def validate_name(self, value):
        value = value.strip()
        profile = self.context["profile"]
        duplicates = profile.skills.filter(name__iexact=value)
        if self.instance:
            duplicates = duplicates.exclude(pk=self.instance.pk)
        if duplicates.exists():
            raise serializers.ValidationError("Такой навык уже добавлен.")
        return value


class ImageUploadSerializer(serializers.Serializer):
    image = serializers.ImageField()


class ReorderSerializer(serializers.Serializer):
    ids = serializers.ListField(child=serializers.IntegerField(), allow_empty=True)


class PublicLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = Link
        fields = ["id", "title", "url", "icon"]


class PublicProfileSerializer(ProfileSerializer):
    links = serializers.SerializerMethodField()
    projects = ProjectSerializer(many=True, read_only=True)
    skills = serializers.SlugRelatedField(slug_field="name", many=True, read_only=True)

    class Meta(ProfileSerializer.Meta):
        fields = [f for f in ProfileSerializer.Meta.fields if f != "is_published"] + [
            "links",
            "projects",
            "skills",
        ]

    @extend_schema_field(PublicLinkSerializer(many=True))
    def get_links(self, profile):
        visible = [link for link in profile.links.all() if link.is_visible]
        return PublicLinkSerializer(visible, many=True).data
