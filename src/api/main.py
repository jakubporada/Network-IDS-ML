from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
import joblib
import numpy as np
import pandas as pd
from datetime import datetime

app = FastAPI(
    title="Network Intrusion Detection API",
    description="ML-powered API to detect DDoS attacks and network intrusions",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


print("Loading multi-class model and preprocessor...")
try:
    model = joblib.load('../../models/random_forest_multiclass.pkl')
    preprocessor_data = joblib.load('../../models/preprocessor_multiclass.pkl')
    scaler = preprocessor_data['scaler']
    feature_columns = preprocessor_data['feature_columns']
    label_encoder = preprocessor_data['label_encoder']
    classes = list(preprocessor_data['classes'])
    print(f" Multi-class model loaded")
    print(f" Detecting {len(classes)} attack types: {', '.join(classes[:5])}...")
except Exception as e:
    print(f"Error loading model: {e}")
    model = None
    scaler = None
    feature_columns = None
    label_encoder = None
    classes = None


class PredictionResponse(BaseModel):
    prediction: str = Field(..., description="Attack type or BENIGN")
    attack_type: str = Field(..., description="Specific attack classification")
    confidence: float = Field(..., description="Confidence score (0-1)")
    is_attack: bool = Field(..., description="True if any attack detected")
    top_3_predictions: dict = Field(..., description="Top 3 most likely classes with probabilities")
    model_used: str = Field(..., description="Model version")
    timestamp: str = Field(..., description="Prediction timestamp")
    warning: Optional[str] = Field(None, description="Any warnings")


class NetworkFlowFull(BaseModel):
    features: dict = Field(..., description="Dictionary with all 78 feature names and values")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "features": {
                    "Destination Port": 80,
                    "Flow Duration": 120000,
                    "Total Fwd Packets": 10,
                }
            }
        }
    }


@app.get("/")
def root():
    return {
        "message": "Network Intrusion Detection API",
        "status": "running",
        "model_loaded": model is not None,
        "version": "1.0.0",
        "endpoints": {
            "/predict/simple": "Predict with simplified feature set",
            "/predict/full": "Predict with all 78 features",
            "/health": "Health check",
            "/docs": "Interactive API documentation"
        }
    }


@app.get("/health")
def health_check():
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    return {
        "status": "healthy",
        "model_loaded": True,
        "model_type": "Random Forest Multi-Class Classifier",
        "accuracy": "99.47%",
        "attack_types_detected": len(classes) if classes else 0,
        "classes": classes[:10] if classes else [],
        "features_expected": len(feature_columns) if feature_columns else 0
    }


@app.post("/predict/full", response_model=PredictionResponse)
def predict_full(flow: NetworkFlowFull):
    if model is None or scaler is None or feature_columns is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        input_df = pd.DataFrame([flow.features])
        
        missing_features = set(feature_columns) - set(input_df.columns)
        if missing_features:
            raise HTTPException(
                status_code=400, 
                detail=f"Missing required features: {missing_features}"
            )
        
        input_df = input_df[feature_columns]
        input_scaled = scaler.transform(input_df)
        
        prediction_encoded = model.predict(input_scaled)[0]
        prediction_label = label_encoder.inverse_transform([prediction_encoded])[0]
        probabilities = model.predict_proba(input_scaled)[0]
        
        top_3_indices = np.argsort(probabilities)[-3:][::-1]
        top_3_predictions = {
            classes[i]: float(probabilities[i]) 
            for i in top_3_indices
        }
        
        is_attack = prediction_label != "BENIGN"
        
        result = PredictionResponse(
            prediction=prediction_label,
            attack_type=prediction_label if is_attack else "None",
            confidence=float(max(probabilities)),
            is_attack=is_attack,
            top_3_predictions=top_3_predictions,
            model_used="Random Forest Multi-Class (99.47% accuracy, 15 attack types)",
            timestamp=datetime.now().isoformat()
        )
        
        if result.confidence < 0.7:
            result.warning = "Low confidence prediction - manual review recommended"
        
        if prediction_label in ["Bot", "Web Attack - XSS", "Web Attack - Sql Injection", "Heartbleed"]:
            result.warning = f"{prediction_label} detection has higher false positive rate - verify manually"
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)