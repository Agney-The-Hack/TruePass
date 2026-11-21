// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TruePassTicket
 * @dev Soulbound, privacy-preserving biometric ticket contract.
 * Enforces role-based minting (MINTER_ROLE) and turnstile redemption (REDEEMER_ROLE)
 * using salted zero-leakage biometric commitments (bytes32).
 */

interface IERC165 {
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

interface IERC721 is IERC165 {
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    function balanceOf(address owner) external view returns (uint256 balance);
    function ownerOf(uint256 tokenId) external view returns (address owner);
}

contract TruePassTicket is IERC721 {
    string public name = "TruePass Biometric Ticket";
    string public symbol = "TPASS";

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant REDEEMER_ROLE = keccak256("REDEEMER_ROLE");

    // Mapping from role => account => hasRole
    mapping(bytes32 => mapping(address => bool)) private _roles;

    struct TicketRecord {
        address owner;
        string eventId;
        bytes32 biometricCommitment; // Salted keccak256 hash (never raw biometrics)
        bool isRedeemed;
        bool isRefunded;
        uint64 mintedAt;
        uint64 redeemedAt;
    }

    // Mapping from tokenId => TicketRecord
    mapping(uint256 => TicketRecord) public tickets;
    // Mapping from owner => balance
    mapping(address => uint256) private _balances;

    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);
    event TicketMinted(uint256 indexed tokenId, address indexed to, string eventId, bytes32 biometricCommitment);
    event TicketRedeemed(uint256 indexed tokenId, address indexed redeemer, uint256 timestamp);
    event TicketRefunded(uint256 indexed tokenId, uint256 timestamp);

    modifier onlyRole(bytes32 role) {
        require(hasRole(role, msg.sender), "TruePassTicket: sender does not have required role");
        _;
    }

    constructor(address minterRelayer, address gateRelayer) {
        _roles[ADMIN_ROLE][msg.sender] = true;
        emit RoleGranted(ADMIN_ROLE, msg.sender, msg.sender);

        address minter = (minterRelayer != address(0)) ? minterRelayer : msg.sender;
        address redeemer = (gateRelayer != address(0)) ? gateRelayer : msg.sender;

        _roles[MINTER_ROLE][minter] = true;
        emit RoleGranted(MINTER_ROLE, minter, msg.sender);

        _roles[REDEEMER_ROLE][redeemer] = true;
        emit RoleGranted(REDEEMER_ROLE, redeemer, msg.sender);
    }

    function hasRole(bytes32 role, address account) public view returns (bool) {
        return _roles[role][account] || _roles[ADMIN_ROLE][account];
    }

    function grantRole(bytes32 role, address account) external onlyRole(ADMIN_ROLE) {
        require(account != address(0), "TruePassTicket: invalid account");
        _roles[role][account] = true;
        emit RoleGranted(role, account, msg.sender);
    }

    function revokeRole(bytes32 role, address account) external onlyRole(ADMIN_ROLE) {
        _roles[role][account] = false;
        emit RoleRevoked(role, account, msg.sender);
    }

    /**
     * @notice Mints a new Soulbound ticket bound to a privacy-preserving biometric commitment
     * @dev Restricted to accounts with MINTER_ROLE (e.g. Razorpay webhook payment processor)
     */
    function mintTicket(
        address to,
        uint256 tokenId,
        string calldata eventId,
        bytes32 biometricCommitment
    ) external onlyRole(MINTER_ROLE) returns (uint256) {
        require(to != address(0), "TruePassTicket: cannot mint to zero address");
        require(tickets[tokenId].owner == address(0), "TruePassTicket: tokenId already minted");
        require(biometricCommitment != bytes32(0), "TruePassTicket: invalid zero biometric commitment");

        tickets[tokenId] = TicketRecord({
            owner: to,
            eventId: eventId,
            biometricCommitment: biometricCommitment,
            isRedeemed: false,
            isRefunded: false,
            mintedAt: uint64(block.timestamp),
            redeemedAt: 0
        });

        _balances[to] += 1;

        emit Transfer(address(0), to, tokenId);
        emit TicketMinted(tokenId, to, eventId, biometricCommitment);

        return tokenId;
    }

    /**
     * @notice Validates live gate turnstile biometric commitment and redeems ticket
     * @dev Restricted to accounts with REDEEMER_ROLE (e.g. security turnstile optical scanner)
     */
    function redeemTicket(
        uint256 tokenId,
        bytes32 liveBiometricCommitment
    ) external onlyRole(REDEEMER_ROLE) returns (bool) {
        TicketRecord storage t = tickets[tokenId];
        require(t.owner != address(0), "TruePassTicket: ticket does not exist");
        require(!t.isRefunded, "TruePassTicket: ticket was refunded");
        require(!t.isRedeemed, "TruePassTicket: ticket already redeemed");
        require(
            t.biometricCommitment == liveBiometricCommitment,
            "TruePassTicket: biometric commitment mismatch! Turnstile denied"
        );

        t.isRedeemed = true;
        t.redeemedAt = uint64(block.timestamp);

        emit TicketRedeemed(tokenId, msg.sender, block.timestamp);
        return true;
    }

    /**
     * @notice Checks if a live commitment matches the ticket without state mutation
     */
    function verifyCommitment(
        uint256 tokenId,
        bytes32 candidateCommitment
    ) external view returns (bool isValid, bool isRedeemed) {
        TicketRecord storage t = tickets[tokenId];
        if (t.owner == address(0) || t.isRefunded) {
            return (false, false);
        }
        return (t.biometricCommitment == candidateCommitment, t.isRedeemed);
    }

    function getTicket(uint256 tokenId) external view returns (
        address owner,
        string memory eventId,
        bytes32 biometricCommitment,
        bool isRedeemed,
        bool isRefunded,
        uint64 mintedAt
    ) {
        TicketRecord storage t = tickets[tokenId];
        require(t.owner != address(0), "TruePassTicket: ticket does not exist");
        return (t.owner, t.eventId, t.biometricCommitment, t.isRedeemed, t.isRefunded, t.mintedAt);
    }

    // SOULBOUND ENFORCEMENT: Revert transfers to eliminate secondary scalping
    function transferFrom(address, address, uint256) external pure {
        revert("TruePassTicket: Soulbound tickets are non-transferable");
    }

    function safeTransferFrom(address, address, uint256) external pure {
        revert("TruePassTicket: Soulbound tickets are non-transferable");
    }

    function safeTransferFrom(address, address, uint256, bytes calldata) external pure {
        revert("TruePassTicket: Soulbound tickets are non-transferable");
    }

    // ERC-721 standard views
    function ownerOf(uint256 tokenId) external view override returns (address) {
        address owner = tickets[tokenId].owner;
        require(owner != address(0), "TruePassTicket: nonexistent token");
        return owner;
    }

    function balanceOf(address owner) external view override returns (uint256) {
        require(owner != address(0), "TruePassTicket: zero address query");
        return _balances[owner];
    }

    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return interfaceId == 0x01ffc9a7 || interfaceId == 0x80ac58cd;
    }
}
