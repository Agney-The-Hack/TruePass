import { Router, Request, Response } from 'express';
import { config } from '../config';
import { computeBiometricCommitment, wipeEphemeralBiometricData } from '../privacy';
import { blockchainService } from '../blockchain';

export const gateRouter = Router();

/**
 * POST /api/gate/check-in
 * Verifies live attendee biometric scan at venue turnstile and executes redeemTicket on-chain.
 */
gateRouter.post('/check-in', async (req: Request, res: Response) => {
  try {
    const { tokenId, eventId, recipientAddress, biometricToken, orderId } = req.body;

    if (!tokenId || !eventId) {
      return res.status(400).json({ error: 'Missing required fields: tokenId and eventId are mandatory.' });
    }

    console.log(`[Gate Check-In] Verifying ticket #${tokenId} at Event: ${eventId}...`);

    // Fetch existing ticket
    const ticket = await blockchainService.getTicket(tokenId);
    if (!ticket) {
      return res.status(404).json({
        status: 'ACCESS_DENIED',
        error: `Ticket #${tokenId} does not exist in blockchain registry.`,
      });
    }

    if (ticket.isRedeemed) {
      return res.status(409).json({
        status: 'ACCESS_DENIED',
        error: `Ticket #${tokenId} has already been redeemed! Turnstile locked.`,
        redeemedAt: ticket.redeemedAt,
      });
    }

    const ownerAddress = recipientAddress || ticket.owner;

    // REQUIREMENT 1 & 2: Ephemerally compute live candidate commitment
    const { commitment: liveCommitment } = computeBiometricCommitment({
      biometricToken,
      eventId,
      orderId: orderId || ticket.tokenId,
      ticketId: tokenId,
      recipientAddress: ownerAddress,
      mockMode: config.mockBiometrics,
    });

    // Enforce immediate in-memory wipe of live raw biometric input
    if (biometricToken) {
      wipeEphemeralBiometricData(biometricToken);
      if (req.body.biometricToken) delete req.body.biometricToken;
    }

    console.log(`[Gate Check-In] Comparing commitments for Ticket #${tokenId}:`);
    console.log(`  On-chain Ticket Commitment: ${ticket.biometricCommitment}`);
    console.log(`  Live Turnstile Commitment:   ${liveCommitment}`);

    // Verify commitment match
    if (ticket.biometricCommitment.toLowerCase() !== liveCommitment.toLowerCase()) {
      return res.status(403).json({
        status: 'ACCESS_DENIED',
        error: 'Biometric commitment mismatch. Live scan does not match ticket owner commitment.',
        tokenId: String(tokenId),
        eventId,
      });
    }

    // REQUIREMENT 3: Redeem ticket on-chain using REDEEMER_ROLE
    const redeemResult = await blockchainService.redeemTicket({
      tokenId,
      liveBiometricCommitment: liveCommitment,
    });

    return res.status(200).json({
      status: 'ACCESS_GRANTED',
      message: 'Turnstile unlocked! Biometric commitment verified on-chain.',
      tokenId: String(tokenId),
      eventId,
      owner: ownerAddress,
      liveBiometricCommitment: liveCommitment,
      txHash: redeemResult.txHash,
      simulated: redeemResult.simulated,
    });
  } catch (err: any) {
    console.error('[Gate Check-In Error]', err);
    return res.status(500).json({
      status: 'ERROR',
      error: err.message || 'Gate verification failed',
    });
  }
});

/**
 * POST /api/gate/verify-commitment
 * Read-only check for UI previews without mutating state on-chain.
 */
gateRouter.post('/verify-commitment', async (req: Request, res: Response) => {
  try {
    const { tokenId, eventId, recipientAddress, biometricToken, orderId } = req.body;
    const ticket = await blockchainService.getTicket(tokenId);

    if (!ticket) {
      return res.status(404).json({ isValid: false, error: 'Ticket not found' });
    }

    const { commitment } = computeBiometricCommitment({
      biometricToken,
      eventId,
      orderId: orderId || ticket.tokenId,
      ticketId: tokenId,
      recipientAddress: recipientAddress || ticket.owner,
      mockMode: config.mockBiometrics,
    });

    const matches = ticket.biometricCommitment.toLowerCase() === commitment.toLowerCase();
    return res.status(200).json({
      tokenId: String(tokenId),
      isValid: matches,
      isRedeemed: ticket.isRedeemed,
      matchedCommitment: matches ? commitment : null,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
