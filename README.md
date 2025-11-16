# Network Intrusion Detection System

ML-powered network intrusion detection system that identifies DDoS attacks with **99.99% accuracy** using Random Forest classification on network flow data.

## Overview

This project implements a full-stack machine learning system for detecting Distributed Denial of Service (DDoS) attacks in network traffic. It achieves 99.99% accuracy with only a 0.01% false positive rate, making it suitable for production security operations.

##  Architecture
```
┌─────────────────┐
│  Network Data   │ (Wireshark PCAP → CICFlowMeter)
└────────┬────────┘
         │ CSV with 78 features
         ▼
┌─────────────────┐
│   React UI      │ (File upload, results display)
│  (localhost:3000)│
└────────┬────────┘
         │ HTTP POST
         ▼
┌─────────────────┐
│  FastAPI Server │ (Prediction endpoint)
│  (localhost:8000)│
└────────┬────────┘
         │ Feature scaling
         ▼
┌─────────────────┐
│ Random Forest   │ (99.99% accuracy)
│ Model (.pkl)    │
└─────────────────┘
```

---

## Model Performance

Trained on CICIDS2017 DDoS dataset with 223,082 network flows.

### Results on Test Set (44,617 flows):

| Metric | Random Forest | Gradient Boosting | Logistic Regression |
|--------|--------------|-------------------|---------------------|
| **Accuracy** | **99.99%** | 99.98% | 99.80% |
| **Precision** | **100%** | 99.97% | 99.76% |
| **Recall** | 99.99% | 99.99% | 99.90% |
| **F1-Score** | 99.99% | 99.98% | 99.83% |
| **False Positive Rate** | **0.01%** | 0.04% | 0.33% |

**Confusion Matrix (Random Forest):**
- True Negatives: 19,013 (correctly identified benign)
- False Positives: **1** (only 1 false alarm out of 19,014!)
- False Negatives: 3 (missed 3 attacks out of 25,603)
- True Positives: 25,600

---

## Project Structure
```
NetworkIDS/
├── data/
│   └── processed/          # Preprocessed train/test data
├── models/
│   ├── random_forest.pkl           # Trained Random Forest model
│   ├── gradient_boosting.pkl       # Trained Gradient Boosting model
│   ├── logistic_regression.pkl     # Trained Logistic Regression model
│   ├── preprocessor.pkl            # Feature scaler + column names
│   └── model_results.json          # Performance metrics
├── notebooks/
│   ├── 01_initial_exploration.ipynb    # Data exploration
│   ├── 02_preprocessing.ipynb          # Data cleaning pipeline
│   └── 03_model_training.ipynb         # Model training & evaluation
├── src/
│   ├── api/
│   │   └── main.py                 # FastAPI server
│   ├── models/
│   │   └── train_models.py         # Model training classes
│   └── preprocessing/
│       └── data_processor.py       # Data preprocessing pipeline
├── frontend/
│   ├── src/
│   │   ├── App.js
│   │   ├── FileUpload.js           # Main UI component
│   │   └── App.css                 # Styles
│   └── package.json
├── requirements.txt
└── README.md
```

---
