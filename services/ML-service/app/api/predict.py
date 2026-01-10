from fastapi import APIRouter, UploadFile, File, HTTPException
import torch
from io import BytesIO
from PIL import Image

from app.model.model_loader import model
from app.model.preprocess import preprocess_image
from app.model.labels import LABELS

router = APIRouter()

# Security: File size limit (5MB)
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB in bytes

# Magic numbers for image file formats
JPEG_MAGIC = b'\xff\xd8\xff'
PNG_MAGIC = b'\x89PNG\r\n\x1a\n'
WEBP_MAGIC = b'RIFF'

def is_valid_image(content: bytes) -> bool:
    """
    Verify file is actually an image by checking magic numbers
    instead of trusting file.content_type
    """
    if len(content) < 12:
        return False
    
    # Check magic numbers for common image formats
    if content.startswith(JPEG_MAGIC):
        return True
    if content.startswith(PNG_MAGIC):
        return True
    if content.startswith(WEBP_MAGIC):
        return True
    
    return False

@router.post("/")
async def predict_disease(file: UploadFile = File(...)):
    """
    Predict crop disease from image with security checks:
    - File size limit (5MB max)
    - Magic number verification (not trusting content_type)
    - Chunked reading for memory efficiency
    """
    # SECURITY: Read file in chunks to check size before processing
    file_content = BytesIO()
    total_size = 0
    chunk_size = 1024 * 1024  # 1MB chunks
    
    try:
        # Read file in chunks and check size
        while True:
            chunk = await file.read(chunk_size)
            if not chunk:
                break
            
            total_size += len(chunk)
            
            # SECURITY: Check file size limit before reading entire file
            if total_size > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=413,
                    detail=f"File too large. Maximum size is {MAX_FILE_SIZE / (1024 * 1024):.1f}MB"
                )
            
            file_content.write(chunk)
        
        # Reset file pointer to beginning
        file_content.seek(0)
        image_bytes = file_content.read()
        
        # SECURITY: Verify file is actually an image using magic numbers
        if not is_valid_image(image_bytes):
            raise HTTPException(
                status_code=400,
                detail="Invalid image file. Only JPEG, PNG, and WebP formats are supported."
            )
        
        # Additional validation: Verify content_type matches magic number
        if file.content_type and not file.content_type.startswith("image/"):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Expected image, got {file.content_type}"
            )
        
        # Preprocess and predict
        input_tensor = preprocess_image(image_bytes)

        with torch.no_grad():
            outputs = model(input_tensor)
            probabilities = torch.softmax(outputs, dim=1)

        pred_index = probabilities.argmax().item()
        confidence = probabilities.max().item()

        return {
            "prediction": LABELS[pred_index],
            "confidence": round(confidence * 100, 2)
        }
    
    except HTTPException:
        # Re-raise HTTP exceptions (size limit, invalid format)
        raise
    except Exception as e:
        # Catch any other errors and return generic error message
        raise HTTPException(
            status_code=500,
            detail="An error occurred while processing the image. Please try again with a different image."
        )
