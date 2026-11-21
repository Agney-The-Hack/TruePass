import { ethers } from 'ethers';
import { config } from './config';

export const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE'));
export const REDEEMER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('REDEEMER_ROLE'));

export const TRUE_PASS_TICKET_ABI = [
  'function mintTicket(address to, uint256 tokenId, string calldata eventId, bytes32 biometricCommitment) external returns (uint256)',
  'function redeemTicket(uint256 tokenId, bytes32 liveBiometricCommitment) external returns (bool)',
  'function verifyCommitment(uint256 tokenId, bytes32 candidateCommitment) external view returns (bool isValid, bool isRedeemed)',
  'function getTicket(uint256 tokenId) external view returns (address owner, string memory eventId, bytes32 biometricCommitment, bool isRedeemed, bool isRefunded, uint64 mintedAt)',
  'function hasRole(bytes32 role, address account) public view returns (bool)',
  'function ownerOf(uint256 tokenId) external view returns (address owner)',
  'event TicketMinted(uint256 indexed tokenId, address indexed to, string eventId, bytes32 biometricCommitment)',
  'event TicketRedeemed(uint256 indexed tokenId, address indexed redeemer, uint256 timestamp)'
];

export interface SimulatedTicket {
  tokenId: string;
  owner: string;
  eventId: string;
  biometricCommitment: string;
  isRedeemed: boolean;
  mintedAt: number;
  redeemedAt?: number;
}

// In-memory ledger for local development/testing when no local blockchain is running
const simulatedTickets = new Map<string, SimulatedTicket>();

export class BlockchainService {
  private provider: ethers.JsonRpcProvider | null = null;
  private relayerWallet: ethers.Wallet | null = null;
  private contract: ethers.Contract | null = null;
  private isConnected: boolean = false;

  constructor() {
    this.initContract();
  }

  private initContract(): void {
    try {
      if (
        !config.mockBiometrics &&
        config.contractAddress &&
        config.contractAddress !== ethers.ZeroAddress &&
        ethers.isAddress(config.contractAddress)
      ) {
        // Use staticNetwork to prevent background polling loops
        this.provider = new ethers.JsonRpcProvider(config.rpcUrl, undefined, { staticNetwork: true });
        this.relayerWallet = new ethers.Wallet(config.relayerPrivateKey, this.provider);
        this.contract = new ethers.Contract(
          config.contractAddress,
          TRUE_PASS_TICKET_ABI,
          this.relayerWallet
        );
        this.isConnected = true;
        console.log(`[Blockchain] Connected to contract at ${config.contractAddress}`);
        console.log(`[Blockchain] Relayer wallet address: ${this.relayerWallet.address}`);
      } else {
        console.log('[Blockchain] Running in local simulation mode (MOCK_BIOMETRICS or no live contract address).');
      }
    } catch (err: any) {
      console.warn('[Blockchain] Init notice (will fallback to simulated mode):', err.message);
      this.isConnected = false;
    }
  }

  /**
   * Mints a soulbound biometric ticket on-chain using MINTER_ROLE.
   */
  async mintTicket(params: {
    to: string;
    tokenId: string | number;
    eventId: string;
    biometricCommitment: string;
  }): Promise<{ success: boolean; txHash: string; tokenId: string; simulated: boolean }> {
    const tokenIdStr = String(params.tokenId);
    const cleanTo = ethers.getAddress(params.to);

    // If live contract is configured and reachable
    if (this.isConnected && this.contract) {
      try {
        console.log(`[Blockchain] Minting on-chain ticket #${tokenIdStr} to ${cleanTo}...`);
        const tx = await this.contract.mintTicket(
          cleanTo,
          BigInt(tokenIdStr),
          params.eventId,
          params.biometricCommitment
        );
        const receipt = await tx.wait();
        return {
          success: true,
          txHash: receipt.hash,
          tokenId: tokenIdStr,
          simulated: false,
        };
      } catch (err: any) {
        console.warn(`[Blockchain] On-chain mint reverted or failed: ${err.message}. Falling back to dev simulation.`);
      }
    }

    // Dev / Test simulation fallback
    const simulatedTxHash = ethers.keccak256(
      ethers.toUtf8Bytes(`SIMULATED_MINT_TX_${tokenIdStr}_${Date.now()}`)
    );

    simulatedTickets.set(tokenIdStr, {
      tokenId: tokenIdStr,
      owner: cleanTo,
      eventId: params.eventId,
      biometricCommitment: params.biometricCommitment,
      isRedeemed: false,
      mintedAt: Math.floor(Date.now() / 1000),
    });

    console.log(`[Blockchain Simulation] Minted ticket #${tokenIdStr} for ${cleanTo} with commitment ${params.biometricCommitment}`);

    return {
      success: true,
      txHash: simulatedTxHash,
      tokenId: tokenIdStr,
      simulated: true,
    };
  }

  /**
   * Redeems a ticket at gate check-in using REDEEMER_ROLE after biometric verification.
   */
  async redeemTicket(params: {
    tokenId: string | number;
    liveBiometricCommitment: string;
  }): Promise<{ success: boolean; txHash: string; tokenId: string; simulated: boolean }> {
    const tokenIdStr = String(params.tokenId);

    if (this.isConnected && this.contract) {
      try {
        console.log(`[Blockchain] Redeeming on-chain ticket #${tokenIdStr} with live commitment...`);
        const tx = await this.contract.redeemTicket(
          BigInt(tokenIdStr),
          params.liveBiometricCommitment
        );
        const receipt = await tx.wait();
        return {
          success: true,
          txHash: receipt.hash,
          tokenId: tokenIdStr,
          simulated: false,
        };
      } catch (err: any) {
        console.warn(`[Blockchain] On-chain redeem failed: ${err.message}. Checking simulation.`);
      }
    }

    // Simulation verification
    const ticket = simulatedTickets.get(tokenIdStr);
    if (!ticket) {
      throw new Error(`Ticket #${tokenIdStr} does not exist in ledger.`);
    }
    if (ticket.isRedeemed) {
      throw new Error(`Ticket #${tokenIdStr} has already been redeemed!`);
    }
    if (ticket.biometricCommitment.toLowerCase() !== params.liveBiometricCommitment.toLowerCase()) {
      throw new Error(`Biometric commitment mismatch for ticket #${tokenIdStr}. Turnstile admission denied.`);
    }

    ticket.isRedeemed = true;
    ticket.redeemedAt = Math.floor(Date.now() / 1000);

    const simulatedTxHash = ethers.keccak256(
      ethers.toUtf8Bytes(`SIMULATED_REDEEM_TX_${tokenIdStr}_${Date.now()}`)
    );

    console.log(`[Blockchain Simulation] Ticket #${tokenIdStr} redeemed successfully at gate!`);

    return {
      success: true,
      txHash: simulatedTxHash,
      tokenId: tokenIdStr,
      simulated: true,
    };
  }

  /**
   * Helper to retrieve ticket information.
   */
  async getTicket(tokenId: string | number): Promise<SimulatedTicket | null> {
    const tokenIdStr = String(tokenId);
    if (this.isConnected && this.contract) {
      try {
        const t = await this.contract.getTicket(BigInt(tokenIdStr));
        return {
          tokenId: tokenIdStr,
          owner: t.owner,
          eventId: t.eventId,
          biometricCommitment: t.biometricCommitment,
          isRedeemed: t.isRedeemed,
          mintedAt: Number(t.mintedAt),
        };
      } catch {}
    }
    return simulatedTickets.get(tokenIdStr) || null;
  }

  clearSimulation(): void {
    simulatedTickets.clear();
  }
}

export const blockchainService = new BlockchainService();
