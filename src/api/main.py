from fastapi import FastAPI, HTTPException
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

print("Loading Model and preprocessor...")
try:
    import os
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    model = joblib.load(os.path.join(base_dir, 'models', 'random_forest.pkl'))
    preprocessor_data = joblib.load(os.path.join(base_dir, 'models', 'preprocessor.pkl'))
    scaler = preprocessor_data['scaler']
    feature_columns = preprocessor_data['feature_columns']
    print(f" Model loaded")
    print(f" Expecting {len(feature_columns)} features")
except Exception as e:
    print(f"Error loading model: {e}")
    model = None
    scaler = None
    feature_columns = None


class PredictionResponse(BaseModel):
    prediction: str = Field(..., description="BENIGN or ATTACK")
    confidence: float = Field(..., description="Confidence score (0-1)")
    attack_probability: float = Field(..., description="Probability this is an attack (0-1)")
    benign_probability: float = Field(..., description="Probability this is benign (0-1)")
    model_used: str = Field(..., description="Which model made the prediction")
    timestamp: str = Field(..., description="When prediction was made")
    warning: Optional[str] = Field(None, description="Any warnings about the prediction")


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
        "features_expected": len(feature_columns) if feature_columns else 0,
        "model_type": "Random Forest Classifier"
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
        prediction = model.predict(input_scaled)[0]
        probabilities = model.predict_proba(input_scaled)[0]
        
        result = PredictionResponse(
            prediction="ATTACK" if prediction == 1 else "BENIGN",
            confidence=float(max(probabilities)),
            attack_probability=float(probabilities[1]),
            benign_probability=float(probabilities[0]),
            model_used="Random Forest (99.99% accuracy)",
            timestamp=datetime.now().isoformat()
        )

        if result.confidence < 0.7:
            result.warning = "Low confidence prediction - manual review recommended"
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)