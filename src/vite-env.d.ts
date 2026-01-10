/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_IOT_PROXY_TARGET?: string;
  readonly VITE_CONTRACT_ADDRESS: string;
  readonly VITE_SEPOLIA_RPC_URL: string;
  readonly VITE_SEPOLIA_EXPLORER?: string;
  readonly VITE_MONAD_RPC_URL: string;
  readonly VITE_MONAD_EXPLORER?: string;
  readonly VITE_DEFAULT_NETWORK?: string;
  readonly VITE_PINATA_API_KEY: string;
  readonly VITE_PINATA_API_SECRET: string;
  readonly VITE_PINATA_JWT: string;
  readonly VITE_PINATA_GATEWAY_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
