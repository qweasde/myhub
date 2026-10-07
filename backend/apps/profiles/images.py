from io import BytesIO

from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import InMemoryUploadedFile
from PIL import Image, ImageOps

MAX_UPLOAD_BYTES = 5 * 1024 * 1024


def process_image(upload, *, max_size: int, square: bool = False) -> InMemoryUploadedFile:
    """Validate, fix orientation, downscale and re-encode an uploaded image as WebP.

    Re-encoding also strips EXIF (GPS etc.) from user photos.
    """
    if upload.size > MAX_UPLOAD_BYTES:
        raise ValidationError("Файл больше 5 МБ.")
    try:
        image = Image.open(upload)
        image = ImageOps.exif_transpose(image)
    except Exception as exc:
        raise ValidationError("Не удалось прочитать изображение.") from exc

    image = image.convert("RGBA" if image.mode in ("RGBA", "LA", "P") else "RGB")
    if square:
        image = ImageOps.fit(image, (max_size, max_size), Image.Resampling.LANCZOS)
    else:
        image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)

    buffer = BytesIO()
    image.save(buffer, format="WEBP", quality=85)
    size = buffer.tell()
    buffer.seek(0)
    return InMemoryUploadedFile(buffer, None, "image.webp", "image/webp", size, None)
