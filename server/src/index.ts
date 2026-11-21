import express from 'express';
import cors from 'cors';
import { config } from './config';
import { webhookRouter } from './routes/webhook';
import { gateRouter } from './routes/gate';
import { computeBiometricCommitment } from './privacy';

export const app = express();

// Enable CORS for frontend integration
app.use(cors());

// Parse JSON with raw body preservation for Razorpay webhook HMAC validation
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf.toString('utf8');
    },
  })
);

app.use(express.urlencoded({ extended: true }));

// Health and Status Check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'TruePass Privacy-Preserving Biometric Commitment Server',
    mockBiometrics: config.mockBiometrics,
    contractAddress: config.contractAddress,
    timestamp: new Date().toISOString(),
  });
});

// Ephemeral commitment generator endpoint for frontend clients (never saves to DB!)
app.post('/api/privacy/commit', (req, res) => {
  try {
    const { biometricToken, eventId, orderId, ticketId, recipientAddress } = req.body;
    if (!eventId || !recipientAddress) {
      return res.status(400).json({ error: 'eventId and recipientAddress are required' });
    }
    const result = computeBiometricCommitment({
      biometricToken,
      eventId,
      orderId,
      ticketId,
      recipientAddress,
      mockMode: config.mockBiometrics,
    });
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Routes
app.use('/api/webhook', webhookRouter);
app.use('/api/gate', gateRouter);

// Start server if not running in test runner
if (process.env.NODE_ENV !== 'test') {
  app.listen(config.port, () => {
    console.log('==========================================================');
    console.log('  TruePass Privacy-Preserving Biometric Server            ');
    console.log(`  Port:             ${config.port}                        `);
    console.log(`  Dev Mock Mode:    ${config.mockBiometrics ? 'ENABLED (MOCK_BIOMETRICS=true)' : 'DISABLED'}`);
    console.log(`  Contract Address: ${config.contractAddress}             `);
    console.log(`  RPC URL:          ${config.rpcUrl}                      `);
    console.log('  Endpoints:                                              ');
    console.log('    • POST /api/webhook/razorpay (Payment -> Mint)        ');
    console.log('    • POST /api/gate/check-in    (Biometrics -> Redeem)   ');
    console.log('    • POST /api/privacy/commit   (Ephemeral Commitment)   ');
    console.log('    • GET  /api/health           (Status check)           ');
    console.log('==========================================================');
  });
}
