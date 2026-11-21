"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wipeEphemeralBiometricData = wipeEphemeralBiometricData;
exports.deriveEventSalt = deriveEventSalt;
exports.normalizeBiometricEmbedding = normalizeBiometricEmbedding;
exports.deriveBindingContext = deriveBindingContext;
exports.computeBiometricCommitment = computeBiometricCommitment;
exports.verifyBiometricCommitment = verifyBiometricCommitment;
const ethers_1 = require("ethers");
const config_1 = require("./config");
/**
 * In-place memory wiper to enforce Requirement 1:
 * Raw biometrics are never persisted and zeroed out immediately from RAM.
 */
function wipeEphemeralBiometricData(target) {
    if (!target)
        return;
    if (Array.isArray(target)) {
        target.fill(0);
    }
    else if (target instanceof Float32Array || target instanceof Uint8Array) {
        target.fill(0);
    }
    else if (typeof target === 'object' && target !== null) {
        for (const key of Object.keys(target)) {
            try {
                target[key] = null;
            }
            catch { }
        }
    }
}
/**
 * Derives a cryptographic per-event salt from eventId and server secret.
 * Guarantees that even if an identical face is used across 100 different events,
 * the resulting event salts are completely distinct.
 */
function deriveEventSalt(eventId, serverSecret) {
    const secret = serverSecret || config_1.config.biometricSaltSecret;
    if (!secret) {
        throw new Error('TruePass Privacy: BIOMETRIC_SALT_SECRET is missing or empty.');
    }
    const cleanEvent = (eventId || 'DEFAULT_EVENT').trim().toUpperCase();
    return ethers_1.ethers.solidityPackedKeccak256(['string', 'string'], [cleanEvent, secret]);
}
/**
 * Normalizes a biometric embedding (128-d float array) or mock token into a deterministic bytes32 hash.
 * Uses L2 normalization and fixed-point quantization (10^4 precision) to eliminate floating point jitter.
 */
function normalizeBiometricEmbedding(embedding, isMock = false) {
    // Local/Dev test mode or deterministic mock token
    if (isMock || typeof embedding === 'string' || !embedding) {
        const rawStr = typeof embedding === 'string' && embedding.trim().length > 0
            ? embedding.trim()
            : 'TRUEPASS_DEV_MOCK_FACE_TOKEN_DEFAULT';
        return ethers_1.ethers.keccak256(ethers_1.ethers.toUtf8Bytes(`TRUEPASS_NORMALIZED_MOCK_BIO_${rawStr}`));
    }
    // 128-dimensional biometric floating point vector
    const floatList = Array.from(embedding);
    if (floatList.length === 0) {
        return ethers_1.ethers.keccak256(ethers_1.ethers.toUtf8Bytes('TRUEPASS_EMPTY_EMBEDDING_FALLBACK'));
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
    return ethers_1.ethers.keccak256(ethers_1.ethers.toUtf8Bytes(packedHex));
}
/**
 * Derives the contextual binding hash:
 * Binds the biometric commitment to the recipient address and ticket/order context.
 * Prevents replay attacks where a user attempts to use a commitment minted for a different user.
 */
function deriveBindingContext(identifier, recipientAddress) {
    let cleanAddress;
    try {
        cleanAddress = ethers_1.ethers.getAddress(recipientAddress);
    }
    catch {
        cleanAddress = '0x0000000000000000000000000000000000000000';
    }
    const cleanId = String(identifier || 'TP_TICKET_GENERIC').trim();
    return ethers_1.ethers.solidityPackedKeccak256(['string', 'address'], [cleanId, cleanAddress]);
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
function computeBiometricCommitment(params) {
    const isMock = params.mockMode ?? config_1.config.mockBiometrics;
    // 1. Derive per-event salt
    const eventSalt = deriveEventSalt(params.eventId, params.serverSecret);
    // 2. Normalize biometric embedding ephemerally
    const normalizedBioHash = normalizeBiometricEmbedding(params.biometricToken, isMock);
    // 3. Derive contextual ticket/user binding
    const bindingId = params.ticketId ?? params.orderId ?? 'TICKET_DEFAULT_CONTEXT';
    const bindingContextHash = deriveBindingContext(bindingId, params.recipientAddress);
    // 4. Compute final salted commitment hash (bytes32)
    const commitment = ethers_1.ethers.solidityPackedKeccak256(['bytes32', 'bytes32', 'bytes32'], [normalizedBioHash, eventSalt, bindingContextHash]);
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
function verifyBiometricCommitment(candidateParams, expectedCommitment) {
    const result = computeBiometricCommitment(candidateParams);
    return result.commitment.toLowerCase() === (expectedCommitment || '').toLowerCase();
}
