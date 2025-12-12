import boto3
import gzip
from datetime import datetime, timedelta
from io import BytesIO
import logging

logger = logging.getLogger(__name__)

class VPCFlowLogParser:
    def __init__(self, bucket_name):
        self.s3_client = boto3.client('s3')
        self.bucket_name = bucket_name
        
    def get_recent_flows(self, minutes=10):
        try:
            sts = boto3.client('sts')
            account_id = sts.get_caller_identity()['Account']
            
            now = datetime.utcnow()
            
            prefix = f"AWSLogs/{account_id}/vpcflowlogs/us-east-1/{now.year}/{now.month:02d}/{now.day:02d}/"
            
            logger.info(f"Searching for logs in: {prefix}")
            
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=prefix,
                MaxKeys=10
            )
            
            flows = []
            for obj in response.get('Contents', [])[-5:]:
                log_flows = self._parse_log_file(obj['Key'])
                flows.extend(log_flows)
            
            logger.info(f"Retrieved {len(flows)} flows from S3")
            return flows[:50]
            
        except Exception as e:
            logger.error(f"Error getting flows: {e}")
            return []
    
    def _parse_log_file(self, key):
        flows = []
        
        try:
            response = self.s3_client.get_object(
                Bucket=self.bucket_name,
                Key=key
            )
            
            if key.endswith('.gz'):
                with gzip.open(BytesIO(response['Body'].read())) as f:
                    lines = f.read().decode('utf-8').split('\n')
            else:
                lines = response['Body'].read().decode('utf-8').split('\n')
            
            header = None
            for line in lines:
                if line.startswith('version'):
                    header = line.split()
                elif line.strip() and header:
                    flow = self._parse_flow_line(line, header)
                    if flow and flow.get('action') != 'NODATA':
                        flows.append(flow)
            
            return flows
            
        except Exception as e:
            logger.error(f"Error parsing file {key}: {e}")
            return []
    
    def _parse_flow_line(self, line, header):
        try:
            values = line.split()
            if len(values) != len(header):
                return None
            
            flow = dict(zip(header, values))
            
            return {
                'srcaddr': flow.get('srcaddr', '0.0.0.0'),
                'dstaddr': flow.get('dstaddr', '0.0.0.0'),
                'srcport': int(flow.get('srcport', 0)),
                'dstport': int(flow.get('dstport', 0)),
                'protocol': int(flow.get('protocol', 0)),
                'packets': int(flow.get('packets', 0)),
                'bytes': int(flow.get('bytes', 0)),
                'start': int(flow.get('start', 0)),
                'end': int(flow.get('end', 0)),
                'action': flow.get('action', 'UNKNOWN'),
            }
            
        except Exception as e:
            return None
    
    def flow_to_ml_features(self, flow):
        
        duration = max(flow['end'] - flow['start'], 1)
        bytes_per_sec = flow['bytes'] / duration if duration > 0 else 0
        packets_per_sec = flow['packets'] / duration if duration > 0 else 0
        
        features = {
            'Destination Port': flow['dstport'],
            'Flow Duration': duration * 1000000,
            'Total Fwd Packets': flow['packets'],
            'Total Backward Packets': 0,
            'Flow Bytes/s': bytes_per_sec,
            'Flow Packets/s': packets_per_sec,
            'Total Length of Fwd Packets': flow['bytes'],
            'Total Length of Bwd Packets': 0,
            'Fwd Packet Length Mean': flow['bytes'] / max(flow['packets'], 1),
            'Bwd Packet Length Mean': 0,
            'Flow IAT Mean': duration / max(flow['packets'], 1),
            'Protocol': flow['protocol'],
        }
        
        default_features = [
            'Fwd Packet Length Max', 'Fwd Packet Length Min', 'Fwd Packet Length Std',
            'Bwd Packet Length Max', 'Bwd Packet Length Min', 'Bwd Packet Length Std',
            'Flow IAT Max', 'Flow IAT Min', 'Flow IAT Std',
            'Fwd IAT Total', 'Fwd IAT Max', 'Fwd IAT Min', 'Fwd IAT Std',
            'Bwd IAT Total', 'Bwd IAT Max', 'Bwd IAT Min', 'Bwd IAT Std',
            'Fwd PSH Flags', 'Bwd PSH Flags', 'Fwd URG Flags', 'Bwd URG Flags',
            'Fwd Header Length', 'Bwd Header Length',
            'Fwd Packets/s', 'Bwd Packets/s',
            'Packet Length Min', 'Packet Length Max', 'Packet Length Mean', 
            'Packet Length Std', 'Packet Length Variance',
            'FIN Flag Count', 'SYN Flag Count', 'RST Flag Count', 'PSH Flag Count',
            'ACK Flag Count', 'URG Flag Count', 'CWE Flag Count', 'ECE Flag Count',
            'Down/Up Ratio', 'Average Packet Size', 'Fwd Segment Size Avg',
            'Bwd Segment Size Avg', 'Fwd Bytes/Bulk Avg', 'Fwd Packet/Bulk Avg',
            'Fwd Bulk Rate Avg', 'Bwd Bytes/Bulk Avg', 'Bwd Packet/Bulk Avg',
            'Bwd Bulk Rate Avg', 'Subflow Fwd Packets', 'Subflow Fwd Bytes',
            'Subflow Bwd Packets', 'Subflow Bwd Bytes', 'Init Fwd Win Bytes',
            'Init Bwd Win Bytes', 'Fwd Act Data Packets', 'Fwd Seg Size Min',
            'Active Mean', 'Active Std', 'Active Max', 'Active Min',
            'Idle Mean', 'Idle Std', 'Idle Max', 'Idle Min'
        ]
        
        for feature in default_features:
            features[feature] = 0.0
        
        return features


_flow_parser = None

def get_flow_parser():
    global _flow_parser
    if _flow_parser is None:
        import os
        bucket = os.getenv('VPC_FLOW_BUCKET')
        if not bucket:
            raise ValueError("VPC_FLOW_BUCKET environment variable is required")
        _flow_parser = VPCFlowLogParser(bucket)
    return _flow_parser