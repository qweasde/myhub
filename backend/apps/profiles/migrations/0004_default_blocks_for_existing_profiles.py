from django.db import migrations

# Frozen copy of DEFAULT_BLOCKS: migrations must not depend on current app code
DEFAULT_BLOCKS = ["profile", "links", "projects", "skills"]


def add_default_blocks(apps, schema_editor):
    Profile = apps.get_model("profiles", "Profile")
    Block = apps.get_model("profiles", "Block")
    Block.objects.bulk_create(
        Block(profile=profile, type=block_type, order=order)
        for profile in Profile.objects.filter(blocks__isnull=True)
        for order, block_type in enumerate(DEFAULT_BLOCKS, start=1)
    )


class Migration(migrations.Migration):
    dependencies = [
        ("profiles", "0003_block"),
    ]

    operations = [
        migrations.RunPython(add_default_blocks, migrations.RunPython.noop),
    ]
