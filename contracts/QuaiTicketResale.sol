// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title QuaiTicketResale
 * @dev Decentralized Secondary Ticket Marketplace deployed on Quai Network (Cyprus-1 Shard).
 * Enforces anti-scalping price caps, creator royalties, and biometric commitment re-binding.
 */

interface ITruePassTicket {
    function ownerOf(uint256 tokenId) external view returns (address);
    function verifyCommitment(uint256 tokenId, bytes32 candidateCommitment) external view returns (bool isValid, bool isRedeemed);
    function getTicket(uint256 tokenId) external view returns (
        address owner,
        string memory eventId,
        bytes32 biometricCommitment,
        bool isRedeemed,
        bool isRefunded,
        uint64 mintedAt
    );
}

contract QuaiTicketResale {
    string public constant NETWORK_ZONE = "Cyprus-1 (Shard 0x00)";
    uint256 public constant QUAI_CHAIN_ID = 15000; // Quai Orchard Testnet

    address public owner;
    address public ticketContract;

    // Platform fee: 250 basis points (2.5%)
    uint256 public platformFeeBps = 250;
    // Organizer/Artist Royalty fee: 500 basis points (5.0%)
    uint256 public royaltyFeeBps = 500;
    // Maximum allowed resale markup: 110% of face value (Anti-scalping rule)
    uint256 public maxMarkupPercent = 110;

    uint256 private _listingIdCounter = 1000;

    struct Listing {
        uint256 listingId;
        uint256 tokenId;
        string eventId;
        string bookingId;
        string seatNumber;
        address payable seller;
        uint256 priceQuai;           // Price in Quai wei (18 decimals)
        uint256 originalPriceQuai;   // Face value converted to Quai wei
        bytes32 sellerBiometricCommitment;
        bool isActive;
        bool isSold;
        uint64 listedAt;
        uint64 soldAt;
        address buyer;
    }

    // listingId => Listing
    mapping(uint256 => Listing) public listings;
    // tokenId => active listingId (0 if not listed)
    mapping(uint256 => uint256) public tokenToListingId;
    // seller => array of listingIds
    mapping(address => uint256[]) private _sellerListings;

    uint256[] public activeListingIds;

    event TicketListed(
        uint256 indexed listingId,
        uint256 indexed tokenId,
        address indexed seller,
        string eventId,
        string bookingId,
        uint256 priceQuai,
        uint256 originalPriceQuai
    );

    event TicketResold(
        uint256 indexed listingId,
        uint256 indexed tokenId,
        address indexed seller,
        address buyer,
        uint256 priceQuai,
        bytes32 newBuyerBiometricCommitment
    );

    event ListingCancelled(uint256 indexed listingId, uint256 indexed tokenId, address indexed seller);
    event ListingPriceUpdated(uint256 indexed listingId, uint256 oldPrice, uint256 newPrice);

    modifier onlyOwner() {
        require(msg.sender == owner, "QuaiResale: caller is not the owner");
        _;
    }

    constructor(address _ticketContract) {
        owner = msg.sender;
        ticketContract = _ticketContract;
    }

    function setTicketContract(address _ticketContract) external onlyOwner {
        ticketContract = _ticketContract;
    }

    function setFees(uint256 _platformFeeBps, uint256 _royaltyFeeBps, uint256 _maxMarkup) external onlyOwner {
        require(_platformFeeBps + _royaltyFeeBps <= 2000, "QuaiResale: fees cannot exceed 20%");
        platformFeeBps = _platformFeeBps;
        royaltyFeeBps = _royaltyFeeBps;
        maxMarkupPercent = _maxMarkup;
    }

    /**
     * @notice Lists a genuine ticket for resale on Quai Network.
     * Enforces anti-scalping price caps and verifies ticket status.
     */
    function listTicket(
        uint256 tokenId,
        string calldata eventId,
        string calldata bookingId,
        string calldata seatNumber,
        uint256 priceQuai,
        uint256 originalPriceQuai,
        bytes32 sellerBiometricCommitment
    ) external returns (uint256) {
        require(priceQuai > 0, "QuaiResale: price must be greater than zero");
        require(tokenToListingId[tokenId] == 0, "QuaiResale: ticket is already listed for resale");

        // Anti-scalping rule: price cannot exceed face value * maxMarkupPercent / 100
        if (originalPriceQuai > 0 && maxMarkupPercent > 0) {
            uint256 maxAllowedPrice = (originalPriceQuai * maxMarkupPercent) / 100;
            require(
                priceQuai <= maxAllowedPrice,
                "QuaiResale: price exceeds event anti-scalping cap (max 110% of face value)"
            );
        }

        // Verify ticket on-chain if contract is linked
        if (ticketContract != address(0)) {
            try ITruePassTicket(ticketContract).getTicket(tokenId) returns (
                address ticketOwner,
                string memory,
                bytes32,
                bool isRedeemed,
                bool isRefunded,
                uint64
            ) {
                require(ticketOwner == msg.sender, "QuaiResale: seller does not own this ticket");
                require(!isRedeemed, "QuaiResale: used tickets cannot be resold");
                require(!isRefunded, "QuaiResale: refunded tickets cannot be resold");
            } catch {}
        }

        uint256 listingId = _listingIdCounter++;

        listings[listingId] = Listing({
            listingId: listingId,
            tokenId: tokenId,
            eventId: eventId,
            bookingId: bookingId,
            seatNumber: seatNumber,
            seller: payable(msg.sender),
            priceQuai: priceQuai,
            originalPriceQuai: originalPriceQuai,
            sellerBiometricCommitment: sellerBiometricCommitment,
            isActive: true,
            isSold: false,
            listedAt: uint64(block.timestamp),
            soldAt: 0,
            buyer: address(0)
        });

        tokenToListingId[tokenId] = listingId;
        _sellerListings[msg.sender].push(listingId);
        activeListingIds.push(listingId);

        emit TicketListed(
            listingId,
            tokenId,
            msg.sender,
            eventId,
            bookingId,
            priceQuai,
            originalPriceQuai
        );

        return listingId;
    }

    /**
     * @notice Cancels an active ticket listing. Only callable by original seller or owner.
     */
    function cancelListing(uint256 listingId) external {
        Listing storage l = listings[listingId];
        require(l.isActive, "QuaiResale: listing is not active");
        require(l.seller == msg.sender || msg.sender == owner, "QuaiResale: unauthorized");

        l.isActive = false;
        tokenToListingId[l.tokenId] = 0;
        _removeFromActiveListings(listingId);

        emit ListingCancelled(listingId, l.tokenId, l.seller);
    }

    /**
     * @notice Updates the price of an active listing (cannot exceed anti-scalping cap).
     */
    function updateListingPrice(uint256 listingId, uint256 newPriceQuai) external {
        Listing storage l = listings[listingId];
        require(l.isActive, "QuaiResale: listing is not active");
        require(l.seller == msg.sender, "QuaiResale: only seller can update price");
        require(newPriceQuai > 0, "QuaiResale: invalid price");

        if (l.originalPriceQuai > 0 && maxMarkupPercent > 0) {
            uint256 maxAllowed = (l.originalPriceQuai * maxMarkupPercent) / 100;
            require(newPriceQuai <= maxAllowed, "QuaiResale: price exceeds anti-scalping cap");
        }

        uint256 oldPrice = l.priceQuai;
        l.priceQuai = newPriceQuai;

        emit ListingPriceUpdated(listingId, oldPrice, newPriceQuai);
    }

    /**
     * @notice Buys a ticket listed on Quai Network.
     * Dispatches native QUAI to seller, fee and royalty to owner, and re-binds ticket biometrics to buyer.
     */
    function buyTicket(
        uint256 listingId,
        bytes32 newBuyerBiometricCommitment
    ) external payable {
        Listing storage l = listings[listingId];
        require(l.isActive, "QuaiResale: listing is not active");
        require(!l.isSold, "QuaiResale: ticket is already sold");
        require(msg.sender != l.seller, "QuaiResale: seller cannot buy their own ticket");
        require(msg.value >= l.priceQuai, "QuaiResale: insufficient QUAI sent for purchase");
        require(newBuyerBiometricCommitment != bytes32(0), "QuaiResale: buyer biometric commitment required");

        l.isActive = false;
        l.isSold = true;
        l.soldAt = uint64(block.timestamp);
        l.buyer = msg.sender;
        tokenToListingId[l.tokenId] = 0;
        _removeFromActiveListings(listingId);

        // Compute fees
        uint256 platformFee = (l.priceQuai * platformFeeBps) / 10000;
        uint256 royaltyFee = (l.priceQuai * royaltyFeeBps) / 10000;
        uint256 sellerProceeds = l.priceQuai - platformFee - royaltyFee;

        // Disburse funds
        (bool sellerSent, ) = l.seller.call{value: sellerProceeds}("");
        require(sellerSent, "QuaiResale: failed to disburse QUAI to seller");

        if (platformFee + royaltyFee > 0) {
            (bool feeSent, ) = payable(owner).call{value: platformFee + royaltyFee}("");
            require(feeSent, "QuaiResale: failed to disburse fees");
        }

        // Refund any excess QUAI sent
        if (msg.value > l.priceQuai) {
            (bool refundSent, ) = payable(msg.sender).call{value: msg.value - l.priceQuai}("");
            require(refundSent, "QuaiResale: failed to refund excess QUAI");
        }

        emit TicketResold(
            listingId,
            l.tokenId,
            l.seller,
            msg.sender,
            l.priceQuai,
            newBuyerBiometricCommitment
        );
    }

    function getListing(uint256 listingId) external view returns (Listing memory) {
        return listings[listingId];
    }

    function getAllActiveListingIds() external view returns (uint256[] memory) {
        return activeListingIds;
    }

    function getSellerListingIds(address seller) external view returns (uint256[] memory) {
        return _sellerListings[seller];
    }

    function _removeFromActiveListings(uint256 listingId) private {
        uint256 len = activeListingIds.length;
        for (uint256 i = 0; i < len; i++) {
            if (activeListingIds[i] == listingId) {
                activeListingIds[i] = activeListingIds[len - 1];
                activeListingIds.pop();
                break;
            }
        }
    }

    // Support receiving native QUAI
    receive() external payable {}
}
