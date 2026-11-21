import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { config } from '../config';
import { computeBiometricCommitment, wipeEphemeralBiometricData } from '../privacy';
import { blockchainService } from '../blockchain';

export const webhookRouter = Router();

/**
 * Validates Razorpay Webhook HMAC SHA256 Signature
 */
function verifyRazorpaySignature(body: string, signature: string, secret: string): boolean {
  if (!signature || !secret) return false;
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));
  } catch {
    return false;
  }
}

/**
 * POST /api/webhook/razorpay
 * Listens for Razorpay payment.captured events, ephemerally computes
 * a privacy-preserving biometric commitment, and mints a Soulbound TruePassTicket.
 */
webhookRouter.post('/razorpay', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    // Verify signature (allows test bypass if secret is not set or in test header)
    const isTestBypass = req.headers['x-test-mode'] === 'true' && config.mockBiometrics;
    if (!isTestBypass && config.razorpayWebhookSecret) {
      const isValid = verifyRazorpaySignature(rawBody, signature, config.razorpayWebhookSecret);
      if (!isValid) {
        console.warn('[Webhook] Invalid Razorpay webhook signature received.');
        return res.status(400).json({ error: 'Invalid Razorpay signature' });
      }
    }

    const { event, payload } = req.body;
    console.log(`[Webhook] Received Razorpay event: ${event}`);

    if (event !== 'payment.captured') {
      return res.status(200).json({ status: 'ignored', message: `Event ${event} not processed` });
    }

    const payment = payload?.payment?.entity;
    if (!payment) {
      return res.status(400).json({ error: 'Missing payment entity in payload' });
    }

    const orderId = payment.order_id || payment.id;
    const notes = payment.notes || {};

    // Extract checkout parameters from notes
    const eventId = notes.eventId || notes.event_id || 'EVT-GLOBAL-2026';
    const recipientAddress = notes.recipientAddress || notes.wallet || notes.userAddress || '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
    const tokenId = notes.tokenId || notes.ticketId || Math.floor(1000 + Math.random() * 9000);
    const ephemeralBiometricToken = notes.biometricToken || notes.faceEmbedding || null;

    console.log(`[Webhook] Processing payment ${payment.id} for Order #${orderId}, Event: ${eventId}, Recipient: ${recipientAddress}`);

    // REQUIREMENT 1 & 2: Process biometric embedding ephemerally in memory
    // and generate salted commitment hash (never persisting raw template)
    const { commitment, eventSalt, bindingContextHash } = computeBiometricCommitment({
      biometricToken: ephemeralBiometricToken,
      eventId,
      orderId,
      ticketId: tokenId,
      recipientAddress,
      mockMode: config.mockBiometrics,
    });

    // Enforce immediate in-memory wipe of raw notes if present
    if (notes.biometricToken) {
      wipeEphemeralBiometricData(notes.biometricToken);
      delete notes.biometricToken;
    }
    if (notes.faceEmbedding) {
      wipeEphemeralBiometricData(notes.faceEmbedding);
      delete notes.faceEmbedding;
    }

    console.log(`[Webhook] Generated Privacy Commitment for Ticket #${tokenId}:`);
    console.log(`  Commitment (bytes32): ${commitment}`);
    console.log(`  Event Salt:           ${eventSalt}`);
    console.log(`  Binding Context Hash: ${bindingContextHash}`);

    // REQUIREMENT 3: Mint Soulbound ticket with MINTER_ROLE
    const mintResult = await blockchainService.mintTicket({
      to: recipientAddress,
      tokenId,
      eventId,
      biometricCommitment: commitment,
    });

    return res.status(200).json({
      success: true,
      event: 'payment.captured',
      paymentId: payment.id,
      orderId,
      tokenId: String(tokenId),
      eventId,
      recipientAddress,
      biometricCommitment: commitment,
      txHash: mintResult.txHash,
      simulated: mintResult.simulated,
    });
  } catch (err: any) {
    console.error('[Webhook Error]', err);
    return res.status(500).json({ error: err.message || 'Internal webhook error' });
  }
});
