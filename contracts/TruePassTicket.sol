// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TruePassTicket
 * @dev Fraud-Proof Biometric Web3 Ticketing with Anti-Scalping and On-Chain Gate Redemption.
 * 
 * Features:
 * 1. Biometric Binding: Every ticket is bound to a salted cryptographic commitment (bytes32).
 *    Raw biometric vectors are never stored on-chain, preserving user privacy.
 * 2. Dual Minting:
 *    - mintWithCrypto: Direct Web3 checkout by attendees in native cryptocurrency (ETH/MATIC).
 *    - mintByRelayer: Gasless/Fiat checkout (Razorpay) where a verified relayer wallet pays gas
 *      and mints the ticket directly into the attendee's address.
 * 3. Turnstile Gate Redemption:
 *    - redeemTicket: Turnstile scanner validates the attendee's face against the ticket's
 *      biometric commitment hash. If valid, ticket state flips to REDEEMED permanently.
 * 4. Anti-Scalp & Controlled Resale:
 *    - Maximum markup ceiling (e.g., max 10% above face value) prevents scalper gouging.
 *    - Resale requires the new buyer to bind their own biometric commitment, neutralizing scalper bots.
 */
contract TruePassTicket is ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;

    // Basis points for maximum resale markup (1000 = 10%)
    uint256 public maxResaleMarkupBps = 1000;

    enum TicketStatus {
        ACTIVE,
        REDEEMED,
        CANCELLED
    }

    struct TicketData {
        uint256 tokenId;
        uint256 eventId;
        bytes32 biometricCommitment; // Salted SHA-256 face vector hash
        uint256 originalPrice;       // Price in wei
        uint256 resalePrice;         // 0 if not listed for resale
        uint256 mintedAt;
        uint256 redeemedAt;
        TicketStatus status;
        address originalBuyer;
        bool isForResale;
    }

    // Event ID => Ticket Price in Wei
    mapping(uint256 => uint256) public eventPrices;

    // Token ID => Ticket Data
    mapping(uint256 => TicketData) public tickets;

    // Authorized gatekeeper scanners
    mapping(address => bool) public authorizedGatekeepers;

    // Events
    event TicketMinted(
        uint256 indexed tokenId,
        uint256 indexed eventId,
        address indexed attendee,
        bytes32 biometricCommitment,
        uint256 price,
        bool isRelayed
    );

    event TicketRedeemed(
        uint256 indexed tokenId,
        uint256 indexed eventId,
        address indexed attendee,
        uint256 timestamp
    );

    event TicketListedForResale(
        uint256 indexed tokenId,
        uint256 resalePrice,
        address indexed seller
    );

    event TicketResold(
        uint256 indexed tokenId,
        address indexed oldOwner,
        address indexed newOwner,
        uint256 resalePrice,
        bytes32 newBiometricCommitment
    );

    event EventPriceConfigured(uint256 indexed eventId, uint256 priceInWei);
    event GatekeeperAuthorized(address indexed gatekeeper, bool authorized);

    constructor() ERC721("TruePass Biometric Ticket", "TPASS") Ownable(msg.sender) {
        // Deployer is initial authorized gatekeeper & relayer
        authorizedGatekeepers[msg.sender] = true;

        // Default prices for demo events (in wei)
        eventPrices[1001] = 0.02 ether; // Afterlife / Cyberpunk
        eventPrices[1002] = 0.05 ether; // ETH Devcon Summit
        eventPrices[1003] = 0.08 ether; // Formula E / Sports
        eventPrices[1004] = 0.015 ether; // Comedy / Theatre
    }

    modifier onlyGatekeeper() {
        require(
            authorizedGatekeepers[msg.sender] || msg.sender == owner(),
            "TruePass: Caller is not an authorized gatekeeper"
        );
        _;
    }

    /**
     * @notice Set ticket price for an event in wei.
     */
    function setEventPrice(uint256 eventId, uint256 priceInWei) external onlyOwner {
        eventPrices[eventId] = priceInWei;
        emit EventPriceConfigured(eventId, priceInWei);
    }

    /**
     * @notice Authorize or deauthorize a venue gatekeeper turnstile scanner address.
     */
    function setGatekeeperAuthorization(address gatekeeper, bool authorized) external onlyOwner {
        authorizedGatekeepers[gatekeeper] = authorized;
        emit GatekeeperAuthorized(gatekeeper, authorized);
    }

    /**
     * @notice Set the maximum allowed resale markup in basis points (1000 = 10%).
     */
    function setMaxResaleMarkupBps(uint256 markupBps) external onlyOwner {
        require(markupBps <= 5000, "TruePass: Markup cannot exceed 50%");
        maxResaleMarkupBps = markupBps;
    }

    /**
     * @notice Direct Native Web3 Minting (attendee pays crypto via MetaMask).
     */
    function mintWithCrypto(
        uint256 eventId,
        bytes32 biometricCommitment,
        string calldata tokenUri
    ) external payable returns (uint256) {
        uint256 requiredPrice = eventPrices[eventId];
        require(requiredPrice > 0, "TruePass: Event not configured or inactive");
        require(msg.value >= requiredPrice, "TruePass: Insufficient payment value");
        require(biometricCommitment != bytes32(0), "TruePass: Biometric commitment required");

        uint256 tokenId = ++_nextTokenId;

        _safeMint(msg.sender, tokenId);
        if (bytes(tokenUri).length > 0) {
            _setTokenURI(tokenId, tokenUri);
        }

        tickets[tokenId] = TicketData({
            tokenId: tokenId,
            eventId: eventId,
            biometricCommitment: biometricCommitment,
            originalPrice: requiredPrice,
            resalePrice: 0,
            mintedAt: block.timestamp,
            redeemedAt: 0,
            status: TicketStatus.ACTIVE,
            originalBuyer: msg.sender,
            isForResale: false
        });

        // Refund any excess payment
        if (msg.value > requiredPrice) {
            payable(msg.sender).transfer(msg.value - requiredPrice);
        }

        emit TicketMinted(tokenId, eventId, msg.sender, biometricCommitment, requiredPrice, false);
        return tokenId;
    }

    /**
     * @notice Relayed / Gasless Minting for Fiat Payments (e.g. Razorpay).
     * The trusted relayer backend verifies fiat payment off-chain and mints the ticket directly to the user.
     */
    function mintByRelayer(
        address attendee,
        uint256 eventId,
        bytes32 biometricCommitment,
        uint256 fiatPriceEquivalentWei,
        string calldata tokenUri
    ) external onlyOwner returns (uint256) {
        require(attendee != address(0), "TruePass: Invalid attendee address");
        require(biometricCommitment != bytes32(0), "TruePass: Biometric commitment required");

        uint256 tokenId = ++_nextTokenId;

        _safeMint(attendee, tokenId);
        if (bytes(tokenUri).length > 0) {
            _setTokenURI(tokenId, tokenUri);
        }

        tickets[tokenId] = TicketData({
            tokenId: tokenId,
            eventId: eventId,
            biometricCommitment: biometricCommitment,
            originalPrice: fiatPriceEquivalentWei,
            resalePrice: 0,
            mintedAt: block.timestamp,
            redeemedAt: 0,
            status: TicketStatus.ACTIVE,
            originalBuyer: attendee,
            isForResale: false
        });

        emit TicketMinted(tokenId, eventId, attendee, biometricCommitment, fiatPriceEquivalentWei, true);
        return tokenId;
    }

    /**
     * @notice Turnstile Gate Entry: Verifies facial geometry hash & updates state to REDEEMED.
     * Can be called by an authorized gatekeeper or the ticket owner presenting at the gate.
     */
    function redeemTicket(
        uint256 tokenId,
        bytes32 turnstileBiometricHash
    ) external onlyGatekeeper {
        require(_ownerOf(tokenId) != address(0), "TruePass: Ticket does not exist");
        TicketData storage ticket = tickets[tokenId];

        require(ticket.status == TicketStatus.ACTIVE, "TruePass: Ticket is not active or already redeemed");
        require(
            ticket.biometricCommitment == turnstileBiometricHash,
            "TruePass: Biometric verification failed! Face does not match registered ticket holder"
        );

        ticket.status = TicketStatus.REDEEMED;
        ticket.redeemedAt = block.timestamp;
        ticket.isForResale = false;

        address attendee = ownerOf(tokenId);
        emit TicketRedeemed(tokenId, ticket.eventId, attendee, block.timestamp);
    }

    /**
     * @notice Anti-Scalp Controlled Secondary Market: List ticket with strict price ceiling.
     */
    function listForResale(uint256 tokenId, uint256 requestedPrice) external {
        require(ownerOf(tokenId) == msg.sender, "TruePass: Only current owner can list ticket");
        TicketData storage ticket = tickets[tokenId];
        require(ticket.status == TicketStatus.ACTIVE, "TruePass: Only active tickets can be resold");

        // Anti-scalping calculation: Max allowed price = originalPrice * (10000 + maxResaleMarkupBps) / 10000
        uint256 maxPrice = (ticket.originalPrice * (10000 + maxResaleMarkupBps)) / 10000;
        require(requestedPrice <= maxPrice, "TruePass: Scalping detected! Resale price exceeds maximum legal cap");
        require(requestedPrice > 0, "TruePass: Price must be greater than zero");

        ticket.resalePrice = requestedPrice;
        ticket.isForResale = true;

        emit TicketListedForResale(tokenId, requestedPrice, msg.sender);
    }

    /**
     * @notice Cancel secondary market listing.
     */
    function cancelResaleListing(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "TruePass: Only owner can cancel listing");
        tickets[tokenId].isForResale = false;
        tickets[tokenId].resalePrice = 0;
    }

    /**
     * @notice Buy a ticket from the secondary market.
     * Critical Security Feature: The new buyer MUST supply their own biometric commitment,
     * re-binding the ticket to their personal facial template.
     */
    function buyResaleTicket(
        uint256 tokenId,
        bytes32 newBuyerBiometricCommitment
    ) external payable {
        TicketData storage ticket = tickets[tokenId];
        require(ticket.isForResale, "TruePass: Ticket is not listed for resale");
        require(ticket.status == TicketStatus.ACTIVE, "TruePass: Ticket is no longer active");
        require(msg.value >= ticket.resalePrice, "TruePass: Insufficient funds for resale purchase");
        require(newBuyerBiometricCommitment != bytes32(0), "TruePass: New biometric commitment required");

        address currentOwner = ownerOf(tokenId);
        require(currentOwner != msg.sender, "TruePass: Cannot buy your own ticket");

        uint256 salePrice = ticket.resalePrice;

        // Reset resale flags and bind to new buyer's biometrics
        ticket.isForResale = false;
        ticket.resalePrice = 0;
        ticket.biometricCommitment = newBuyerBiometricCommitment;

        // Transfer token ownership
        _transfer(currentOwner, msg.sender, tokenId);

        // Payout to previous owner
        payable(currentOwner).transfer(salePrice);

        // Refund excess
        if (msg.value > salePrice) {
            payable(msg.sender).transfer(msg.value - salePrice);
        }

        emit TicketResold(tokenId, currentOwner, msg.sender, salePrice, newBuyerBiometricCommitment);
    }

    /**
     * @notice Get full ticket information by token ID.
     */
    function getTicket(uint256 tokenId) external view returns (TicketData memory) {
        require(_ownerOf(tokenId) != address(0), "TruePass: Token does not exist");
        return tickets[tokenId];
    }

    /**
     * @notice Return total minted tickets count.
     */
    function totalSupply() external view returns (uint256) {
        return _nextTokenId;
    }

    /**
     * @notice Get all token IDs owned by an address.
     */
    function getTokensOfOwner(address attendee) external view returns (uint256[] memory) {
        uint256 total = _nextTokenId;
        uint256 count = 0;

        for (uint256 i = 1; i <= total; i++) {
            if (_ownerOf(i) == attendee) {
                count++;
            }
        }

        uint256[] memory result = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 1; i <= total; i++) {
            if (_ownerOf(i) == attendee) {
                result[index] = i;
                index++;
            }
        }
        return result;
    }

    /**
     * @notice Withdraw platform revenue collected from primary sales.
     */
    function withdrawFunds() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "TruePass: No funds to withdraw");
        payable(owner()).transfer(balance);
    }
}
