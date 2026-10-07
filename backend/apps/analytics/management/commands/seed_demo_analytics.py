import random
from datetime import timedelta

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.analytics.models import AnalyticsEvent
from apps.profiles.models import Profile

REFERRERS = [
    "",
    "",
    "",
    "t.me",
    "t.me",
    "linkedin.com",
    "google.com",
    "github.com",
    "hh.ru",
    "habr.com",
]
DEVICES = ["desktop", "desktop", "mobile", "mobile", "mobile", "tablet"]


class Command(BaseCommand):
    help = (
        "Fill @demo (or --username) with 90 days of synthetic views and clicks. Profile untouched."
    )

    def add_arguments(self, parser):
        parser.add_argument("--username", default="demo")
        parser.add_argument("--days", type=int, default=90)
        parser.add_argument("--seed", type=int, default=42)

    @transaction.atomic
    def handle(self, *args, username, days, seed, **options):
        profile = Profile.objects.filter(user__username=username).first()
        if not profile:
            raise CommandError(f"@{username} не найден. Сначала: python manage.py seed_demo")
        links = list(profile.links.filter(is_visible=True))
        rng = random.Random(seed)

        AnalyticsEvent.objects.filter(profile=profile).delete()
        now = timezone.now()
        events = []
        for day_ago in range(days - 1, -1, -1):
            # Slow growth, quieter weekends, a spike after a "post" three weeks ago
            day = now - timedelta(days=day_ago)
            base = 8 + (days - day_ago) * 0.25
            if day.weekday() >= 5:
                base *= 0.6
            if 18 <= day_ago <= 21:
                base *= 3
            for visitor_n in range(max(1, int(rng.gauss(base, base * 0.25)))):
                visitor = f"seed{day_ago}-{visitor_n}".ljust(32, "0")[:32]
                device, referrer = rng.choice(DEVICES), rng.choice(REFERRERS)
                when = day.replace(hour=rng.randint(7, 23), minute=rng.randint(0, 59))
                for _ in range(rng.choice([1, 1, 1, 2])):  # some visitors reload
                    events.append(
                        self.event(profile, "view", None, visitor, referrer, device, when)
                    )
                if links and rng.random() < 0.35:
                    link = rng.choices(links, weights=range(len(links), 0, -1))[0]
                    events.append(
                        self.event(profile, "click", link, visitor, referrer, device, when)
                    )

        AnalyticsEvent.objects.bulk_create(events)
        # auto_now_add overwrites created_at on insert; spread the timestamps out afterwards
        for event in events:
            event.created_at = event.when
        AnalyticsEvent.objects.bulk_update(events, ["created_at"], batch_size=1000)
        self.stdout.write(self.style.SUCCESS(f"@{username}: {len(events)} событий за {days} дней"))

    @staticmethod
    def event(profile, type_, link, visitor, referrer, device, when):
        event = AnalyticsEvent(
            profile=profile,
            type=type_,
            link=link,
            visitor=visitor,
            referrer=referrer,
            device=device,
        )
        event.when = when
        return event
