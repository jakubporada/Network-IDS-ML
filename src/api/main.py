from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
import joblib
import numpy as np
import pandas as pd
from datetime import datetime
import os

app = FastAPI(
    title="Network Intrusion Detection API",
    description="ML-powered API to detect DDoS attacks and network intrusions",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], #changed for ec2
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = '/app/models/random_forest_multiclass.pkl'
PREPROCESSOR_PATH = '/app/models/preprocessor_multiclass.pkl'

print("Loading multi-class model and preprocessor...")
try:
    print(f"Loading model from: {MODEL_PATH}")
    model = joblib.load(MODEL_PATH)
    print(f"Loading preprocessor from: {PREPROCESSOR_PATH}")
    preprocessor_data = joblib.load(PREPROCESSOR_PATH)
    scaler = preprocessor_data['scaler']
    feature_columns = preprocessor_data['feature_columns']
    label_encoder = preprocessor_data['label_encoder']
    classes = list(preprocessor_data['classes'])
    print(f" Multi-class model loaded successfully")
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

    model_config = {
        "protected_namespaces": ()
    }


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


class NetworkFlowSimple(BaseModel):
    destination_port: int
    flow_duration: int
    total_fwd_packets: int
    total_backward_packets: int
    flow_bytes_per_s: float
    flow_packets_per_s: float
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "destination_port": 80,
                "flow_duration": 12000,
                "total_fwd_packets": 10,
                "total_backward_packets": 5,
                "flow_bytes_per_s": 1500.5,
                "flow_packets_per_s": 25.3
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
            "/predict/simple": "Predict with 6 critical features",
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


@app.post("/predict/simple", response_model=PredictionResponse)
def predict_simple(flow: NetworkFlowSimple):
    if model is None or scaler is None or feature_columns is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        full_features = {col: 0.0 for col in feature_columns}

        feature_mapping = {
            'Destination Port': flow.destination_port,
            'Flow Duration': flow.flow_duration,
            'Total Fwd Packets': flow.total_fwd_packets,
            'Total Backward Packets': flow.total_backward_packets,
            'Flow Bytes/s': flow.flow_bytes_per_s,
            'Flow Packets/s': flow.flow_packets_per_s,
        }

        for feature_name, value in feature_mapping.items():
            if feature_name in full_features:
                full_features[feature_name] = value

        total_packets = flow.total_fwd_packets + flow.total_backward_packets
        full_features['Total Length of Fwd Packets'] = flow.total_fwd_packets * 500
        full_features['Total Length of Bwd Packets'] = flow.total_backward_packets * 500

        if total_packets > 0:
            full_features['Fwd Packet Length Mean'] = 500
            full_features['Bwd Packet Length Mean'] = 500
            full_features['Flow IAT Mean'] = flow.flow_duration / max(total_packets, 1)

        input_df = pd.DataFrame([full_features])
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
            model_used="Random Forest Multi-Class (Simplified Input)",
            timestamp=datetime.now().isoformat()
        )

        if result.confidence < 0.6:
            result.warning = "Low confidence with simplified features - results could be less accurate"

        return result
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)