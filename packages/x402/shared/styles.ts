/**
 * Shared styles for x402 paywall system
 */

import type { ThemeConfig } from './types';
import { NAMEFI_THEME } from './constants';

/**
 * Check if a background value contains a gradient
 */
export function hasGradientBackground(background: string): boolean {
  return (
    background.includes('linear-gradient') ||
    background.includes('radial-gradient')
  );
}

/**
 * Generates the Tailwind CDN script with custom theme configuration
 */
export function getTailwindScript(theme: ThemeConfig = NAMEFI_THEME): string {
  return `
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            background: '${theme.background}',
            card: '${theme.card}',
            foreground: '${theme.foreground}',
            muted: '${theme.muted}',
            'brand-primary': '${theme.brandPrimary}',
            'brand-primary-hover': '${theme.brandPrimaryHover}',
            destructive: '${theme.destructive}',
            border: '${theme.border}',
          },
          borderRadius: {
            DEFAULT: '${theme.borderRadius || '1.25rem'}',
          }
        }
      }
    }
  </script>`;
}

/**
 * Generates the base CSS styles (fonts, animations, visual effects)
 */
export function getBaseStyles(theme: ThemeConfig = NAMEFI_THEME): string {
  const isGradient = hasGradientBackground(theme.background);

  return `
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    body { 
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      ${isGradient ? `background: ${theme.background};` : ''}
    }
    
    /* ===== Card Entrance Animation ===== */
    .paywall-card {
      animation: cardEntrance 0.5s ease-out;
    }
    @keyframes cardEntrance {
      from { 
        opacity: 0; 
        transform: translateY(20px); 
      }
      to { 
        opacity: 1; 
        transform: translateY(0); 
      }
    }
    
    /* ===== Button Animations ===== */
    .btn-animate {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
      box-shadow: 
        0 0 20px 0 ${theme.brandPrimary}50,
        0 0 40px 0 ${theme.brandPrimary}30,
        0 4px 14px -3px ${theme.brandPrimary}60,
        inset 0 1px 0 rgba(255,255,255,0.1);
    }
    .btn-animate:hover {
      transform: scale(1.02) translateY(-2px);
      box-shadow: 
        0 0 30px 4px ${theme.brandPrimary}60,
        0 0 60px 8px ${theme.brandPrimary}35,
        0 12px 28px -6px ${theme.brandPrimary}70,
        inset 0 1px 0 rgba(255,255,255,0.15);
    }
    .btn-animate:active {
      transform: scale(0.98) translateY(0);
      box-shadow: 
        0 0 15px 0 ${theme.brandPrimary}40,
        0 0 30px 0 ${theme.brandPrimary}20,
        0 2px 8px -2px ${theme.brandPrimary}50,
        inset 0 1px 2px rgba(0,0,0,0.1);
    }
    
    /* Secondary button hover */
    .btn-secondary-animate {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 2px 8px -2px rgba(0, 0, 0, 0.1);
    }
    .btn-secondary-animate:hover {
      transform: scale(1.01) translateY(-1px);
      border-color: ${theme.brandPrimary} !important;
      box-shadow: 
        0 0 20px 0 ${theme.brandPrimary}30,
        0 0 40px 0 ${theme.brandPrimary}15,
        0 6px 20px -4px ${theme.brandPrimary}35;
    }
    .btn-secondary-animate:active {
      transform: scale(0.99);
      box-shadow: 
        0 0 12px 0 ${theme.brandPrimary}25,
        0 2px 6px -2px ${theme.brandPrimary}30;
    }
    
    /* ===== Success Checkmark Animation ===== */
    .success-circle {
      animation: successPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    @keyframes successPop {
      0% { 
        transform: scale(0); 
        opacity: 0; 
      }
      50% { 
        transform: scale(1.1); 
      }
      100% { 
        transform: scale(1); 
        opacity: 1; 
      }
    }
    
    .success-checkmark path {
      stroke-dasharray: 24;
      stroke-dashoffset: 24;
      animation: checkmarkDraw 0.4s ease-out 0.2s forwards;
    }
    @keyframes checkmarkDraw {
      to { 
        stroke-dashoffset: 0; 
      }
    }
    
    /* ===== State Transitions ===== */
    .fade-in {
      animation: fadeIn 0.4s ease-out;
    }
    @keyframes fadeIn {
      from { 
        opacity: 0; 
        transform: translateY(-10px); 
      }
      to { 
        opacity: 1; 
        transform: translateY(0); 
      }
    }
    
    .slide-up {
      animation: slideUp 0.4s ease-out;
    }
    @keyframes slideUp {
      from { 
        opacity: 0; 
        transform: translateY(20px); 
      }
      to { 
        opacity: 1; 
        transform: translateY(0); 
      }
    }
    
    /* Staggered animation delays */
    .stagger-1 { animation-delay: 0.1s; animation-fill-mode: both; }
    .stagger-2 { animation-delay: 0.2s; animation-fill-mode: both; }
    .stagger-3 { animation-delay: 0.3s; animation-fill-mode: both; }
    .stagger-4 { animation-delay: 0.4s; animation-fill-mode: both; }
    
    /* ===== Spinner ===== */
    .spinner {
      border: 2px solid transparent;
      border-top-color: currentColor;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    /* Enhanced spinner with glow */
    .spinner-glow {
      box-shadow: 0 0 20px ${theme.brandPrimary}40;
    }
    
    /* ===== Shimmer Effect ===== */
    .shimmer {
      background: linear-gradient(
        90deg, 
        transparent, 
        rgba(255,255,255,0.08), 
        transparent
      );
      background-size: 1000px 100%;
      animation: shimmer 2s infinite;
    }
    @keyframes shimmer {
      0% { background-position: -1000px 0; }
      100% { background-position: 1000px 0; }
    }
    
    /* ===== Fancy Border Gradient ===== */
    .fancy-border {
      position: relative;
    }
    .fancy-border::before {
      content: "";
      position: absolute;
      inset: 0;
      border-radius: inherit;
      padding: 1px;
      background: linear-gradient(
        135deg, 
        ${theme.brandPrimary}, 
        ${theme.brandPrimaryHover}, 
        ${theme.brandPrimary}
      );
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      opacity: 0.5;
      pointer-events: none;
      transition: opacity 0.3s ease;
    }
    .fancy-border:hover::before {
      opacity: 0.7;
    }
    
    /* ===== Glassmorphism ===== */
    .glass {
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }
    .glass-subtle {
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }
    
    /* ===== Preview Controls (styles now inline for iframe compatibility) ===== */
    
    /* ===== Enhanced Shadows ===== */
    .shadow-glow {
      box-shadow: 
        0 4px 6px -1px rgba(0, 0, 0, 0.1),
        0 2px 4px -1px rgba(0, 0, 0, 0.06),
        0 0 40px -10px ${theme.brandPrimary}30;
    }
    
    .shadow-glow-lg {
      box-shadow: 
        0 10px 15px -3px rgba(0, 0, 0, 0.1),
        0 4px 6px -2px rgba(0, 0, 0, 0.05),
        0 0 60px -15px ${theme.brandPrimary}40;
    }
    
    /* ===== Pulse Animation for Processing ===== */
    .pulse-subtle {
      animation: pulseSoft 2s ease-in-out infinite;
    }
    @keyframes pulseSoft {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
    
    /* ===== Balance Card Hover ===== */
    .balance-card {
      transition: all 0.2s ease;
    }
    .balance-card:hover {
      background: ${theme.background}AA !important;
    }
  </style>`;
}
