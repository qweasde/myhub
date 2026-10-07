from django.urls import path

from . import views

urlpatterns = [
    path("track", views.TrackView.as_view(), name="track"),
    path("me/analytics", views.MyAnalyticsView.as_view(), name="my-analytics"),
]
