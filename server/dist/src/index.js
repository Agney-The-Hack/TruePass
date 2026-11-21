"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const config_1 = require("./config");
const webhook_1 = require("./routes/webhook");
const gate_1 = require("./routes/gate");
const privacy_1 = require("./privacy");
exports.app = (0, express_1.default)();
// Enable CORS for frontend integration
exports.app.use((0, cors_1.default)());
// Parse JSON with raw body preservation for Razorpay webhook HMAC validation
exports.app.use(express_1.default.json({
    verify: (req, _res, buf) => {
        req.rawBody = buf.toString('utf8');
    },
}));
exports.app.use(express_1.default.urlencoded({ extended: true }));
// Health and Status Check
exports.app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        service: 'TruePass Privacy-Preserving Biometric Commitment Server',
        mockBiometrics: config_1.config.mockBiometrics,
        contractAddress: config_1.config.contractAddress,
        timestamp: new Date().toISOString(),
    });
});
// Ephemeral commitment generator endpoint for frontend clients (never saves to DB!)
exports.app.post('/api/privacy/commit', (req, res) => {
    try {
        const { biometricToken, eventId, orderId, ticketId, recipientAddress } = req.body;
        if (!eventId || !recipientAddress) {
            return res.status(400).json({ error: 'eventId and recipientAddress are required' });
        }
        const result = (0, privacy_1.computeBiometricCommitment)({
            biometricToken,
            eventId,
            orderId,
            ticketId,
            recipientAddress,
            mockMode: config_1.config.mockBiometrics,
        });
        return res.json(result);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// Routes
exports.app.use('/api/webhook', webhook_1.webhookRouter);
exports.app.use('/api/gate', gate_1.gateRouter);
// Start server if not running in test runner
if (process.env.NODE_ENV !== 'test') {
    exports.app.listen(config_1.config.port, () => {
        console.log('==========================================================');
        console.log('  TruePass Privacy-Preserving Biometric Server            ');
        console.log(`  Port:             ${config_1.config.port}                        `);
        console.log(`  Dev Mock Mode:    ${config_1.config.mockBiometrics ? 'ENABLED (MOCK_BIOMETRICS=true)' : 'DISABLED'}`);
        console.log(`  Contract Address: ${config_1.config.contractAddress}             `);
        console.log(`  RPC URL:          ${config_1.config.rpcUrl}                      `);
        console.log('  Endpoints:                                              ');
        console.log('    • POST /api/webhook/razorpay (Payment -> Mint)        ');
        console.log('    • POST /api/gate/check-in    (Biometrics -> Redeem)   ');
        console.log('    • POST /api/privacy/commit   (Ephemeral Commitment)   ');
        console.log('    • GET  /api/health           (Status check)           ');
        console.log('==========================================================');
    });
}
