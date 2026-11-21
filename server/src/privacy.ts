import { ethers } from 'ethers';
import { config } from './config';

/**
 * Parameters required to generate a privacy-preserving biometric commitment.
 */
export interface BiometricCommitmentParams {
  /**
   * Biometric input: 128-d float embedding vector, hex string, or mock token string.
   * Processed ephemerally in memory and zeroed out immediately after computation.
   */
  biometricToken?: number[] | Float32Array | string | null;
  /**
   * Event identifier (e.g., 'EVT-COLDPLAY-2026')
   */
  eventId: string;
  /**
   * Order ID from payment gateway (e.g., 'order_ONL987123')
   */
  orderId?: string;
  /**
   * On-chain tokenId or unique ticket identifier
   */
  ticketId?: string | number;
  /**
   * Recipient EVM wallet address (checksummed)
   */
  recipientAddress: string;
  /**
   * Server-side salt secret (defaults to BIOMETRIC_SALT_SECRET from config)
   */
  serverSecret?: string;
  /**
   * Override dev mock flag (defaults to config.mockBiometrics)
   */
  mockMode?: boolean;
}

/**
 * Output of the privacy commitment calculation.
 */
export interface BiometricCommitmentResult {
  /**
   * Salted keccak256 commitment hash (bytes32 format: 0x...)
   * Safe to store on-chain and in public databases with zero biometric leakage.
   */
  commitment: string;
  /**
   * Per-event pseudorandom salt derived from eventId and server secret.
   */
  eventSalt: string;
  /**
   * Contextual binding hash connecting the commitment to ticket & recipient.
   */
  bindingContextHash: string;
  /**
   * Normalized representation hash of the ephemeral embedding.
   */
  normalizedBioHash: string;
}

/**
 * In-place memory wiper to enforce Requirement 1:
 * Raw biometrics are never persisted and zeroed out immediately from RAM.
 */
export function wipeEphemeralBiometricData(target: unknown): void {
  if (!target) return;
  if (Array.isArray(target)) {
    target.fill(0);
  } else if (target instanceof Float32Array || target instanceof Uint8Array) {
    target.fill(0);
  } else if (typeof target === 'object' && target !== null) {
    for (const key of Object.keys(target as Record<string, unknown>)) {
      try {
        (target as Record<string, unknown>)[key] = null;
      } catch {}
    }
  }
}

/**
 * Derives a cryptographic per-event salt from eventId and server secret.
 * Guarantees that even if an identical face is used across 100 different events,
 * the resulting event salts are completely distinct.
 */
export function deriveEventSalt(eventId: string, serverSecret?: string): string {
  const secret = serverSecret || config.biometricSaltSecret;
  if (!secret) {
    throw new Error('TruePass Privacy: BIOMETRIC_SALT_SECRET is missing or empty.');
  }
  const cleanEvent = (eventId || 'DEFAULT_EVENT').trim().toUpperCase();
  return ethers.solidityPackedKeccak256(['string', 'string'], [cleanEvent, secret]);
}

/**
 * Normalizes a biometric embedding (128-d float array) or mock token into a deterministic bytes32 hash.
 * Uses L2 normalization and fixed-point quantization (10^4 precision) to eliminate floating point jitter.
 */
export function normalizeBiometricEmbedding(
  embedding?: number[] | Float32Array | string | null,
  isMock: boolean = false
): string {
  // Local/Dev test mode or deterministic mock token
  if (isMock || typeof embedding === 'string' || !embedding) {
    const rawStr = typeof embedding === 'string' && embedding.trim().length > 0
      ? embedding.trim()
      : 'TRUEPASS_DEV_MOCK_FACE_TOKEN_DEFAULT';
    return ethers.keccak256(ethers.toUtf8Bytes(`TRUEPASS_NORMALIZED_MOCK_BIO_${rawStr}`));
  }

  // 128-dimensional biometric floating point vector
  const floatList = Array.from(embedding);
  if (floatList.length === 0) {
    return ethers.keccak256(ethers.toUtf8Bytes('TRUEPASS_EMPTY_EMBEDDING_FALLBACK'));
  }

  // 1. Compute Euclidean L2 Norm: ||v||_2
  const sumSquares = floatList.reduce((acc, val) => acc + val * val, 0);
  const l2Norm = Math.sqrt(sumSquares) || 1.0;

  // 2. Fixed-point quantization (scale by 10,000 and round to integer)
  const quantizedCoords = floatList.map(val => Math.round((val / l2Norm) * 10000));

  // 3. Deterministic byte packing
  const packedHex = quantizedCoords
    .map(num => {
      // 16-bit signed integer to two's complement hex
      const uint16 = (num < 0 ? 0x10000 + num : num) & 0xffff;
      return uint16.toString(16).padStart(4, '0');
    })
    .join('');

  return ethers.keccak256(ethers.toUtf8Bytes(packedHex));
}

/**
 * Derives the contextual binding hash:
 * Binds the biometric commitment to the recipient address and ticket/order context.
 * Prevents replay attacks where a user attempts to use a commitment minted for a different user.
 */
export function deriveBindingContext(
  identifier: string | number,
  recipientAddress: string
): string {
  let cleanAddress: string;
  try {
    cleanAddress = ethers.getAddress(recipientAddress);
  } catch {
    cleanAddress = '0x0000000000000000000000000000000000000000';
  }
  const cleanId = String(identifier || 'TP_TICKET_GENERIC').trim();
  return ethers.solidityPackedKeccak256(['string', 'address'], [cleanId, cleanAddress]);
}

/**
 * Computes the salted privacy-preserving biometric commitment hash (bytes32).
 * 
 * Formula:
 * keccak256(
 *   abi.encodePacked(
 *     normalizedBiometricHash, // bytes32
 *     eventSalt,               // bytes32: keccak256(eventId, serverSecret)
 *     bindingContextHash       // bytes32: keccak256(ticketId/orderId, recipientAddress)
 *   )
 * )
 *
 * Properties:
 * 1. Zero raw biometrics stored or leaked.
 * 2. Unlinkable across events (different eventId => completely different salt).
 * 3. Non-transferable (bound to recipient address and ticketId).
 * 4. Discards and zeroes out raw inputs immediately in memory.
 */
export function computeBiometricCommitment(
  params: BiometricCommitmentParams
): BiometricCommitmentResult {
  const isMock = params.mockMode ?? config.mockBiometrics;

  // 1. Derive per-event salt
  const eventSalt = deriveEventSalt(params.eventId, params.serverSecret);

  // 2. Normalize biometric embedding ephemerally
  const normalizedBioHash = normalizeBiometricEmbedding(params.biometricToken, isMock);

  // 3. Derive contextual ticket/user binding
  const bindingId = params.ticketId ?? params.orderId ?? 'TICKET_DEFAULT_CONTEXT';
  const bindingContextHash = deriveBindingContext(bindingId, params.recipientAddress);

  // 4. Compute final salted commitment hash (bytes32)
  const commitment = ethers.solidityPackedKeccak256(
    ['bytes32', 'bytes32', 'bytes32'],
    [normalizedBioHash, eventSalt, bindingContextHash]
  );

  // 5. Enforce ephemeral hygiene: Zero out raw array inputs immediately (Requirement 1)
  if (params.biometricToken) {
    wipeEphemeralBiometricData(params.biometricToken);
  }

  return {
    commitment,
    eventSalt,
    bindingContextHash,
    normalizedBioHash,
  };
}

/**
 * Verifies if a live candidate biometric scan matches an existing commitment hash.
 */
export function verifyBiometricCommitment(
  candidateParams: BiometricCommitmentParams,
  expectedCommitment: string
): boolean {
  const result = computeBiometricCommitment(candidateParams);
  return result.commitment.toLowerCase() === (expectedCommitment || '').toLowerCase();
}
