/**
 * WalletConnect ESM CDN loader script
 *
 * Loads @walletconnect/ethereum-provider from esm.sh and exposes it to window for browser usage.
 * Uses WalletConnect v2 which requires a projectId from https://cloud.walletconnect.com/
 */

/**
 * Generates the script tag to load WalletConnect from CDN
 */
export function getWalletConnectLoaderScript(projectId: string): string {
  if (!projectId) {
    return '';
  }

  return `
  <script type="module">
    // Load WalletConnect EthereumProvider from CDN
    import { EthereumProvider } from 'https://esm.sh/@walletconnect/ethereum-provider@2.8.6';
    
    // Expose to window for use in non-module scripts
    window.WalletConnectEthereumProvider = EthereumProvider;
    
    // Dispatch event to signal WalletConnect is ready
    window.dispatchEvent(new Event('walletconnect-loaded'));
    console.log('[x402-paywall] WalletConnect EthereumProvider loaded');
  </script>`;
}
