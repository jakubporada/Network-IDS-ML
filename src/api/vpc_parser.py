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
        """Convert VPC Flow Log to ML features"""
        
        duration = max(flow['end'] - flow['start'], 1)
        bytes_per_sec = flow['bytes'] / duration if duration > 0 else 0
        packets_per_sec = flow['packets'] / duration if duration > 0 else 0
        avg_packet_size = flow['bytes'] / max(flow['packets'], 1)
        
        features = {
            'Destination Port': float(flow['dstport']),
            'Flow Duration': float(duration * 1000000),
            'Total Fwd Packets': float(flow['packets']),
            'Total Backward Packets': 0.0,
            'Total Length of Fwd Packets': float(flow['bytes']),
            'Total Length of Bwd Packets': 0.0,
            'Fwd Packet Length Max': float(avg_packet_size),
            'Fwd Packet Length Min': float(avg_packet_size),
            'Fwd Packet Length Mean': float(avg_packet_size),
            'Fwd Packet Length Std': 0.0,
            'Bwd Packet Length Max': 0.0,
            'Bwd Packet Length Min': 0.0,
            'Bwd Packet Length Mean': 0.0,
            'Bwd Packet Length Std': 0.0,
            'Flow Bytes/s': float(bytes_per_sec),
            'Flow Packets/s': float(packets_per_sec),
            'Flow IAT Mean': float(duration / max(flow['packets'], 1)),
            'Flow IAT Std': 0.0,
            'Flow IAT Max': float(duration),
            'Flow IAT Min': 0.0,
            'Fwd IAT Total': float(duration),
            'Fwd IAT Mean': float(duration / max(flow['packets'], 1)),
            'Fwd IAT Std': 0.0,
            'Fwd IAT Max': float(duration),
            'Fwd IAT Min': 0.0,
            'Bwd IAT Total': 0.0,
            'Bwd IAT Mean': 0.0,
            'Bwd IAT Std': 0.0,
            'Bwd IAT Max': 0.0,
            'Bwd IAT Min': 0.0,
            'Fwd PSH Flags': 0.0,
            'Bwd PSH Flags': 0.0,
            'Fwd URG Flags': 0.0,
            'Bwd URG Flags': 0.0,
            'Fwd Header Length': 40.0,
            'Bwd Header Length': 0.0,
            'Fwd Packets/s': float(packets_per_sec),
            'Bwd Packets/s': 0.0,
            'Min Packet Length': float(avg_packet_size),
            'Max Packet Length': float(avg_packet_size),
            'Packet Length Mean': float(avg_packet_size),
            'Packet Length Std': 0.0,
            'Packet Length Variance': 0.0,
            'FIN Flag Count': 0.0,
            'SYN Flag Count': 1.0 if flow['packets'] == 1 else 0.0,
            'RST Flag Count': 1.0 if flow['action'] == 'REJECT' else 0.0,
            'PSH Flag Count': 0.0,
            'ACK Flag Count': 0.0,
            'URG Flag Count': 0.0,
            'CWE Flag Count': 0.0,
            'ECE Flag Count': 0.0,
            'Down/Up Ratio': 0.0,
            'Average Packet Size': float(avg_packet_size),
            'Avg Fwd Segment Size': float(avg_packet_size),
            'Avg Bwd Segment Size': 0.0,
            'Fwd Header Length.1': 40.0,
            'Fwd Avg Bytes/Bulk': 0.0,
            'Fwd Avg Packets/Bulk': 0.0,
            'Fwd Avg Bulk Rate': 0.0,
            'Bwd Avg Bytes/Bulk': 0.0,
            'Bwd Avg Packets/Bulk': 0.0,
            'Bwd Avg Bulk Rate': 0.0,
            'Subflow Fwd Packets': float(flow['packets']),
            'Subflow Fwd Bytes': float(flow['bytes']),
            'Subflow Bwd Packets': 0.0,
            'Subflow Bwd Bytes': 0.0,
            'Init_Win_bytes_forward': 8192.0,
            'Init_Win_bytes_backward': 0.0,
            'act_data_pkt_fwd': float(flow['packets']),
            'min_seg_size_forward': 20.0,
            'Active Mean': 0.0,
            'Active Std': 0.0,
            'Active Max': 0.0,
            'Active Min': 0.0,
            'Idle Mean': 0.0,
            'Idle Std': 0.0,
            'Idle Max': 0.0,
            'Idle Min': 0.0,
            'Protocol': float(flow['protocol']),
        }
        
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