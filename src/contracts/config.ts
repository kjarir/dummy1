// Contract configuration
// Note: This contract address needs to be deployed on the network you're using
export const CONTRACT_ADDRESS = "0xf8e81D47203A594245E36C48e151709F0C19fBe8";

// Network configuration
export const NETWORK_CONFIG = {
  sepolia: {
    chainId: 11155111,
    name: "Sepolia Testnet",
    rpcUrl: "https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
    blockExplorer: "https://sepolia.etherscan.io/"
  },
  monad: {
    chainId: 10135,
    name: "Monad Testnet",
    rpcUrl: "https://testnet-rpc.monad.xyz/",
    blockExplorer: "https://testnet.monadexplorer.com/"
  }
};

// Default network - Sepolia (more reliable)
export const DEFAULT_NETWORK = "sepolia";

// Pinata configuration
export const PINATA_CONFIG = {
  apiKey: "b76b2e03a517858e1a0b",
  apiSecret: "3b4b9d97711a7207ee9dc2e90ca755d67c229bb78d54c93086d62966ce6fb2b2",
  jwt: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiIwNWMzZjBmNC1hZDkwLTQyMWYtOTI5NS01ZDhhZjVlZmNiMzIiLCJlbWFpbCI6Inl1c3VmaWl0YWl3b3Jrc2hvcEBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiYjc2YjJlMDNhNTE3ODU4ZTFhMGIiLCJzY29wZWRLZXlTZWNyZXQiOiIzYjRiOWQ5NzcxMWE3MjA3ZWU5ZGMyZTkwY2E3NTVkNjdjMjI5YmI3OGQ1NGM5MzA4NmQ2Mjk2NmNlNmZiMmIyIiwiZXhwIjoxNzk3MzIwMjQ4fQ.sgLTpHgLEo6GIiAc1PrdB-D8IS-nSYBj-rXYmiBu4CE",
  gatewayUrl: "https://gateway.pinata.cloud/ipfs/"
};

// Contract types
export interface BatchInput {
  crop: string;
  variety: string;
  harvestQuantity: string;
  sowingDate: string;
  harvestDate: string;
  freshnessDuration: string;
  grading: string;
  certification: string;
  labTest: string;
  price: number;
  ipfsHash: string;
  languageDetected: string;
  summary: string;
  callStatus: string;
  offTopicCount: number;
}

export interface Batch {
  id: number;
  farmer: string;
  crop: string;
  variety: string;
  harvestQuantity: string;
  sowingDate: string;
  harvestDate: string;
  freshnessDuration: string;
  grading: string;
  certification: string;
  labTest: string;
  price: number;
  ipfsHash: string;
  languageDetected: string;
  summary: string;
  callStatus: string;
  offTopicCount: number;
  currentOwner: string;
}
