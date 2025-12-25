import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, NETWORK_CONFIG, DEFAULT_NETWORK } from '@/contracts/config';
import AgriTraceABI from '@/contracts/AgriTrace.json';
import { initializeBlockchainManager, blockchainTransactionManager } from '@/utils/blockchainTransactionManager';

interface Web3ContextType {
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  contract: ethers.Contract | null;
  account: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchNetwork: (networkName: string) => Promise<void>;
  currentNetwork: string;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};

interface Web3ProviderProps {
  children: ReactNode;
}

export const Web3Provider: React.FC<Web3ProviderProps> = ({ children }) => {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [currentNetwork, setCurrentNetwork] = useState(DEFAULT_NETWORK);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask!');
      return;
    }

    setIsConnecting(true);
    try {
      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // Create provider and signer first
      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      const web3Signer = await web3Provider.getSigner();
      const userAccount = await web3Signer.getAddress();
      
      // Check current network
      const currentNetworkInfo = await web3Provider.getNetwork();
      console.log('Current network:', currentNetworkInfo);
      
      // Check if we're on Sepolia Testnet (default)
      const isSepolia = Number(currentNetworkInfo.chainId) === 11155111;
      const isMonad = Number(currentNetworkInfo.chainId) === 10135;
      console.log('Current chain ID:', currentNetworkInfo.chainId, 'Is Sepolia:', isSepolia, 'Is Monad:', isMonad);
      
      if (!isSepolia && !isMonad) {
        console.log('Not on supported testnet, attempting to switch to Sepolia...');
        try {
          // First try to switch to Sepolia Testnet (more reliable)
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xaa36a7' }], // 11155111 in hex (Sepolia Testnet)
          });
          console.log('Successfully switched to Sepolia Testnet');
        } catch (switchError: any) {
          console.log('Switch error:', switchError);
          
          // If the network doesn't exist, add it
          if (switchError.code === 4902) {
            console.log('Sepolia Testnet not found, adding it...');
            try {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [
                  {
                    chainId: '0xaa36a7', // 11155111 in hex
                    chainName: 'Sepolia Testnet',
                    rpcUrls: ['https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'],
                    blockExplorerUrls: ['https://sepolia.etherscan.io/'],
                    nativeCurrency: {
                      name: 'Ethereum',
                      symbol: 'ETH',
                      decimals: 18,
                    },
                  },
                ],
              });
              console.log('Successfully added Sepolia Testnet');
            } catch (addError: any) {
              console.error('Error adding Sepolia Testnet:', addError);
              alert('Failed to add Sepolia Testnet. Please add it manually in MetaMask:\n\nNetwork Name: Sepolia Testnet\nRPC URL: https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161\nChain ID: 11155111\nCurrency Symbol: ETH');
            }
          } else if (switchError.code === -32002) {
            console.log('Network switch request already pending, waiting...');
            // Wait a bit and try again
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            console.error('Network switch error:', switchError);
            alert('Failed to switch to Sepolia Testnet. Please switch manually in MetaMask to Sepolia Testnet (Chain ID: 11155111)');
          }
        }
      } else {
        console.log('Already on supported testnet:', isSepolia ? 'Sepolia' : 'Monad');
      }
      
      // Create contract instance
      const contractInstance = new ethers.Contract(
        CONTRACT_ADDRESS,
        AgriTraceABI.abi,
        web3Signer
      );

      // Get network info for display
      const networkName = Object.keys(NETWORK_CONFIG).find(
        key => NETWORK_CONFIG[key as keyof typeof NETWORK_CONFIG].chainId === Number(currentNetworkInfo.chainId)
      ) || DEFAULT_NETWORK;

      setProvider(web3Provider);
      setSigner(web3Signer);
      setContract(contractInstance);
      setAccount(userAccount);
      setIsConnected(true);
      setCurrentNetwork(networkName);

      // Initialize blockchain manager with MetaMask provider
      initializeBlockchainManager(web3Provider, web3Signer);

      // Listen for account changes
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else {
          setAccount(accounts[0]);
        }
      });

      // Listen for network changes
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });

    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert('Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setProvider(null);
    setSigner(null);
    setContract(null);
    setAccount(null);
    setIsConnected(false);
    setCurrentNetwork(DEFAULT_NETWORK);
    
    // Clear blockchain manager
    blockchainTransactionManager = null as any;
  };

  const switchNetwork = async (networkName: string) => {
    if (!window.ethereum) {
      alert('Please install MetaMask!');
      return;
    }

    const network = NETWORK_CONFIG[networkName as keyof typeof NETWORK_CONFIG];
    if (!network) {
      alert('Network not supported');
      return;
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${network.chainId.toString(16)}` }],
      });
      setCurrentNetwork(networkName);
    } catch (error: any) {
      // If the network doesn't exist, add it
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${network.chainId.toString(16)}`,
                chainName: network.name,
                rpcUrls: [network.rpcUrl],
                blockExplorerUrls: [network.blockExplorer],
              },
            ],
          });
        } catch (addError) {
          console.error('Error adding network:', addError);
          alert('Failed to add network');
        }
      } else {
        console.error('Error switching network:', error);
        alert('Failed to switch network');
      }
    }
  };

  // Check if already connected on mount
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            await connectWallet();
          }
        } catch (error) {
          console.error('Error checking connection:', error);
        }
      }
    };

    checkConnection();
  }, []);

  const value: Web3ContextType = {
    provider,
    signer,
    contract,
    account,
    isConnected,
    isConnecting,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    currentNetwork,
  };

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
};

// Extend Window interface for TypeScript
declare global {
  interface Window {
    ethereum?: any;
  }
}
