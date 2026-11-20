# TruePass — Fraud-Proof Biometric Web3 Ticketing Platform

TruePass is an end-to-end decentralized ticketing platform engineered to eliminate ticket scalping, counterfeit passes, and unauthorized resale by cryptographically binding every ticket to the attendee's facial biometric commitment on an EVM smart contract.

---

## ⚡ Core Architecture

1. **Biometric Face Binding (Privacy-Preserving)**:
   - Attendee facial vectors are captured client-side and hashed into a 32-byte cryptographic salted commitment (`bytes32`).
   - Raw photos or biometric measurements are **never** stored on the public blockchain.
2. **TruePassTicket Smart Contract (`contracts/TruePassTicket.sol`)**:
   - Standard ERC-721 token deployed with OpenZeppelin.
   - Dual minting pathways:
     - **Native Web3 (`mintWithCrypto`)**: Attendee pays ETH directly from MetaMask.
     - **Fiat Relayer (`mintByRelayer`)**: Attendee pays INR via Razorpay; a trusted relayer signs and pays gas to mint the pass directly to the user's wallet address.
   - **Anti-Scalping Resale Caps (`listForResale`)**:
     - Resale prices are capped by contract code (max 10% markup above primary face value).
     - Buying a resale pass (`buyResaleTicket`) forces the new buyer to bind their own facial biometric commitment, permanently invalidating the previous owner's face at venue gates.
   - **Turnstile Gate Redemption (`redeemTicket`)**:
     - Live camera scanner matches the attendee's face against the on-chain commitment hash.
     - Flips the ticket status from `ACTIVE` to `REDEEMED` on the blockchain, blocking duplicate entry.

---

## 🛠️ Getting Started

### 1. Compile & Test Smart Contracts
```bash
# Compile contracts
npx hardhat compile

# Run automated test suite
npx hardhat test
```

### 2. Start Local Blockchain Node
```bash
npx hardhat node
```
This launches a local EVM node at `http://127.0.0.1:8545` with 20 pre-funded test accounts (10,000 ETH each).

### 3. Deploy Contract to Local Node
In a separate terminal:
```bash
npx hardhat run scripts/deploy.js --network localhost
```
This automatically updates `contractInfo.js` with the newly deployed contract address and ABI for the frontend.

### 4. Open Frontend
Open `frontend.html` in your browser (e.g. using VS Code Live Server or by double-clicking).
- Connect MetaMask to `Localhost 8545` (Chain ID: `31337`).
- Enroll Face ID.
- Purchase a pass with **MetaMask Crypto** or **Razorpay Relayer**.
- Test gate entry in the **Turnstile Scanner** tab!
