from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score, 
    precision_score, 
    recall_score, 
    f1_score,
    confusion_matrix,
    classification_report,
    roc_auc_score
)
import numpy as np
import joblib
import json
import time

class IDSModelTrainer:

    def __init__(self):
        self.models = {
            'random_forest': RandomForestClassifier(
                n_estimators=100,
                max_depth=20,
                random_state=42,
                n_jobs=-1,
                verbose=1
            ),
            'gradient_boosting': GradientBoostingClassifier(
                n_estimators=100,
                max_depth=10,
                learning_rate=0.1,
                random_state=42,
                verbose=1
            ),
            'logistic_regression': LogisticRegression(
                max_iter=1000,
                random_state=42,
                n_jobs=-1,
                verbose=1
            )
        }

        self.trained_models = {}
        self.results = {}

    def train_single_model(self, model_name, model, X_train, y_train):
        print(f"/n{'='*60}")
        print(f"Training {model_name}...")
        print(f"{'='*60}")

        start_time = time.time()
        model.fit(X_train, y_train)
        training_time = time.time() - start_time
        
        print(f"Training completed in {training_time} seconds")

        return model, training_time
    
    def evaluate_model(self, model_name, model, X_test, y_test):
        print(f"\nEvaluating {model_name}...")

        #make predictions
        start_time = time.time()
        y_pred=model.predict(X_test)
        y_pred_proba = model.predict_proba(X_test)[:, 1]
        inference_time = time.time() - start_time

        #calc
        accuracy = accuracy_score(y_test, y_pred)
        precision = precision_score(y_test,y_pred)
        recall = recall_score(y_test, y_pred)
        f1 = f1_score(y_test, y_pred)
        auc_roc = roc_auc_score(y_test, y_pred)

        #matrix
        cm = confusion_matrix(y_test, y_pred)
        tn, fp, fn, tp = cm.ravel()

        fpr = fp / (fp + tn) if (fp + tn) > 0 else 0

        print(f"\n{model_name} Results:")
        print(f"  Accuracy:  {accuracy:.4f} ({accuracy*100:.2f}%)")
        print(f"  Precision: {precision:.4f} (of detected attacks, {precision*100:.1f}% were real)")
        print(f"  Recall:    {recall:.4f} (caught {recall*100:.1f}% of all attacks)")
        print(f"  F1-Score:  {f1:.4f}")
        print(f"  AUC-ROC:   {auc_roc:.4f}")
        print(f"  False Positive Rate: {fpr:.4f} ({fpr*100:.2f}%)")
        print(f"\n  Confusion Matrix:")
        print(f"    True Negatives:  {tn:,} (correctly identified benign)")
        print(f"    False Positives: {fp:,} (benign flagged as attack)")
        print(f"    False Negatives: {fn:,} (missed attacks)")
        print(f"    True Positives:  {tp:,} (correctly caught attacks)")
        print(f"\n  Inference time: {inference_time:.4f}s for {len(y_test):,} samples")
        print(f"  Per-sample: {(inference_time/len(y_test))*1000:.4f}ms")

        results = {
            'accuracy': float(accuracy),
            'precision': float(precision),
            'recall': float(recall),
            'f1_score': float(f1),
            'auc_roc': float(auc_roc),
            'false_positive_rate': float(fpr),
            'confusion_matrix': {
                'true_negatives': int(tn),
                'false_positives': int(fp),
                'false_negatives': int(fn),
                'true_positives': int(tp)
            },
            'inference_time_seconds': float(inference_time),
            'per_sample_ms': float((inference_time/len(y_test))*1000)
        }
        
        return results
    
    def train_all_models(self, X_train, y_train, X_test, y_test, save_path='../models/'):
        print("\n" + "="*70)
        print("NETWORK IDS MODEL TRAINING")
        print("="*70)
        print(f"\nTraining set size: {X_train.shape}")
        print(f"Test set size: {X_test.shape}")
        print(f"Number of features: {X_train.shape[1]}")

        for model_name, model in self.models.items():
            trained_model, training_time = self.train_single_model(
                model_name, model, X_train, y_train
            )

            results = self.evaluate_model(
                model_name, trained_model, X_test, y_test
            )

            results['training_time_seconds'] = training_time
#stores
            self.trained_models[model_name] = trained_model
            self.results[model_name] = results

        results_path = f'{save_path}model_results.json'
        with open(results_path, 'w') as f:
            json.dump(self.results, f, indent=2)
        print(f"\n Saved results to {results_path}")
            
        self.print_comparison()

        return self.trained_models, self.results
    
    def print_comparison(self):
        print("\n" + "="*70)
        print("MODEL COMPARISON")
        print("="*70)
        
        # Only compare models that have been trained
        trained_model_names = list(self.results.keys())
        
        if len(trained_model_names) < 2:
            print("Not enough models trained yet for comparison")
            return
        
        print(f"\n{'Metric':<25} ", end="")
        for name in trained_model_names:
            print(f"{name:<20} ", end="")
        print()
        print("-" * 70)
        
        metrics = ['accuracy', 'precision', 'recall', 'f1_score', 'auc_roc', 'false_positive_rate']
        
        for metric in metrics:
            print(f"{metric:<25} ", end="")
            for model_name in trained_model_names:
                value = self.results[model_name][metric]
                print(f"{value:<20.4f} ", end="")
            print()
        
        best_model = max(self.results.keys(), key=lambda x: self.results[x]['f1_score'])
        print(f"\n🏆 Best model (by F1-score): {best_model}")
        print("="*70)


    def get_feature_importance(self, model_name='random_forest', top_n=20):
        if model_name not in ['random_forest', 'gradient_boosting']:
            print(f"Feature importance not available for {model_name}")
            return None
        
        model = self.trained_models[model_name]
        importances = model.feature_importances_

        preprocessor = joblib.load('../models/preprocessor.pkl')
        feature_names = preprocessor['feature_columns']

        indices = np.argsort(importances)[::-1][:top_n]

        print(f"\nTop {top_n} Most Important Features ({model_name}):")
        print("-" * 60)
        for i, idx in enumerate(indices, 1):
            print(f"{i:2d}. {feature_names[idx]:<40} {importances[idx]:.4f}")
        
        return [(feature_names[i], importances[i]) for i in indices]