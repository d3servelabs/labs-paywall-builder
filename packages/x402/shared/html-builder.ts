/**
 * HTML builder for x402 paywall pages
 *
 * Combines shared components into complete HTML pages.
 */

import type { ThemeConfig, BrandingConfig, PreviewConfig } from './types';
import {
  NAMEFI_THEME,
  NAMEFI_BRANDING,
  X402_PROTOCOL_URL,
  PAYWALL_CONFIG_META_NAME,
} from './constants';
import { getViemLoaderScript } from './viem-loader';
import { getWalletConnectLoaderScript } from './walletconnect-loader';
import { getTailwindScript, getBaseStyles } from './styles';
import {
  getDebugLoggingScript,
  getBalanceCheckingScript,
  getViemHelpersScript,
  getWalletStateScript,
  getConnectMetaMaskScript,
  getConnectWalletConnectScript,
  getSignPaymentScript,
  getDOMContentLoadedScript,
  getConfigResolutionScript,
} from './scripts';

/**
 * Options for building the paywall HTML
 */
export interface HtmlBuilderOptions {
  /** Page title */
  title: string;

  /** Theme configuration */
  theme?: ThemeConfig;

  /** Branding configuration */
  branding?: BrandingConfig;

  /** WalletConnect project ID (optional) */
  walletConnectProjectId?: string;

  /** JSON config to inject into page */
  configJson?: string;
  /** Base64 encoded JSON config to inject into page, takes precedence over configJson */
  /** If both configJson and configJsonB64 are provided, configJsonB64 takes precedence */
  configJsonB64?: string;

  /** HTML for the header section */
  headerHtml: string;

  /** HTML for the price display section */
  priceDisplayHtml: string;

  /** HTML for the success state content */
  successContentHtml: string;

  /** JavaScript to run on successful payment */
  onSuccessScript: string;

  /** Amount in USDC for pay button */
  amount: number;

  /** Formatted amount string for display (handles sub-cent values) */
  formattedAmount?: string;

  /** Additional JavaScript to include (e.g., helper functions) */
  additionalScripts?: string;

  /** Preview mode configuration */
  preview?: PreviewConfig;
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generate preview controls HTML
 */
function getPreviewControlsHtml(
  theme: ThemeConfig,
  showControls: boolean,
): string {
  if (!showControls) return '';

  // Using inline styles to avoid any CSS conflicts and ensure clickability
  return `
    <!-- Preview State Navigation Controls -->
    <div id="preview-controls" 
      style="
        position: fixed;
        bottom: 16px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 6px;
        border-radius: 9999px;
        z-index: 9999;
        background: ${theme.card}EE;
        border: 1px solid ${theme.border};
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
      ">
      <button type="button" onclick="window.togglePreviewControls()" 
        style="
          padding: 4px 8px;
          border-radius: 9999px;
          font-size: 12px;
          cursor: pointer;
          border: none;
          background: transparent;
          color: ${theme.muted};
        "
        title="Hide controls">
        <svg style="width: 12px; height: 12px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
      <div style="width: 1px; height: 16px; margin: 0 4px; background: ${theme.border};"></div>
      <button type="button" onclick="window.showState('connect')" data-state="connect" 
        style="
          padding: 4px 12px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          border: none;
          background: ${theme.foreground};
          color: ${theme.card};
        ">Connect</button>
      <button type="button" onclick="window.showState('connected')" data-state="connected" 
        style="
          padding: 4px 12px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          border: none;
          background: transparent;
          color: ${theme.foreground};
        ">Connected</button>
      <button type="button" onclick="window.showState('processing')" data-state="processing" 
        style="
          padding: 4px 12px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          border: none;
          background: transparent;
          color: ${theme.foreground};
        ">Processing</button>
      <button type="button" onclick="window.showState('success')" data-state="success" 
        style="
          padding: 4px 12px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          border: none;
          background: transparent;
          color: ${theme.foreground};
        ">Success</button>
      <button type="button" onclick="window.showState('error')" data-state="error" 
        style="
          padding: 4px 12px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          border: none;
          background: transparent;
          color: ${theme.foreground};
        ">Error</button>
    </div>
    
    <!-- Toggle button to show controls again -->
    <button type="button" id="preview-controls-toggle" onclick="window.togglePreviewControls()" 
      style="
        display: none;
        position: fixed;
        bottom: 16px;
        left: 50%;
        transform: translateX(-50%);
        padding: 8px 16px;
        border-radius: 9999px;
        font-size: 12px;
        font-weight: 500;
        z-index: 9999;
        cursor: pointer;
        border: none;
        background: ${theme.card}EE;
        border: 1px solid ${theme.border};
        color: ${theme.foreground};
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
      ">
      <span style="display: flex; align-items: center; gap: 8px;">
        <svg style="width: 12px; height: 12px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
        </svg>
        Preview Controls
      </span>
    </button>
  `;
}

/**
 * Generate preview mode script
 */
function getPreviewScript(
  preview: PreviewConfig | undefined,
  theme: ThemeConfig,
): string {
  if (!preview?.isPreview) return '';

  const mockAddress =
    preview.mockAddress || '0x742d35Cc6634C0532925a3b844Bc9e7595f3F3B9';
  const mockBalances = preview.mockBalances || [
    { chainName: 'Base', balance: '125.50' },
    { chainName: 'Ethereum', balance: '45.25' },
  ];

  // Note: All functions must be in global scope for onclick handlers to work
  return `
    // ===== Preview Mode =====
    window.isPreviewMode = true;
    window.mockAddress = '${mockAddress}';
    window.mockBalances = ${JSON.stringify(mockBalances)};
    
    // Toggle preview controls visibility (global scope)
    window.togglePreviewControls = function() {
      var controls = document.getElementById('preview-controls');
      var toggle = document.getElementById('preview-controls-toggle');
      
      if (controls && toggle) {
        if (controls.style.display === 'none') {
          controls.style.display = 'flex';
          toggle.style.display = 'none';
        } else {
          controls.style.display = 'none';
          toggle.style.display = 'block';
        }
      }
    };
    
    // Navigate between preview states (global scope)
    window.showState = function(state) {
      var states = ['connect', 'connected', 'processing', 'success', 'error'];
      
      // Hide all states
      states.forEach(function(s) {
        var el = document.getElementById('state-' + s);
        if (el) {
          el.classList.add('hidden');
          el.classList.remove('fade-in', 'slide-up');
        }
      });
      
      // Show target state with animation
      var targetEl = document.getElementById('state-' + state);
      if (targetEl) {
        targetEl.classList.remove('hidden');
        // Trigger reflow for animation
        void targetEl.offsetWidth;
        targetEl.classList.add('fade-in');
      }
      
      // Update active button styling
      var buttons = document.querySelectorAll('#preview-controls button[data-state]');
      buttons.forEach(function(btn) {
        var btnState = btn.getAttribute('data-state');
        if (btnState === state) {
          btn.style.background = '${theme.foreground}';
          btn.style.color = '${theme.card}';
        } else {
          btn.style.background = 'transparent';
          btn.style.color = '${theme.foreground}';
        }
      });
      
      // Populate mock data for connected state
      if (state === 'connected') {
        var addrEl = document.getElementById('connected-address');
        if (addrEl) {
          var addr = window.mockAddress;
          addrEl.textContent = addr.slice(0, 6) + '...' + addr.slice(-4);
        }
        
        // Populate balance container
        var balanceContainer = document.getElementById('balance-container');
        if (balanceContainer && window.mockBalances && window.mockBalances.length > 0) {
          balanceContainer.classList.remove('hidden');
          balanceContainer.innerHTML = window.mockBalances.map(function(b) {
            return '<div class="balance-card flex items-center justify-between text-sm py-2 px-3 rounded-lg mb-1" style="background: ${theme.background}88;">' +
              '<span style="color: ${theme.muted};">' + b.chainName + '</span>' +
              '<span style="color: ${theme.foreground};" class="font-medium">' + b.balance + ' USDC</span>' +
              '</div>';
          }).join('');
        }
      }
      
      // Populate error message for error state
      if (state === 'error') {
        var errorEl = document.getElementById('error-message');
        if (errorEl) {
          errorEl.textContent = 'User rejected the transaction request.';
        }
      }
    };
    
    // Override wallet functions for preview mode (global scope)
    window.connectMetaMask = function() { 
      window.showState('connected'); 
    };
    
    window.connectWalletConnect = function() { 
      window.showState('connected'); 
    };
    
    window.signPayment = function() { 
      window.showState('processing');
      setTimeout(function() { window.showState('success'); }, 1500);
    };
    
    window.disconnect = function() {
      window.showState('connect');
    };
    
    window.resetState = function() {
      window.showState('connect');
    };
  `;
}

/**
 * Build complete paywall HTML page
 */
export function buildPaywallHtml(options: HtmlBuilderOptions): string {
  const theme = options.theme || NAMEFI_THEME;
  const branding = options.branding || NAMEFI_BRANDING;
  const hasWalletConnect = !!options.walletConnectProjectId;
  const isPreview = options.preview?.isPreview ?? false;
  const showPreviewControls = options.preview?.showPreviewControls ?? true;

  const configJsonB64 = options.configJsonB64? options.configJsonB64 : options.configJson ? btoa(options.configJson) : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="${PAYWALL_CONFIG_META_NAME}" content="${configJsonB64}">
  <title>${escapeHtml(options.title)}</title>
  ${getTailwindScript(theme)}
  ${isPreview ? '' : getViemLoaderScript()}
  ${hasWalletConnect && !isPreview ? getWalletConnectLoaderScript(options.walletConnectProjectId!) : ''}
  ${getBaseStyles(theme)}
</head>
<body class="min-h-screen bg-background flex items-center justify-center p-4">
  <div class="w-full max-w-md">
    <!-- Main Card with fancy-border and entrance animation -->
    <div class="paywall-card fancy-border bg-card rounded-xl border border-border p-6 shadow-glow-lg">
      <!-- Logo with animation -->
      ${
        branding.appLogo
          ? `<div class="flex justify-center mb-6 slide-up stagger-1">
        <img src="${escapeHtml(branding.appLogo)}" alt="${escapeHtml(branding.appName)}" class="h-8" />
      </div>`
          : ''
      }

      <!-- Header -->
      <div class="text-center mb-6 slide-up stagger-2">
        ${options.headerHtml}
      </div>

      <!-- Price Display with glass effect -->
      <div class="glass-subtle bg-background rounded-lg p-4 mb-6 border border-border slide-up stagger-3">
        ${options.priceDisplayHtml}
      </div>

      <!-- Status Container -->
      <div id="status-container" class="slide-up stagger-4">
        <!-- Connect State (Initial) -->
        <div id="state-connect" class="space-y-3">
          <!-- MetaMask / Injected Wallet Button -->
          <button
            id="btn-metamask"
            onclick="connectMetaMask()"
            class="btn-animate w-full bg-brand-primary hover:bg-brand-primary-hover text-white font-semibold py-3 px-4 rounded-lg shadow-lg flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/>
              <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>
            </svg>
            <span id="btn-metamask-text">Connect Wallet</span>
          </button>

          ${
            hasWalletConnect
              ? `
          <!-- WalletConnect Button -->
          <button
            id="btn-walletconnect"
            onclick="connectWalletConnect()"
            class="btn-secondary-animate w-full bg-background hover:bg-border text-foreground font-semibold py-3 px-4 rounded-lg border border-border flex items-center justify-center gap-2"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6.09 10.26c3.26-3.19 8.54-3.19 11.8 0l.39.38c.16.16.16.42 0 .58l-1.34 1.31c-.08.08-.21.08-.29 0l-.54-.53c-2.27-2.22-5.96-2.22-8.24 0l-.58.56c-.08.08-.21.08-.29 0L5.66 11.2c-.16-.16-.16-.42 0-.58l.43-.36zm14.58 2.71l1.19 1.17c.16.16.16.42 0 .58l-5.37 5.26c-.16.16-.42.16-.58 0l-3.81-3.73c-.04-.04-.11-.04-.15 0l-3.81 3.73c-.16.16-.42.16-.58 0L2.19 14.72c-.16-.16-.16-.42 0-.58l1.19-1.17c.16-.16.42-.16.58 0l3.81 3.73c.04.04.11.04.15 0l3.81-3.73c.16-.16.42-.16.58 0l3.81 3.73c.04.04.11.04.15 0l3.81-3.73c.16-.16.42-.16.58 0z"/>
            </svg>
            WalletConnect
          </button>
          `
              : ''
          }
        </div>

        <!-- Connected State -->
        <div id="state-connected" class="hidden space-y-4 fade-in">
          <div class="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full bg-brand-primary animate-pulse"></div>
              <span class="text-sm text-muted">Connected</span>
            </div>
            <span id="connected-address" class="text-sm text-foreground font-mono"></span>
          </div>
          
          <!-- Balance Display -->
          <div id="balance-container" class="hidden bg-background rounded-lg p-3 border border-border">
            <!-- Balance content will be populated by JavaScript -->
          </div>
          
          <button
            id="btn-pay"
            onclick="signPayment()"
            class="btn-animate w-full bg-brand-primary hover:bg-brand-primary-hover text-white font-semibold py-3 px-4 rounded-lg shadow-lg flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
            Pay <span id="btn-pay-amount">${options.formattedAmount || options.amount.toFixed(2)}</span> USDC
          </button>
          
          <button
            onclick="disconnect()"
            class="w-full text-muted hover:text-foreground text-sm py-2 transition-colors"
          >
            Disconnect
          </button>
        </div>

        <!-- Processing State -->
        <div id="state-processing" class="hidden text-center space-y-4 fade-in">
          <div class="flex justify-center">
            <div class="spinner spinner-glow text-brand-primary w-8 h-8 border-[3px]"></div>
          </div>
          <div class="pulse-subtle">
            <p id="processing-text" class="text-foreground font-medium">Processing payment...</p>
            <p class="text-muted text-sm mt-1">Please confirm in your wallet</p>
          </div>
        </div>

        <!-- Success State -->
        <div id="state-success" class="hidden text-center space-y-4 fade-in">
          <div class="flex justify-center">
            <div class="success-circle w-16 h-16 rounded-full bg-brand-primary/20 flex items-center justify-center">
              <svg class="success-checkmark w-8 h-8 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
          </div>
          <div>
            ${options.successContentHtml}
          </div>
        </div>

        <!-- Error State -->
        <div id="state-error" class="hidden space-y-4 fade-in">
          <div class="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
            <div class="flex items-start gap-3">
              <svg class="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div>
                <p class="text-destructive font-medium">Payment Failed</p>
                <p id="error-message" class="text-destructive/80 text-sm mt-1"></p>
              </div>
            </div>
          </div>
          <button
            onclick="resetState()"
            class="btn-secondary-animate w-full bg-background hover:bg-border text-foreground font-semibold py-3 px-4 rounded-lg border border-border"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="text-center mt-4 slide-up stagger-4">
      <p class="text-muted text-xs">
        Powered by <a href="${X402_PROTOCOL_URL}" target="_blank" class="text-brand-primary hover:underline transition-colors">x402 Protocol</a>
      </p>
    </div>
  </div>

  ${isPreview && showPreviewControls ? getPreviewControlsHtml(theme, showPreviewControls) : ''}

  <!-- Configuration injected from server -->
  <!-- <CONFIG_JSON> -->
  <script>
    // Fallback configuration injected from server
    // Can be overridden via x-paywall-config header (base64-encoded JSON in meta tag)
    // window._x402FallbackConfig = {};
  </script>
  <!-- </CONFIG_JSON> -->

  <!-- Config resolution: reads from meta tag (header) or falls back to window global -->
  <script>
    ${getConfigResolutionScript()}
  </script>

  <script>
    ${
      isPreview
        ? getPreviewScript(options.preview, theme)
        : `
    ${getDebugLoggingScript()}
    ${getBalanceCheckingScript()}
    ${getViemHelpersScript()}
    ${getWalletStateScript()}
    ${getConnectMetaMaskScript()}
    ${getConnectWalletConnectScript(hasWalletConnect)}
    ${getSignPaymentScript({ onSuccessScript: options.onSuccessScript })}
    ${getDOMContentLoadedScript()}
    `
    }
    ${options.additionalScripts || ''}
  </script>
</body>
</html>`;
}

export function populateMetaTagPaywallConfig(
  template: string,
  config: any,
  matcher: RegExp = new RegExp('{{payment-config}}', 'g'),
): string {
  const configJsonB64 = config ? btoa(JSON.stringify(config)) : '';
  return template.replace(matcher, configJsonB64);
}
