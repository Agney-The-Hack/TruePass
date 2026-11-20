const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TruePassTicket Smart Contract", function () {
  let truePass;
  let owner, attendee, gatekeeper, secondaryBuyer, scalper;
  const eventId = 1001;
  const eventPrice = ethers.parseEther("0.02");
  const sampleBiometricHash = ethers.keccak256(ethers.toUtf8Bytes("FACE_VECTOR_ALEX_VANCE_SALT_99"));
  const fakeBiometricHash = ethers.keccak256(ethers.toUtf8Bytes("FACE_VECTOR_IMPOSTER_SALT_42"));

  beforeEach(async function () {
    [owner, attendee, gatekeeper, secondaryBuyer, scalper] = await ethers.getSigners();

    const TruePassTicket = await ethers.getContractFactory("TruePassTicket");
    truePass = await TruePassTicket.deploy();
    await truePass.waitForDeployment();

    // Authorize gatekeeper turnstile
    await truePass.setGatekeeperAuthorization(gatekeeper.address, true);
  });

  describe("Deployment & Configuration", function () {
    it("Should deploy with correct name and symbol", async function () {
      expect(await truePass.name()).to.equal("TruePass Biometric Ticket");
      expect(await truePass.symbol()).to.equal("TPASS");
    });

    it("Should set initial event price correctly", async function () {
      expect(await truePass.eventPrices(eventId)).to.equal(eventPrice);
    });

    it("Should register authorized gatekeeper", async function () {
      expect(await truePass.authorizedGatekeepers(gatekeeper.address)).to.be.true;
    });
  });

  describe("Ticket Minting", function () {
    it("Should mint ticket with direct crypto payment and record biometric commitment", async function () {
      const tx = await truePass.connect(attendee).mintWithCrypto(
        eventId,
        sampleBiometricHash,
        "ipfs://QmSampleTicketURI",
        { value: eventPrice }
      );
      await tx.wait();

      expect(await truePass.ownerOf(1)).to.equal(attendee.address);
      const ticket = await truePass.getTicket(1);
      expect(ticket.eventId).to.equal(eventId);
      expect(ticket.biometricCommitment).to.equal(sampleBiometricHash);
      expect(ticket.status).to.equal(0); // ACTIVE
      expect(ticket.originalPrice).to.equal(eventPrice);
    });

    it("Should reject crypto minting if payment is insufficient", async function () {
      await expect(
        truePass.connect(attendee).mintWithCrypto(
          eventId,
          sampleBiometricHash,
          "",
          { value: ethers.parseEther("0.005") }
        )
      ).to.be.revertedWith("TruePass: Insufficient payment value");
    });

    it("Should allow relayer to mint gaslessly for fiat payment (Razorpay)", async function () {
      const tx = await truePass.connect(owner).mintByRelayer(
        attendee.address,
        eventId,
        sampleBiometricHash,
        eventPrice,
        "ipfs://QmFiatTicketURI"
      );
      await tx.wait();

      expect(await truePass.ownerOf(1)).to.equal(attendee.address);
      const ticket = await truePass.getTicket(1);
      expect(ticket.biometricCommitment).to.equal(sampleBiometricHash);
      expect(ticket.originalBuyer).to.equal(attendee.address);
    });
  });

  describe("Gate Entry & Turnstile Biometric Verification", function () {
    beforeEach(async function () {
      await truePass.connect(attendee).mintWithCrypto(
        eventId,
        sampleBiometricHash,
        "",
        { value: eventPrice }
      );
    });

    it("Should successfully redeem ticket when turnstile face matches biometric commitment", async function () {
      const tx = await truePass.connect(gatekeeper).redeemTicket(1, sampleBiometricHash);
      await tx.wait();

      const ticket = await truePass.getTicket(1);
      expect(ticket.status).to.equal(1); // REDEEMED
      expect(ticket.redeemedAt).to.be.greaterThan(0);
    });

    it("Should reject turnstile redemption if face biometric hash mismatches (Imposter)", async function () {
      await expect(
        truePass.connect(gatekeeper).redeemTicket(1, fakeBiometricHash)
      ).to.be.revertedWith("TruePass: Biometric verification failed! Face does not match registered ticket holder");
    });

    it("Should reject double redemption if ticket was already used", async function () {
      await truePass.connect(gatekeeper).redeemTicket(1, sampleBiometricHash);

      await expect(
        truePass.connect(gatekeeper).redeemTicket(1, sampleBiometricHash)
      ).to.be.revertedWith("TruePass: Ticket is not active or already redeemed");
    });
  });

  describe("Anti-Scalping & Secondary Market with Biometric Re-binding", function () {
    beforeEach(async function () {
      await truePass.connect(attendee).mintWithCrypto(
        eventId,
        sampleBiometricHash,
        "",
        { value: eventPrice }
      );
    });

    it("Should reject listing above legal resale markup (Anti-Scalp)", async function () {
      // 10% markup cap on 0.02 is 0.022 ETH. Trying to list for 0.03 ETH should revert
      const gougedPrice = ethers.parseEther("0.03");
      await expect(
        truePass.connect(attendee).listForResale(1, gougedPrice)
      ).to.be.revertedWith("TruePass: Scalping detected! Resale price exceeds maximum legal cap");
    });

    it("Should permit listing within legal markup and re-bind biometrics to new buyer", async function () {
      const fairResalePrice = ethers.parseEther("0.021"); // 5% markup, legal
      await truePass.connect(attendee).listForResale(1, fairResalePrice);

      const ticketBefore = await truePass.getTicket(1);
      expect(ticketBefore.isForResale).to.be.true;

      const newBuyerBiometricHash = ethers.keccak256(ethers.toUtf8Bytes("FACE_VECTOR_SECONDARY_BUYER_SALT_88"));

      // Secondary buyer purchases ticket
      await truePass.connect(secondaryBuyer).buyResaleTicket(1, newBuyerBiometricHash, { value: fairResalePrice });

      expect(await truePass.ownerOf(1)).to.equal(secondaryBuyer.address);
      const ticketAfter = await truePass.getTicket(1);
      expect(ticketAfter.isForResale).to.be.false;
      // CRITICAL: Biometrics successfully rebound to new buyer
      expect(ticketAfter.biometricCommitment).to.equal(newBuyerBiometricHash);

      // Now at gate, only the new buyer's face passes
      await expect(
        truePass.connect(gatekeeper).redeemTicket(1, sampleBiometricHash)
      ).to.be.revertedWith("TruePass: Biometric verification failed! Face does not match registered ticket holder");

      await truePass.connect(gatekeeper).redeemTicket(1, newBuyerBiometricHash);
      const redeemedTicket = await truePass.getTicket(1);
      expect(redeemedTicket.status).to.equal(1); // REDEEMED
    });
  });
});
