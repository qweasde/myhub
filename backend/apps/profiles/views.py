from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import Max
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import generics, mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .images import process_image
from .models import Link, Profile, Project, Skill
from .serializers import (
    ImageUploadSerializer,
    LinkSerializer,
    ProfileSerializer,
    ProjectSerializer,
    PublicProfileSerializer,
    ReorderSerializer,
    SkillSerializer,
)

AVATAR_SIZE = 512
PROJECT_IMAGE_SIZE = 1600


def get_own_profile(request) -> Profile:
    profile, _ = Profile.objects.get_or_create(user=request.user)
    return profile


def save_image(instance, field: str, upload, **resize):
    try:
        processed = process_image(upload, **resize)
    except DjangoValidationError as exc:
        raise ValidationError({"image": exc.messages}) from exc
    file = getattr(instance, field)
    old_name = file.name  # FieldFile is mutated in place by save(), keep the old name
    file.save(processed.name, processed, save=False)
    instance.save(update_fields=[field])
    if old_name:
        file.storage.delete(old_name)


def delete_image(instance, field: str):
    image = getattr(instance, field)
    if image:
        image.delete(save=False)
        instance.save(update_fields=[field])


class MyProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch"]

    def get_object(self):
        return get_own_profile(self.request)


class MyAvatarView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

    @extend_schema(request=ImageUploadSerializer, responses=ProfileSerializer)
    def put(self, request):
        upload = ImageUploadSerializer(data=request.data)
        upload.is_valid(raise_exception=True)
        profile = get_own_profile(request)
        save_image(
            profile, "avatar", upload.validated_data["image"], max_size=AVATAR_SIZE, square=True
        )
        return Response(ProfileSerializer(profile).data)

    @extend_schema(responses=ProfileSerializer)
    def delete(self, request):
        profile = get_own_profile(request)
        delete_image(profile, "avatar")
        return Response(ProfileSerializer(profile).data)


class OwnedOrderedViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """CRUD over the current user's items + bulk reorder. Subclasses set model/serializer/limit."""

    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch", "delete"]
    pagination_class = None
    model = None
    limit = 50

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):  # schema generation, no real user
            return self.model.objects.none()
        return self.model.objects.filter(profile__user=self.request.user)

    def get_serializer_context(self):
        return {**super().get_serializer_context(), "profile": get_own_profile(self.request)}

    def perform_create(self, serializer):
        profile = get_own_profile(self.request)
        items = self.model.objects.filter(profile=profile)
        if items.count() >= self.limit:
            raise ValidationError({"detail": f"Можно добавить не больше {self.limit}."})
        next_order = (items.aggregate(m=Max("order"))["m"] or 0) + 1
        serializer.save(profile=profile, order=next_order)

    @extend_schema(request=ReorderSerializer, responses={204: None})
    @action(detail=False, methods=["post"])
    def reorder(self, request):
        payload = ReorderSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        ids = payload.validated_data["ids"]
        items = {item.pk: item for item in self.get_queryset()}
        if sorted(ids) != sorted(items):
            raise ValidationError({"ids": "Нужно передать все элементы ровно по одному разу."})
        for position, pk in enumerate(ids, start=1):
            items[pk].order = position
        with transaction.atomic():
            self.model.objects.bulk_update(items.values(), ["order"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class MyLinksViewSet(OwnedOrderedViewSet):
    model = Link
    serializer_class = LinkSerializer


class MyProjectsViewSet(OwnedOrderedViewSet):
    model = Project
    serializer_class = ProjectSerializer
    limit = 30
    # PUT is only for the `image` upload action; full updates of a project stay PATCH-only
    http_method_names = ["get", "post", "put", "patch", "delete"]

    def update(self, request, *args, **kwargs):
        if not kwargs.get("partial"):
            return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)
        return super().update(request, *args, **kwargs)

    def perform_destroy(self, instance):
        delete_image(instance, "image")
        instance.delete()

    @extend_schema(request=ImageUploadSerializer, responses=ProjectSerializer)
    @action(detail=True, methods=["put", "delete"], parser_classes=[MultiPartParser])
    def image(self, request, pk=None):
        project = self.get_object()
        if request.method == "DELETE":
            delete_image(project, "image")
        else:
            upload = ImageUploadSerializer(data=request.data)
            upload.is_valid(raise_exception=True)
            save_image(
                project, "image", upload.validated_data["image"], max_size=PROJECT_IMAGE_SIZE
            )
        return Response(ProjectSerializer(project).data)


class MySkillsViewSet(OwnedOrderedViewSet):
    model = Skill
    serializer_class = SkillSerializer


class PublicProfileView(generics.RetrieveAPIView):
    serializer_class = PublicProfileSerializer
    permission_classes = [AllowAny]

    def get_object(self):
        queryset = Profile.objects.select_related("user").prefetch_related(
            "links", "projects", "skills"
        )
        return get_object_or_404(
            queryset,
            user__username=self.kwargs["username"].lower(),
            user__is_active=True,
            is_published=True,
        )
