from django.urls import path
from rest_framework.routers import SimpleRouter

from . import views

router = SimpleRouter(trailing_slash=False)
router.register("me/links", views.MyLinksViewSet, basename="my-links")
router.register("me/projects", views.MyProjectsViewSet, basename="my-projects")
router.register("me/skills", views.MySkillsViewSet, basename="my-skills")
router.register("me/blocks", views.MyBlocksViewSet, basename="my-blocks")

urlpatterns = [
    path("me/profile", views.MyProfileView.as_view(), name="my-profile"),
    path("me/profile/avatar", views.MyAvatarView.as_view(), name="my-avatar"),
    path("profiles/<str:username>", views.PublicProfileView.as_view(), name="public-profile"),
    *router.urls,
]
