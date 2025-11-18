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
        print("Loading data files...")
        dfs = []
        for file_path in file_paths:
            print(f"  Loading {file_path.split('/')[-1]}...")
            df = pd.read_csv(file_path)
            dfs.append(df)
        
        combined_df = pd.concat(dfs, ignore_index=True)
        print(f" Loaded {len(combined_df):,} total rows")
        return combined_df
    
    def clean_column_names(self, df):
        """Remove leading/trailing spaces from column names"""
        df.columns = df.columns.str.strip()
        print(f" Cleaned {len(df.columns)} column names")
        return df
    
    def handle_infinity_and_missing(self, df):
        """Replace infinity values and handle missing data"""
        print("\nCleaning data...")
        
        df = df.replace([np.inf, -np.inf], np.nan)
        
        missing_before = df.isnull().sum().sum()
        print(f"  Found {missing_before:,} missing/infinity values")
        
        df = df.dropna()
        
        print(f" Cleaned data: {len(df):,} rows remaining")
        return df
    
    def remove_duplicates(self, df):
        before = len(df)
        df = df.drop_duplicates()
        removed = before - len(df)
        print(f" Removed {removed:,} duplicate rows")
        return df
    
    def create_binary_labels(self, df):
        """Create binary labels: 0 = BENIGN, 1 = ATTACK"""
        df['is_attack'] = (df['Label'] != 'BENIGN').astype(int)
        
        print(f"\nLabel distribution:")
        print(f"  BENIGN: {(df['is_attack'] == 0).sum():,} ({(df['is_attack'] == 0).sum() / len(df) * 100:.1f}%)")
        print(f"  ATTACK: {(df['is_attack'] == 1).sum():,} ({(df['is_attack'] == 1).sum() / len(df) * 100:.1f}%)")
        
        return df
    
    def prepare_features(self, df):
        X = df.drop(['Label', 'is_attack'], axis=1, errors='ignore')
        
        X = X.select_dtypes(include=[np.number])
        
        self.feature_columns = X.columns.tolist()
        
        y = df['is_attack']
        
        print(f"\n Prepared {len(self.feature_columns)} features")
        return X, y
    
    def split_data(self, X, y, test_size=0.2, random_state=42):
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, 
            test_size=test_size, 
            random_state=random_state,
            stratify=y
        )
        
        print(f"\n Train set: {len(X_train):,} rows")
        print(f" Test set: {len(X_test):,} rows")
        
        return X_train, X_test, y_train, y_test
    
    def scale_features(self, X_train, X_test):
        print("\nScaling features...")
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        print(" Features scaled")
        return X_train_scaled, X_test_scaled
    
    def save_preprocessor(self, filepath='models/preprocessor.pkl'):
        joblib.dump({
            'scaler': self.scaler,
            'feature_columns': self.feature_columns
        }, filepath)
        print(f" Saved preprocessor to {filepath}")
    
    def full_pipeline(self, file_paths, save_path='models/'):
        print("="*70)
        print("NETWORK IDS - DATA PREPROCESSING PIPELINE")
        print("="*70)
        
        df = self.load_multiple_files(file_paths)
        
        df = self.clean_column_names(df)
        df = self.handle_infinity_and_missing(df)
        df = self.remove_duplicates(df)
        
        df = self.create_binary_labels(df)
        
        X, y = self.prepare_features(df)
        
        X_train, X_test, y_train, y_test = self.split_data(X, y)
        
        X_train_scaled, X_test_scaled = self.scale_features(X_train, X_test)
        
        self.save_preprocessor(f'{save_path}preprocessor.pkl')
        
        print("\n" + "="*70)
        print("PREPROCESSING COMPLETE!")
        print("="*70)
        
        return X_train_scaled, X_test_scaled, y_train, y_test
