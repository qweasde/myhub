from urllib.parse import urlparse

from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import URLValidator, validate_email
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from .models import Block, Link, Profile, Project, Skill


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


# --- Blocks ----------------------------------------------------------------


class TitledConfig(serializers.Serializer):
    title = serializers.CharField(max_length=60, allow_blank=True, default="")


class ProfileBlockConfig(serializers.Serializer):
    pass


class LinksBlockConfig(serializers.Serializer):
    layout = serializers.ChoiceField(choices=["list", "icons"], default="list")


class TextBlockConfig(TitledConfig):
    body = serializers.CharField(max_length=5000, allow_blank=True, default="")


class ProjectsBlockConfig(TitledConfig):
    featured_only = serializers.BooleanField(default=False)


class SkillsBlockConfig(TitledConfig):
    pass


class ContactBlockConfig(TitledConfig):
    text = serializers.CharField(max_length=500, allow_blank=True, default="")


BLOCK_CONFIGS = {
    Block.Type.PROFILE: ProfileBlockConfig,
    Block.Type.LINKS: LinksBlockConfig,
    Block.Type.TEXT: TextBlockConfig,
    Block.Type.PROJECTS: ProjectsBlockConfig,
    Block.Type.SKILLS: SkillsBlockConfig,
    Block.Type.CONTACT: ContactBlockConfig,
}


def clean_block_config(block_type: str, config) -> dict:
    """Validate against the type's schema; unknown keys are dropped, missing ones get defaults."""
    serializer = BLOCK_CONFIGS[block_type](data=config if isinstance(config, dict) else {})
    if not serializer.is_valid():
        raise serializers.ValidationError({"config": serializer.errors})
    return dict(serializer.validated_data)


class BlockSerializer(serializers.ModelSerializer):
    config = serializers.JSONField(required=False)

    class Meta:
        model = Block
        fields = ["id", "type", "is_visible", "config", "order"]
        read_only_fields = ["order"]

    def validate_type(self, value):
        if self.instance and value != self.instance.type:
            raise serializers.ValidationError("Тип блока нельзя изменить.")
        if not self.instance and value not in Block.REPEATABLE:
            if self.context["profile"].blocks.filter(type=value).exists():
                raise serializers.ValidationError("Такой блок уже есть на странице.")
        return value

    def validate(self, attrs):
        block_type = attrs.get("type") or self.instance.type
        if "config" in attrs or not self.instance:
            attrs["config"] = clean_block_config(block_type, attrs.get("config", {}))
        return attrs


class PublicBlockSerializer(serializers.ModelSerializer):
    class Meta:
        model = Block
        fields = ["id", "type", "config"]


class PublicLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = Link
        fields = ["id", "title", "url", "icon"]


class PublicProfileSerializer(ProfileSerializer):
    blocks = serializers.SerializerMethodField()
    links = serializers.SerializerMethodField()
    projects = ProjectSerializer(many=True, read_only=True)
    skills = serializers.SlugRelatedField(slug_field="name", many=True, read_only=True)

    class Meta(ProfileSerializer.Meta):
        fields = [f for f in ProfileSerializer.Meta.fields if f != "is_published"] + [
            "blocks",
            "links",
            "projects",
            "skills",
        ]

    @extend_schema_field(PublicBlockSerializer(many=True))
    def get_blocks(self, profile):
        visible = [block for block in profile.blocks.all() if block.is_visible]
        return PublicBlockSerializer(visible, many=True).data

    @extend_schema_field(PublicLinkSerializer(many=True))
    def get_links(self, profile):
        visible = [link for link in profile.links.all() if link.is_visible]
        return PublicLinkSerializer(visible, many=True).data
