import torch
import torch.nn as nn
import timm
from huggingface_hub import hf_hub_download

MODEL_REPO = "VisionaryQuant/5_Crop_Disease_Detection"
MODEL_FILE = "best_crop_disease_model.pt"
NUM_CLASSES = 17

def load_model():
    # Download checkpoint
    model_path = hf_hub_download(
        repo_id=MODEL_REPO,
        filename=MODEL_FILE
    )

    # Create TIMM EfficientNet-B3 backbone
    model = timm.create_model(
        "efficientnet_b3",
        pretrained=False,
        num_classes=0   # IMPORTANT: remove default classifier
    )

    # Recreate classifier EXACTLY as in training
    in_features = model.num_features
    model.classifier = nn.Sequential(
        nn.Linear(in_features, NUM_CLASSES)
    )

    # Load state_dict
    state_dict = torch.load(model_path, map_location="cpu")
    model.load_state_dict(state_dict)

    model.eval()
    return model

# Load model once at startup
model = load_model()
