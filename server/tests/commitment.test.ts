import crypto from 'crypto';
import { ethers } from 'ethers';
import {
  computeBiometricCommitment,
  deriveEventSalt,
  normalizeBiometricEmbedding,
  wipeEphemeralBiometricData,
} from '../src/privacy';
import { blockchainService } from '../src/blockchain';
import { config } from '../src/config';

// Simple test runner with assertions
let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ [FAIL] ${testName}`);
    if (detail) console.error(`    Detail: ${detail}`);
    failed++;
  }
}

async function runTestSuite() {
  console.log('\n==========================================================');
  console.log('  TRUEPASS PRIVACY & BIOMETRIC COMMITMENT TEST SUITE      ');
  console.log('==========================================================\n');

  // TEST 1: Ephemeral In-Memory Zeroization (Requirement 1)
  console.log('▶ Test 1: In-Place Biometric Memory Erasure (Requirement 1)');
  const sampleDescriptor = new Float32Array([0.154, -0.482, 0.912, -0.111, 0.444]);
  const originalCopy = Array.from(sampleDescriptor);

  const res1 = computeBiometricCommitment({
    biometricToken: sampleDescriptor,
    eventId: 'EVT-TEST-1',
    orderId: 'order_1001',
    ticketId: '1001',
    recipientAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    mockMode: false,
  });

  const isZeroed = Array.from(sampleDescriptor).every((val) => val === 0);
  assert(isZeroed, 'Raw biometric array is zeroed out in memory immediately after hashing', `Array values: ${sampleDescriptor}`);
  assert(res1.commitment.startsWith('0x') && res1.commitment.length === 66, 'Commitment is valid bytes32 hex string');

  // TEST 2: Determinism with Same Identity & Event (Requirement 2)
  console.log('\n▶ Test 2: Deterministic Commitment Matching (Requirement 2)');
  const rawEmbedding1 = [0.154, -0.482, 0.912, -0.111, 0.444];
  const rawEmbedding2 = [0.154, -0.482, 0.912, -0.111, 0.444];

  const comm1 = computeBiometricCommitment({
    biometricToken: rawEmbedding1,
    eventId: 'EVT-SUMMER-2026',
    ticketId: '2001',
    recipientAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    mockMode: false,
  });

  const comm2 = computeBiometricCommitment({
    biometricToken: rawEmbedding2,
    eventId: 'EVT-SUMMER-2026',
    ticketId: '2001',
    recipientAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    mockMode: false,
  });

  assert(comm1.commitment === comm2.commitment, 'Same face + same event + same ticket produces exact same commitment');

  // TEST 3: Cross-Event Unlinkability (Requirement 2)
  console.log('\n▶ Test 3: Cross-Event Unlinkability & Anti-Correlation (Requirement 2)');
  const faceVectorA = [0.154, -0.482, 0.912, -0.111, 0.444];
  const faceVectorB = [0.154, -0.482, 0.912, -0.111, 0.444];

  const eventACommitment = computeBiometricCommitment({
    biometricToken: faceVectorA,
    eventId: 'EVT-COLDPLAY-MUMBAI-2026',
    ticketId: '3001',
    recipientAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    mockMode: false,
  });

  const eventBCommitment = computeBiometricCommitment({
    biometricToken: faceVectorB,
    eventId: 'EVT-ED-SHEERAN-DELHI-2026',
    ticketId: '3001',
    recipientAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    mockMode: false,
  });

  assert(
    eventACommitment.commitment !== eventBCommitment.commitment,
    'Identical face across 2 different events produces completely different commitments'
  );
  assert(
    eventACommitment.eventSalt !== eventBCommitment.eventSalt,
    'Per-event salts are unique per eventId'
  );

  // TEST 4: Dev Mock Flag (Requirement 4: MOCK_BIOMETRICS=true)
  console.log('\n▶ Test 4: Dev / Test Mock Biometrics Flag (Requirement 4)');
  const mockCommitment1 = computeBiometricCommitment({
    biometricToken: 'MOCK_ALICE_ATTENDEE_DEV',
    eventId: 'EVT-MOCK-STAGE',
    ticketId: '4001',
    recipientAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    mockMode: true,
  });

  const mockCommitment2 = computeBiometricCommitment({
    biometricToken: 'MOCK_ALICE_ATTENDEE_DEV',
    eventId: 'EVT-MOCK-STAGE',
    ticketId: '4001',
    recipientAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    mockMode: true,
  });

  const mockBobCommitment = computeBiometricCommitment({
    biometricToken: 'MOCK_BOB_ATTENDEE_DEV',
    eventId: 'EVT-MOCK-STAGE',
    ticketId: '4001',
    recipientAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    mockMode: true,
  });

  assert(mockCommitment1.commitment === mockCommitment2.commitment, 'Deterministic mock biometrics match for same identity');
  assert(mockCommitment1.commitment !== mockBobCommitment.commitment, 'Different mock identities produce different commitments');

  // TEST 5: Full Webhook -> Mint -> Gate Check-in Flow (Requirement 3 & 4)
  console.log('\n▶ Test 5: End-to-End Razorpay Webhook -> Mint -> Gate Check-in Flow');
  blockchainService.clearSimulation();

  const testTokenId = 5001;
  const testEventId = 'EVT-WORLD-CUP-FINALS-2026';
  const testRecipient = '0x90F79bf6EB2c4f870365E785982E1f101E93b906';
  const testMockFace = 'MOCK_ATTENDEE_JOHN_DOE';

  // Step A: Payment Captured Webhook calculates commitment & calls mintTicket
  const buyerCommitment = computeBiometricCommitment({
    biometricToken: testMockFace,
    eventId: testEventId,
    ticketId: testTokenId,
    recipientAddress: testRecipient,
    mockMode: true,
  });

  const mintResult = await blockchainService.mintTicket({
    to: testRecipient,
    tokenId: testTokenId,
    eventId: testEventId,
    biometricCommitment: buyerCommitment.commitment,
  });

  assert(mintResult.success, 'Step A: Ticket minted with MINTER_ROLE', `TxHash: ${mintResult.txHash}`);

  // Step B: Gate Turnstile Check-In (Valid Face) -> calls redeemTicket with REDEEMER_ROLE
  const turnstileScanCommitment = computeBiometricCommitment({
    biometricToken: testMockFace,
    eventId: testEventId,
    ticketId: testTokenId,
    recipientAddress: testRecipient,
    mockMode: true,
  });

  assert(
    buyerCommitment.commitment === turnstileScanCommitment.commitment,
    'Step B1: Live gate commitment matches minted ticket commitment'
  );

  const redeemResult = await blockchainService.redeemTicket({
    tokenId: testTokenId,
    liveBiometricCommitment: turnstileScanCommitment.commitment,
  });

  assert(redeemResult.success, 'Step B2: Ticket redeemed at gate with REDEEMER_ROLE', `TxHash: ${redeemResult.txHash}`);

  // Step C: Replay Attack Prevention (Cannot re-use ticket)
  let replayErrorCaught = false;
  try {
    await blockchainService.redeemTicket({
      tokenId: testTokenId,
      liveBiometricCommitment: turnstileScanCommitment.commitment,
    });
  } catch (err: any) {
    replayErrorCaught = true;
  }
  assert(replayErrorCaught, 'Step C: Turnstile blocks replay (ticket cannot be redeemed twice)');

  // Step D: Impostor Face Attack (Wrong face rejected at gate)
  const impostorTokenId = 5002;
  const impostorMint = await blockchainService.mintTicket({
    to: testRecipient,
    tokenId: impostorTokenId,
    eventId: testEventId,
    biometricCommitment: buyerCommitment.commitment,
  });

  const wrongFaceCommitment = computeBiometricCommitment({
    biometricToken: 'IMPOSTOR_DIFFERENT_FACE',
    eventId: testEventId,
    ticketId: impostorTokenId,
    recipientAddress: testRecipient,
    mockMode: true,
  });

  let mismatchCaught = false;
  try {
    await blockchainService.redeemTicket({
      tokenId: impostorTokenId,
      liveBiometricCommitment: wrongFaceCommitment.commitment,
    });
  } catch (err: any) {
    mismatchCaught = true;
  }
  assert(mismatchCaught, 'Step D: Turnstile denies entry when live biometric commitment does not match');

  // Summary
  console.log('\n==========================================================');
  console.log(`  TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('==========================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
