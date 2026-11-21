import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Look for .env in current working dir, parent, or project root
const candidateEnvPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../../.env'),
];

for (const p of candidateEnvPaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}

export interface AppConfig {
  port: number;
  biometricSaltSecret: string;
  mockBiometrics: boolean;
  contractAddress: string;
  rpcUrl: string;
  relayerPrivateKey: string;
  razorpayWebhookSecret: string;
}

export const config: AppConfig = {
  port: parseInt(process.env.PORT || '4000', 10),
  biometricSaltSecret: process.env.BIOMETRIC_SALT_SECRET || 'truepass_default_salt_secret_fallback_key',
  mockBiometrics: (process.env.MOCK_BIOMETRICS || '').toLowerCase() === 'true',
  contractAddress: process.env.TRUE_PASS_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',
  rpcUrl: process.env.RPC_URL || 'http://127.0.0.1:8545',
  relayerPrivateKey: process.env.RELAYER_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_webhook_secret_truepass_test_2026',
};
