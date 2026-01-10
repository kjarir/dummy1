from PIL import Image
import io

def is_image_valid(image_bytes: bytes) -> bool:
    try:
        Image.open(io.BytesIO(image_bytes))
        return True
    except Exception:
        return False
