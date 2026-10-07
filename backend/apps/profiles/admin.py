from django.contrib import admin

from .models import Block, Education, Experience, Link, Profile, Project, Skill, SpokenLanguage


class LinkInline(admin.TabularInline):
    model = Link
    extra = 0


class ProjectInline(admin.StackedInline):
    model = Project
    extra = 0


class SkillInline(admin.TabularInline):
    model = Skill
    extra = 0


class BlockInline(admin.TabularInline):
    model = Block
    extra = 0


class ExperienceInline(admin.StackedInline):
    model = Experience
    extra = 0


class EducationInline(admin.StackedInline):
    model = Education
    extra = 0


class LanguageInline(admin.TabularInline):
    model = SpokenLanguage
    extra = 0


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "display_name", "profession", "is_published", "updated_at"]
    list_filter = ["is_published"]
    search_fields = ["user__username", "display_name"]
    inlines = [
        BlockInline,
        LinkInline,
        ProjectInline,
        SkillInline,
        ExperienceInline,
        EducationInline,
        LanguageInline,
    ]
