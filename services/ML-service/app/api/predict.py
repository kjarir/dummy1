from fastapi import APIRouter, UploadFile, File, HTTPException
import torch

from app.model.model_loader import model
from app.model.preprocess import preprocess_image
from app.model.labels import LABELS

router = APIRouter()

@router.post("/")
async def predict_disease(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file is not an image")

    image_bytes = await file.read()
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
