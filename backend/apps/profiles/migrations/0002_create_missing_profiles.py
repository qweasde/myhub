from django.conf import settings
from django.db import migrations


def create_missing_profiles(apps, schema_editor):
    """Users who signed up before the profiles app existed get an empty profile."""
    User = apps.get_model(*settings.AUTH_USER_MODEL.split("."))
    Profile = apps.get_model("profiles", "Profile")
    Profile.objects.bulk_create(
        [Profile(user=user) for user in User.objects.filter(profile__isnull=True)]
    )


class Migration(migrations.Migration):
    dependencies = [
        ("profiles", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.RunPython(create_missing_profiles, migrations.RunPython.noop),
    ]
