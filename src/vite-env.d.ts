/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TOKEN_FACTORY_ADDRESS: string
  readonly VITE_CHAIN_ID: string
  readonly VITE_CHAIN_NAME: string
  readonly VITE_RPC_URL: string
  readonly VITE_BLOCK_EXPLORER_URL: string
  readonly VITE_NATIVE_CURRENCY_NAME: string
  readonly VITE_NATIVE_CURRENCY_SYMBOL: string
  readonly VITE_NATIVE_CURRENCY_DECIMALS: string
  readonly VITE_NODE_ENV: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
