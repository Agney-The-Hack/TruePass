// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TruePassSoulbound
 * @dev Non-transferable (Soulbound) Biometric Event Ticket NFT
 * Locked to the buyer's 128-dimensional facial biometric hash.
 */

interface IERC165 {
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

interface IERC721 is IERC165 {
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    function balanceOf(address owner) external view returns (uint256 balance);
    function ownerOf(uint256 tokenId) external view returns (address owner);
}

contract TruePassSoulbound is IERC721 {
    string public name = "TruePass Biometric Ticket";
    string public symbol = "TPASS";

    uint256 private _nextTokenId = 1001;
    address public organizer;

    struct BiometricTicket {
        string bookingId;
        string eventId;
        string eventTitle;
        string seat;
        uint256 price;
        bytes32 biometricHash; // keccak256 hash of 128-d face descriptor
        uint64 timestamp;
        bool isUsed;
        bool isRefunded;
    }

    // Mapping from tokenId => Ticket Data
    mapping(uint256 => BiometricTicket) public tickets;
    // Mapping from tokenId => Owner address
    mapping(uint256 => address) private _owners;
    // Mapping from owner address => token count
    mapping(address => uint256) private _balances;
    // Mapping from bookingId => tokenId
    mapping(string => uint256) public bookingToTokenId;

    event TicketMinted(uint256 indexed tokenId, address indexed buyer, string bookingId, bytes32 biometricHash);
    event TurnstileAdmitted(uint256 indexed tokenId, string bookingId, uint256 timestamp);
    event TicketRefunded(uint256 indexed tokenId, string bookingId, uint256 timestamp);

    modifier onlyOrganizer() {
        require(msg.sender == organizer, "Only organizer can perform this");
        _;
    }

    constructor() {
        organizer = msg.sender;
    }

    /**
     * @notice Mint a Soulbound Ticket locked to the buyer's biometric face hash
     */
    function mintBiometricTicket(
        address to,
        string calldata bookingId,
        string calldata eventId,
        string calldata eventTitle,
        string calldata seat,
        uint256 price,
        bytes32 biometricHash
    ) external returns (uint256) {
        require(to != address(0), "Cannot mint to zero address");
        require(bookingToTokenId[bookingId] == 0, "Booking ID already minted on-chain");

        uint256 tokenId = _nextTokenId++;
        _owners[tokenId] = to;
        _balances[to] += 1;

        tickets[tokenId] = BiometricTicket({
            bookingId: bookingId,
            eventId: eventId,
            eventTitle: eventTitle,
            seat: seat,
            price: price,
            biometricHash: biometricHash,
            timestamp: uint64(block.timestamp),
            isUsed: false,
            isRefunded: false
        });

        bookingToTokenId[bookingId] = tokenId;

        emit Transfer(address(0), to, tokenId);
        emit TicketMinted(tokenId, to, bookingId, biometricHash);

        return tokenId;
    }

    /**
     * @notice SOULBOUND ENFORCEMENT: Revert any transfer attempt.
     * Prevents scalping, reselling, and ticket transfer.
     */
    function transferFrom(address from, address to, uint256 tokenId) external pure {
        revert("TruePass: Biometric tickets are Soulbound and cannot be transferred or resold");
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) external pure {
        revert("TruePass: Biometric tickets are Soulbound and cannot be transferred or resold");
    }

    /**
     * @notice Gate Turnstile Admission Check
     * Compares live camera facial hash with the on-chain ticket hash
     */
    function validateTurnstileEntry(uint256 tokenId, bytes32 liveScanHash) external returns (bool) {
        BiometricTicket storage t = tickets[tokenId];
        require(_owners[tokenId] != address(0), "Ticket does not exist");
        require(!t.isUsed, "Turnstile Denied: Ticket already used");
        require(!t.isRefunded, "Turnstile Denied: Ticket was refunded");
        require(t.biometricHash == liveScanHash, "Turnstile Denied: Biometric face hash mismatch!");

        t.isUsed = true;
        emit TurnstileAdmitted(tokenId, t.bookingId, block.timestamp);
        return true;
    }

    /**
     * @notice Revoke ticket on refund
     */
    function burnOnRefund(uint256 tokenId) external {
        BiometricTicket storage t = tickets[tokenId];
        require(_owners[tokenId] != address(0), "Ticket does not exist");
        require(!t.isRefunded, "Ticket already refunded");

        t.isRefunded = true;
        emit TicketRefunded(tokenId, t.bookingId, block.timestamp);
    }

    // ERC-721 View Functions
    function ownerOf(uint256 tokenId) external view override returns (address) {
        address owner = _owners[tokenId];
        require(owner != address(0), "Token does not exist");
        return owner;
    }

    function balanceOf(address owner) external view override returns (uint256) {
        require(owner != address(0), "Address zero is not valid");
        return _balances[owner];
    }

    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return interfaceId == 0x01ffc9a7 || interfaceId == 0x80ac58cd;
    }
}
