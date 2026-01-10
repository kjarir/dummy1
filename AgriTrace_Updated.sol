// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.9.3/contracts/access/AccessControl.sol"; 
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.9.3/contracts/access/Ownable2Step.sol"; 
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.9.3/contracts/security/ReentrancyGuard.sol"; 

contract AgriTrace is AccessControl, Ownable2Step, ReentrancyGuard {
    bytes32 public constant FARMER_ROLE = keccak256("FARMER_ROLE");
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");
    bytes32 public constant RETAILER_ROLE = keccak256("RETAILER_ROLE");

    // Enum for call status to save gas (replaces string)
    enum CallStatus { PENDING, ACTIVE, COMPLETED, CANCELLED }
    
    // Enum for grading to save gas (replaces string)
    enum Grading { NONE, A, B, C, PREMIUM, STANDARD }

    // Optimized struct with packed variables to reduce gas costs
    // address (20 bytes) + uint96 (12 bytes) = 32 bytes (one slot)
    struct Batch {
        address farmer;              // 20 bytes - packed with freshnessDuration
        uint96 freshnessDuration;    // 12 bytes - packed with address (total 32 bytes = 1 slot)
        address currentOwner;        // 20 bytes - separate slot
        uint256 id;                  // 32 bytes
        uint256 price;               // 32 bytes
        uint256 sowingDate;          // Unix timestamp (32 bytes)
        uint256 harvestDate;         // Unix timestamp (32 bytes)
        uint256 offTopicCount;       // 32 bytes
        CallStatus callStatus;       // 1 byte (enum) - stored with Grading
        Grading grading;             // 1 byte (enum) - stored with CallStatus
        // Variable length strings (stored separately, expensive)
        string crop;
        string variety;
        string harvestQuantity;
        string certification;
        string labTest;
        string ipfsHash;
        string languageDetected;
        string summary;
    }

    struct BatchInput {
        string crop;
        string variety;
        string harvestQuantity;
        uint256 sowingDate;         // Unix timestamp
        uint256 harvestDate;        // Unix timestamp
        uint96 freshnessDuration;   // Optimized from string
        Grading grading;            // Enum instead of string
        string certification;
        string labTest;
        uint256 price;
        string ipfsHash;
        string languageDetected;
        string summary;
        CallStatus callStatus;      // Enum instead of string
        uint256 offTopicCount;
    }

    uint256 public nextBatchId;
    mapping(uint256 => Batch) public batches;
    mapping(address => uint256) public reputation;

    // Events for blockchain transaction manager
    event BatchRegistered(uint256 indexed batchId, address indexed farmer, string crop, string ipfsHash, uint256 price);
    event BatchOwnershipTransferred(uint256 indexed batchId, address indexed from, address indexed to);
    event PurchaseRecorded(uint256 indexed batchId, address indexed from, address indexed to, uint256 quantity, uint256 price);
    event HarvestRecorded(uint256 indexed batchId, address indexed farmer, string crop, string variety, uint256 quantity, uint256 price, string ipfsHash);
    event Tipped(address indexed from, address indexed farmer, uint256 amount);
    event PriceUpdated(uint256 indexed batchId, uint256 newPrice);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * Register a new batch - SECURITY: Role check is RESTORED and REQUIRED
     * @param input Batch input data with optimized types (uint256 for dates, enums for status/grading)
     */
    function registerBatch(BatchInput calldata input) external onlyRole(FARMER_ROLE) {
        require(input.price > 0, "Price must be greater than 0");
        require(input.sowingDate > 0, "Invalid sowing date");
        require(input.harvestDate >= input.sowingDate, "Harvest date must be after sowing date");
        require(input.harvestDate <= block.timestamp, "Harvest date cannot be in the future");

        uint256 batchId = nextBatchId++;
        Batch storage b = batches[batchId];

        b.id = batchId;
        b.farmer = msg.sender;
        b.crop = input.crop;
        b.variety = input.variety;
        b.harvestQuantity = input.harvestQuantity;
        b.sowingDate = input.sowingDate;
        b.harvestDate = input.harvestDate;
        b.freshnessDuration = input.freshnessDuration;
        b.grading = input.grading;
        b.certification = input.certification;
        b.labTest = input.labTest;
        b.price = input.price;
        b.ipfsHash = input.ipfsHash;
        b.languageDetected = input.languageDetected;
        b.summary = input.summary;
        b.callStatus = input.callStatus;
        b.offTopicCount = input.offTopicCount;
        b.currentOwner = msg.sender;

        reputation[msg.sender] += 1;

        emit BatchRegistered(batchId, msg.sender, input.crop, input.ipfsHash, input.price);
    }

    /**
     * Record harvest transaction (called by blockchain transaction manager)
     */
    function recordHarvest(
        uint256 batchId,
        address farmer,
        string calldata crop,
        string calldata variety,
        uint256 quantity,
        uint256 price,
        string calldata ipfsHash
    ) external {
        // Verify the batch exists and farmer is the owner
        require(batches[batchId].currentOwner == farmer, "Invalid farmer for batch");
        
        emit HarvestRecorded(batchId, farmer, crop, variety, quantity, price, ipfsHash);
    }

    /**
     * Record purchase transaction (called by blockchain transaction manager)
     */
    function recordPurchase(
        uint256 batchId,
        address from,
        address to,
        uint256 quantity,
        uint256 price
    ) external {
        // Verify the batch exists and from is the current owner
        require(batches[batchId].currentOwner == from, "Invalid current owner");
        require(to != address(0), "Invalid recipient");
        
        // Update ownership
        batches[batchId].currentOwner = to;
        
        emit PurchaseRecorded(batchId, from, to, quantity, price);
        emit BatchOwnershipTransferred(batchId, from, to);
    }

    /**
     * Get batch owner (for blockchain transaction manager)
     */
    function getBatchOwner(uint256 batchId) external view returns (address) {
        require(batches[batchId].id != 0, "Batch does not exist");
        return batches[batchId].currentOwner;
    }

    /**
     * Transfer batch ownership
     */
    function transferBatch(uint256 batchId, address to) external {
        Batch storage batch = batches[batchId];
        require(batch.id != 0, "Batch does not exist");
        require(batch.currentOwner == msg.sender, "Not current owner");
        require(to != address(0), "Invalid recipient");

        batch.currentOwner = to;
        emit BatchOwnershipTransferred(batchId, msg.sender, to);
    }

    /**
     * Update batch price
     */
    function updatePrice(uint256 batchId, uint256 newPrice) external {
        Batch storage batch = batches[batchId];
        require(batch.id != 0, "Batch does not exist");
        require(batch.currentOwner == msg.sender, "Not current owner");
        require(newPrice > 0, "Invalid price");

        batch.price = newPrice;
        emit PriceUpdated(batchId, newPrice);
    }

    /**
     * Tip a farmer
     */
    function tipFarmer(address farmer) external payable nonReentrant {
        require(hasRole(FARMER_ROLE, farmer), "Not a farmer");
        require(msg.value > 0, "No ETH sent");
        require(farmer != address(0), "Invalid farmer address");

        (bool success, ) = payable(farmer).call{value: msg.value}("");
        require(success, "Transfer failed");

        reputation[farmer] += msg.value / 1e15;
        emit Tipped(msg.sender, farmer, msg.value);
    }

    /**
     * Admin functions to add roles
     */
    function addFarmer(address farmer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(farmer != address(0), "Invalid address");
        _grantRole(FARMER_ROLE, farmer);
    }

    function addDistributor(address distributor) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(distributor != address(0), "Invalid address");
        _grantRole(DISTRIBUTOR_ROLE, distributor);
    }

    function addRetailer(address retailer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(retailer != address(0), "Invalid address");
        _grantRole(RETAILER_ROLE, retailer);
    }

    /**
     * Helper function to check if address has any role
     */
    function hasAnyRole(address account) external view returns (bool) {
        return hasRole(FARMER_ROLE, account) || 
               hasRole(DISTRIBUTOR_ROLE, account) || 
               hasRole(RETAILER_ROLE, account);
    }
}
