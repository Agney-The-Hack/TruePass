"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Look for .env in current working dir, parent, or project root
const candidateEnvPaths = [
    path_1.default.resolve(process.cwd(), '.env'),
    path_1.default.resolve(__dirname, '../.env'),
    path_1.default.resolve(__dirname, '../../.env'),
];
for (const p of candidateEnvPaths) {
    if (fs_1.default.existsSync(p)) {
        dotenv_1.default.config({ path: p });
        break;
    }
}
exports.config = {
    port: parseInt(process.env.PORT || '4000', 10),
    biometricSaltSecret: process.env.BIOMETRIC_SALT_SECRET || 'truepass_default_salt_secret_fallback_key',
    mockBiometrics: (process.env.MOCK_BIOMETRICS || '').toLowerCase() === 'true',
    contractAddress: process.env.TRUE_PASS_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',
    rpcUrl: process.env.RPC_URL || 'http://127.0.0.1:8545',
    relayerPrivateKey: process.env.RELAYER_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_webhook_secret_truepass_test_2026',
};
