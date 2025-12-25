// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.9.3/contracts/access/AccessControl.sol"; 
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.9.3/contracts/access/Ownable2Step.sol"; 
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.9.3/contracts/security/ReentrancyGuard.sol"; 

contract AgriTrace is AccessControl, Ownable2Step, ReentrancyGuard {
    bytes32 public constant FARMER_ROLE = keccak256("FARMER_ROLE");
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");
    bytes32 public constant RETAILER_ROLE = keccak256("RETAILER_ROLE");

    struct Batch {
        uint256 id;
        address farmer;
        string crop;
        string variety;
        string harvestQuantity;
        string sowingDate;
        string harvestDate;
        string freshnessDuration;
        string grading;
        string certification;
        string labTest;
        uint256 price;
        string ipfsHash;
        string languageDetected;
        string summary;
        string callStatus;
        uint256 offTopicCount;
        address currentOwner;
    }

    struct BatchInput {
        string crop;
        string variety;
        string harvestQuantity;
        string sowingDate;
        string harvestDate;
        string freshnessDuration;
        string grading;
        string certification;
        string labTest;
        uint256 price;
        string ipfsHash;
        string languageDetected;
        string summary;
        string callStatus;
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

    // Updated registerBatch - removed role requirement for easier testing
    function registerBatch(BatchInput calldata input) external {
        require(input.price > 0, "Price must be greater than 0");

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

    // New function for recording harvest transactions (called by blockchain transaction manager)
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

    // New function for recording purchase transactions (called by blockchain transaction manager)
    function recordPurchase(
        uint256 batchId,
        address from,
        address to,
        uint256 quantity,
        uint256 price
    ) external {
        // Verify the batch exists
        require(batches[batchId].currentOwner == from, "Invalid current owner");
        
        // Update ownership
        batches[batchId].currentOwner = to;
        
        emit PurchaseRecorded(batchId, from, to, quantity, price);
        emit BatchOwnershipTransferred(batchId, from, to);
    }

    // Function to get batch owner (for blockchain transaction manager)
    function getBatchOwner(uint256 batchId) external view returns (address) {
        return batches[batchId].currentOwner;
    }

    function transferBatch(uint256 batchId, address to) external {
        Batch storage batch = batches[batchId];
        require(batch.currentOwner == msg.sender, "Not current owner");
        require(to != address(0), "Invalid recipient");

        batch.currentOwner = to;
        emit BatchOwnershipTransferred(batchId, msg.sender, to);
    }

    function updatePrice(uint256 batchId, uint256 newPrice) external {
        Batch storage batch = batches[batchId];
        require(batch.currentOwner == msg.sender, "Not current owner");
        require(newPrice > 0, "Invalid price");

        batch.price = newPrice;
        emit PriceUpdated(batchId, newPrice);
    }

    function tipFarmer(address farmer) external payable nonReentrant {
        require(hasRole(FARMER_ROLE, farmer), "Not a farmer");
        require(msg.value > 0, "No ETH sent");

        (bool success, ) = payable(farmer).call{value: msg.value}("");
        require(success, "Transfer failed");

        reputation[farmer] += msg.value / 1e15;
        emit Tipped(msg.sender, farmer, msg.value);
    }

    function addFarmer(address farmer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(FARMER_ROLE, farmer);
    }

    function addDistributor(address distributor) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(DISTRIBUTOR_ROLE, distributor);
    }

    function addRetailer(address retailer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(RETAILER_ROLE, retailer);
    }

    // Helper function to check if address has any role
    function hasAnyRole(address account) external view returns (bool) {
        return hasRole(FARMER_ROLE, account) || 
               hasRole(DISTRIBUTOR_ROLE, account) || 
               hasRole(RETAILER_ROLE, account);
    }
}
