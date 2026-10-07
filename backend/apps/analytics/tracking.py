import hashlib
import re
from urllib.parse import urlparse

from django.conf import settings
from django.utils import timezone

BOT_RE = re.compile(
    r"bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|whatsapp|telegram|"
    r"headless|lighthouse|curl|wget|python-requests|httpx|go-http-client",
    re.IGNORECASE,
)


def client_ip(request) -> str:
    # The browser talks to Next.js, which proxies /api here and adds X-Forwarded-For
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    return forwarded.split(",")[0].strip() or request.META.get("REMOTE_ADDR", "")


def is_bot(user_agent: str) -> bool:
    return not user_agent or bool(BOT_RE.search(user_agent))


def device_from(user_agent: str) -> str:
    if re.search(r"ipad|tablet", user_agent, re.IGNORECASE):
        return "tablet"
    if re.search(r"mobi|android|iphone", user_agent, re.IGNORECASE):
        return "mobile"
    return "desktop"


def visitor_hash(ip: str, user_agent: str) -> str:
    """Daily-rotating pseudonymous id: same visitor = same hash within one day only."""
    day = timezone.localdate().isoformat()
    raw = f"{settings.SECRET_KEY}:{day}:{ip}:{user_agent}"
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


def referrer_host(referrer: str, own_host: str) -> str:
    host = (urlparse(referrer).hostname or "").removeprefix("www.")
    return "" if not host or host == own_host.split(":")[0] else host[:255]
