const getEnv = (key: keyof ImportMetaEnv, fallback?: string) => {
  const value = import.meta.env[key];
  if (value) return value;
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing required environment variable: ${key}`);
};

export const CONTRACT_ADDRESS = getEnv("VITE_CONTRACT_ADDRESS");

export const NETWORK_CONFIG = {
  sepolia: {
    chainId: 11155111,
    name: "Sepolia Testnet",
    rpcUrl: getEnv("VITE_SEPOLIA_RPC_URL"),
    blockExplorer: getEnv("VITE_SEPOLIA_EXPLORER", "https://sepolia.etherscan.io/")
  },
  monad: {
    chainId: 10135,
    name: "Monad Testnet",
    rpcUrl: getEnv("VITE_MONAD_RPC_URL"),
    blockExplorer: getEnv("VITE_MONAD_EXPLORER", "https://testnet.monadexplorer.com/")
  }
};

export const DEFAULT_NETWORK = getEnv("VITE_DEFAULT_NETWORK", "sepolia");

export const PINATA_CONFIG = {
  apiKey: getEnv("VITE_PINATA_API_KEY"),
  apiSecret: getEnv("VITE_PINATA_API_SECRET"),
  jwt: getEnv("VITE_PINATA_JWT"),
  gatewayUrl: getEnv("VITE_PINATA_GATEWAY_URL", "https://gateway.pinata.cloud/ipfs/")
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
