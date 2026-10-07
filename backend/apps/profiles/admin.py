from django.contrib import admin

from .models import Link, Profile, Project, Skill


class LinkInline(admin.TabularInline):
    model = Link
    extra = 0


class ProjectInline(admin.StackedInline):
    model = Project
    extra = 0


class SkillInline(admin.TabularInline):
    model = Skill
    extra = 0


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "display_name", "profession", "is_published", "updated_at"]
    list_filter = ["is_published"]
    search_fields = ["user__username", "display_name"]
    inlines = [LinkInline, ProjectInline, SkillInline]
