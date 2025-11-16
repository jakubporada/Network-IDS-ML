import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import joblib

class NetworkDataProcessor:
    """
    Handles all data preprocessing for the Network IDS project
    """
    
    def __init__(self):
        self.scaler = StandardScaler()
        self.feature_columns = None
        
    def load_multiple_files(self, file_paths):
        """Load and combine multiple CSV files"""
        print("Loading data files...")
        dfs = []
        for file_path in file_paths:
            print(f"  Loading {file_path.split('/')[-1]}...")
            df = pd.read_csv(file_path)
            dfs.append(df)
        
        combined_df = pd.concat(dfs, ignore_index=True)
        print(f"✓ Loaded {len(combined_df):,} total rows")
        return combined_df
    
    def clean_column_names(self, df):
        """Remove leading/trailing spaces from column names"""
        df.columns = df.columns.str.strip()
        print(f"✓ Cleaned {len(df.columns)} column names")
        return df
    
    def handle_infinity_and_missing(self, df):
        """Replace infinity values and handle missing data"""
        print("\nCleaning data...")
        
        # Replace infinity with NaN
        df = df.replace([np.inf, -np.inf], np.nan)
        
        # Count issues before cleaning
        missing_before = df.isnull().sum().sum()
        print(f"  Found {missing_before:,} missing/infinity values")
        
        # Drop rows with NaN (small percentage, won't hurt)
        df = df.dropna()
        
        print(f"✓ Cleaned data: {len(df):,} rows remaining")
        return df
    
    def remove_duplicates(self, df):
        """Remove duplicate rows"""
        before = len(df)
        df = df.drop_duplicates()
        removed = before - len(df)
        print(f"✓ Removed {removed:,} duplicate rows")
        return df
    
    def create_binary_labels(self, df):
        """Create binary labels: 0 = BENIGN, 1 = ATTACK"""
        df['is_attack'] = (df['Label'] != 'BENIGN').astype(int)
        
        print(f"\nLabel distribution:")
        print(f"  BENIGN: {(df['is_attack'] == 0).sum():,} ({(df['is_attack'] == 0).sum() / len(df) * 100:.1f}%)")
        print(f"  ATTACK: {(df['is_attack'] == 1).sum():,} ({(df['is_attack'] == 1).sum() / len(df) * 100:.1f}%)")
        
        return df
    
    def prepare_features(self, df):
        """Separate features from labels"""
        # Drop non-numeric and label columns
        X = df.drop(['Label', 'is_attack'], axis=1, errors='ignore')
        
        # Keep only numeric columns
        X = X.select_dtypes(include=[np.number])
        
        # Store feature names
        self.feature_columns = X.columns.tolist()
        
        y = df['is_attack']
        
        print(f"\n✓ Prepared {len(self.feature_columns)} features")
        return X, y
    
    def split_data(self, X, y, test_size=0.2, random_state=42):
        """Split into train and test sets"""
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, 
            test_size=test_size, 
            random_state=random_state,
            stratify=y  # Maintain class distribution
        )
        
        print(f"\n✓ Train set: {len(X_train):,} rows")
        print(f"✓ Test set: {len(X_test):,} rows")
        
        return X_train, X_test, y_train, y_test
    
    def scale_features(self, X_train, X_test):
        """Scale features using StandardScaler"""
        print("\nScaling features...")
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        print("✓ Features scaled")
        return X_train_scaled, X_test_scaled
    
    def save_preprocessor(self, filepath='models/preprocessor.pkl'):
        """Save the scaler and feature names"""
        joblib.dump({
            'scaler': self.scaler,
            'feature_columns': self.feature_columns
        }, filepath)
        print(f"✓ Saved preprocessor to {filepath}")
    
    def full_pipeline(self, file_paths, save_path='models/'):
        """Run the complete preprocessing pipeline"""
        print("="*70)
        print("NETWORK IDS - DATA PREPROCESSING PIPELINE")
        print("="*70)
        
        # Load data
        df = self.load_multiple_files(file_paths)
        
        # Clean
        df = self.clean_column_names(df)
        df = self.handle_infinity_and_missing(df)
        df = self.remove_duplicates(df)
        
        # Create labels
        df = self.create_binary_labels(df)
        
        # Prepare features
        X, y = self.prepare_features(df)
        
        # Split data
        X_train, X_test, y_train, y_test = self.split_data(X, y)
        
        # Scale features
        X_train_scaled, X_test_scaled = self.scale_features(X_train, X_test)
        
        # Save preprocessor
        self.save_preprocessor(f'{save_path}preprocessor.pkl')
        
        print("\n" + "="*70)
        print("PREPROCESSING COMPLETE!")
        print("="*70)
        
        return X_train_scaled, X_test_scaled, y_train, y_test
