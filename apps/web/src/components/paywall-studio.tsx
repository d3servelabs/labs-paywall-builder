'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Monitor,
  Tablet,
  Smartphone,
  Download,
  Sparkles,
  Palette,
  Code2,
  RotateCcw,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  generateGenericPaywallTemplate,
  THEME_PRESETS,
  COINBASE_BRANDING,
  type ThemeConfig,
  type GenericPaywallConfig,
  type ThemePresetName,
} from 'x402';

type DeviceSize = 'desktop' | 'tablet' | 'mobile';

// Get preset names from THEME_PRESETS
const PRESET_NAMES = Object.keys(THEME_PRESETS) as ThemePresetName[];

export default function PaywallStudio() {
  const [deviceSize, setDeviceSize] = useState<DeviceSize>('desktop');
  const [selectedPreset, setSelectedPreset] = useState<
    ThemePresetName | 'Custom'
  >('Coinbase');
  const [showBalances, setShowBalances] = useState(true);
  const [enableWalletConnect, setEnableWalletConnect] = useState(false);
  const [appName, setAppName] = useState(COINBASE_BRANDING.appName);
  const [appLogo, setAppLogo] = useState(COINBASE_BRANDING.appLogo);
  const [wcAppId, setWcAppId] = useState('');
  const [customTheme, setCustomTheme] = useState<ThemeConfig>(
    THEME_PRESETS.Coinbase,
  );
  const [resourceDescription, setResourceDescription] = useState(
    'Access this premium content',
  );
  const [paymentAmount, setPaymentAmount] = useState('0.01');
  const [successRedirectUrl, setSuccessRedirectUrl] = useState('');
  const [autoSuccessRedirect, setAutoSuccessRedirect] = useState(true);

  // Get current theme from preset or custom
  const currentTheme = useMemo<ThemeConfig>(() => {
    if (selectedPreset === 'Custom') {
      return customTheme;
    }
    return THEME_PRESETS[selectedPreset];
  }, [selectedPreset, customTheme]);

  const getDeviceWidth = () => {
    switch (deviceSize) {
      case 'mobile':
        return 'max-w-[375px]';
      case 'tablet':
        return 'max-w-[768px]';
      default:
        return 'max-w-[1440px]';
    }
  };

  const getDeviceHeight = () => {
    switch (deviceSize) {
      case 'mobile':
        return '650px';
      case 'tablet':
        return '700px';
      default:
        return '750px';
    }
  };

  // Parse amount for display
  const parsedAmount = parseFloat(paymentAmount) || 0.01;
  const amountInAtomicUnits = Math.round(parsedAmount * 1_000_000).toString();

  // Generate preview HTML using x402 package
  const previewHtml = useMemo(() => {
    const config: GenericPaywallConfig = {
      // Payment details
      payTo: '0x0000000000000000000000000000000000000000',
      amount: parsedAmount,
      amountInAtomicUnits,

      // Network details (mock for preview)
      network: 'eip155:8453',
      chainId: 8453,
      chainIdHex: '0x2105',
      chainName: 'Base',
      usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      rpcUrl: 'https://mainnet.base.org',
      blockExplorer: 'https://basescan.org',

      // Request context
      currentUrl:
        typeof window !== 'undefined'
          ? window.location.href
          : 'https://example.com',
      testnet: false,
      paymentRequired: {},

      // Customization
      theme: currentTheme,
      branding: {
        appName,
        appLogo,
      },

      // Features
      walletConnectProjectId:
        enableWalletConnect && wcAppId ? wcAppId : undefined,
      resourceDescription,

      // Preview mode configuration
      preview: {
        isPreview: true,
        mockAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f3F3B9',
        mockBalances: showBalances
          ? [
              { chainName: 'Base', balance: '125.50' },
              { chainName: 'Ethereum', balance: '45.25' },
            ]
          : [],
        showPreviewControls: true,
      },
    };

    return generateGenericPaywallTemplate(config);
  }, [
    currentTheme,
    appName,
    appLogo,
    enableWalletConnect,
    wcAppId,
    showBalances,
    resourceDescription,
    parsedAmount,
    amountInAtomicUnits,
  ]);

  // Build export config with user's settings
  const buildExportConfig = (): GenericPaywallConfig => ({
    // Payment details - user configured
    payTo: '0x0000000000000000000000000000000000000000', // Placeholder - server will override
    amount: parsedAmount,
    amountInAtomicUnits,

    // Network details
    network: 'eip155:8453',
    chainId: 8453,
    chainIdHex: '0x2105',
    chainName: 'Base',
    usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    rpcUrl: 'https://mainnet.base.org',
    blockExplorer: 'https://basescan.org',

    // Request context
    currentUrl: '{{CURRENT_URL}}', // Placeholder - server will override
    testnet: false,
    paymentRequired: {},

    // Customization - user configured
    theme: currentTheme,
    branding: {
      appName,
      appLogo,
    },

    // Features - user configured
    walletConnectProjectId:
      enableWalletConnect && wcAppId ? wcAppId : undefined,
    resourceDescription,

    // Redirect options - user configured
    successRedirectUrl: successRedirectUrl || undefined,
    autoSuccessRedirect,

    // No preview mode for export
    preview: undefined,
  });

  // Export production HTML (without preview mode)
  const handleExportHTML = () => {
    const config = buildExportConfig();
    const html = generateGenericPaywallTemplate(config);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${appName.toLowerCase().replace(/\s+/g, '-')}-paywall.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('HTML file downloaded');
  };

  // Copy HTML to clipboard
  const handleCopyCode = async () => {
    const config = buildExportConfig();
    const html = generateGenericPaywallTemplate(config);
    try {
      await navigator.clipboard.writeText(html);
      toast.success('HTML copied to clipboard');
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error('Failed to copy to clipboard');
    }
  };

  // Reset all settings to defaults
  const handleResetDefaults = () => {
    setSelectedPreset('Coinbase');
    setShowBalances(true);
    setEnableWalletConnect(false);
    setAppName(COINBASE_BRANDING.appName);
    setAppLogo(COINBASE_BRANDING.appLogo);
    setWcAppId('');
    setCustomTheme(THEME_PRESETS.Coinbase);
    setResourceDescription('Access this premium content');
    setPaymentAmount('0.01');
    setSuccessRedirectUrl('');
    setAutoSuccessRedirect(true);
    toast.success('Settings reset to defaults');
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Controls Panel */}
      <div className="w-96 border-r border-border/50 bg-card/50 backdrop-blur-xl">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            <div className="space-y-2 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-accent/10 border border-accent/20">
                  <Sparkles className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                    Paywall Builder
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    Customize your x402 paywall
                  </p>
                </div>
              </div>
            </div>

            <Separator className="bg-border/50" />

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-accent" />
                <Label className="text-sm font-semibold text-foreground">
                  Theme Preset
                </Label>
              </div>
              <Select
                value={selectedPreset}
                onValueChange={(v) =>
                  setSelectedPreset(v as ThemePresetName | 'Custom')
                }
              >
                <SelectTrigger className="bg-secondary/50 border-border/50 text-foreground hover:bg-secondary/70 transition-colors h-11 shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover/95 backdrop-blur-xl border-border/50">
                  {PRESET_NAMES.map((presetName) => (
                    <SelectItem
                      key={presetName}
                      value={presetName}
                      className="hover:bg-accent/10 focus:bg-accent/10"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                          style={{
                            background: THEME_PRESETS[presetName].brandPrimary,
                          }}
                        />
                        {presetName}
                      </div>
                    </SelectItem>
                  ))}
                  <SelectItem
                    value="Custom"
                    className="hover:bg-accent/10 focus:bg-accent/10"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-gradient-to-br from-accent to-accent/60 border border-white/20 shadow-sm" />
                      Custom
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-semibold text-foreground">
                Branding
              </h3>
              <div className="space-y-4 p-4 rounded-lg bg-secondary/30 border border-border/50 shadow-sm">
                <div className="space-y-2">
                  <Label
                    htmlFor="appName"
                    className="text-xs text-muted-foreground font-medium"
                  >
                    App Name
                  </Label>
                  <Input
                    id="appName"
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    className="bg-background/50 border-border/50 text-foreground h-10 focus:border-accent/50 transition-all shadow-sm"
                    placeholder="Enter app name"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="appLogo"
                    className="text-xs text-muted-foreground font-medium"
                  >
                    App Logo URL
                  </Label>
                  <Input
                    id="appLogo"
                    value={appLogo}
                    onChange={(e) => setAppLogo(e.target.value)}
                    className="bg-background/50 border-border/50 text-foreground h-10 focus:border-accent/50 transition-all shadow-sm"
                    placeholder="https://..."
                  />
                  {appLogo && (
                    <div className="flex items-center gap-2 p-2 bg-background/50 rounded border border-border/30">
                      <img
                        src={appLogo || '/placeholder.svg'}
                        alt="Preview"
                        className="h-6 w-6 object-contain"
                      />
                      <span className="text-xs text-muted-foreground">
                        Logo preview
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-semibold text-foreground">Content</h3>
              <div className="space-y-4 p-4 rounded-lg bg-secondary/30 border border-border/50 shadow-sm">
                <div className="space-y-2">
                  <Label
                    htmlFor="resourceDescription"
                    className="text-xs text-muted-foreground font-medium"
                  >
                    Description
                  </Label>
                  <Input
                    id="resourceDescription"
                    value={resourceDescription}
                    onChange={(e) => setResourceDescription(e.target.value)}
                    className="bg-background/50 border-border/50 text-foreground h-10 focus:border-accent/50 transition-all shadow-sm"
                    placeholder="Access this premium content"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="paymentAmount"
                    className="text-xs text-muted-foreground font-medium"
                  >
                    Amount (USDC)
                  </Label>
                  <Input
                    id="paymentAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="bg-background/50 border-border/50 text-foreground h-10 focus:border-accent/50 transition-all shadow-sm"
                    placeholder="0.01"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-semibold text-foreground">
                Features
              </h3>
              <div className="space-y-3 p-4 rounded-lg bg-secondary/30 border border-border/50 shadow-sm">
                <div className="flex items-center justify-between p-3 rounded-md hover:bg-background/30 transition-colors">
                  <div className="space-y-0.5">
                    <Label
                      htmlFor="showBalances"
                      className="text-sm text-foreground font-medium cursor-pointer"
                    >
                      Show Balances
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Display wallet balances
                    </p>
                  </div>
                  <Switch
                    id="showBalances"
                    checked={showBalances}
                    onCheckedChange={setShowBalances}
                  />
                </div>

                <Separator className="bg-border/30" />

                <div className="flex items-center justify-between p-3 rounded-md hover:bg-background/30 transition-colors">
                  <div className="space-y-0.5">
                    <Label
                      htmlFor="enableWalletConnect"
                      className="text-sm text-foreground font-medium cursor-pointer"
                    >
                      Enable WalletConnect
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Add WalletConnect support
                    </p>
                  </div>
                  <Switch
                    id="enableWalletConnect"
                    checked={enableWalletConnect}
                    onCheckedChange={setEnableWalletConnect}
                  />
                </div>
              </div>

              {enableWalletConnect && (
                <div className="space-y-3 p-4 rounded-lg bg-accent/5 border-l-2 border-accent shadow-sm animate-in slide-in-from-left-2 duration-300">
                  <div className="space-y-2">
                    <Label
                      htmlFor="wcAppId"
                      className="text-xs text-muted-foreground font-medium flex items-center gap-1"
                    >
                      WalletConnect App ID
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="wcAppId"
                      value={wcAppId}
                      onChange={(e) => setWcAppId(e.target.value)}
                      placeholder="Your WalletConnect Project ID"
                      className="bg-background/50 border-border/50 text-foreground h-10 focus:border-accent/50 transition-all"
                    />
                    <p className="text-xs text-muted-foreground">
                      Get your Project ID from{' '}
                      <a
                        href="https://cloud.walletconnect.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:underline"
                      >
                        WalletConnect Cloud
                      </a>
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-semibold text-foreground">
                Success Redirect
              </h3>
              <div className="space-y-4 p-4 rounded-lg bg-secondary/30 border border-border/50 shadow-sm">
                <div className="space-y-2">
                  <Label
                    htmlFor="successRedirectUrl"
                    className="text-xs text-muted-foreground font-medium"
                  >
                    Redirect URL (optional)
                  </Label>
                  <Input
                    id="successRedirectUrl"
                    type="url"
                    value={successRedirectUrl}
                    onChange={(e) => setSuccessRedirectUrl(e.target.value)}
                    className="bg-background/50 border-border/50 text-foreground h-10 focus:border-accent/50 transition-all shadow-sm"
                    placeholder="https://example.com/success"
                  />
                  <p className="text-xs text-muted-foreground">
                    URL to redirect after successful payment
                  </p>
                </div>

                <div className="flex items-center justify-between p-3 rounded-md hover:bg-background/30 transition-colors">
                  <div className="space-y-0.5">
                    <Label
                      htmlFor="autoSuccessRedirect"
                      className="text-sm text-foreground font-medium cursor-pointer"
                    >
                      Auto Redirect
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically redirect after 3s
                    </p>
                  </div>
                  <Switch
                    id="autoSuccessRedirect"
                    checked={autoSuccessRedirect}
                    onCheckedChange={setAutoSuccessRedirect}
                  />
                </div>
              </div>
            </div>

            {selectedPreset === 'Custom' && (
              <div className="space-y-3 pt-2">
                <h3 className="text-sm font-semibold text-foreground">
                  Custom Colors
                </h3>
                <div className="space-y-3 p-4 rounded-lg bg-secondary/30 border border-border/50 shadow-sm">
                  {(
                    [
                      'background',
                      'card',
                      'foreground',
                      'muted',
                      'brandPrimary',
                      'brandPrimaryHover',
                      'destructive',
                      'border',
                      'borderRadius',
                    ] as const
                  ).map((key) => {
                    const value = customTheme[key] || '';
                    return (
                      <div key={key} className="space-y-2">
                        <Label
                          htmlFor={key}
                          className="text-xs text-muted-foreground font-medium capitalize"
                        >
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id={key}
                            value={value}
                            onChange={(e) =>
                              setCustomTheme((prev) => ({
                                ...prev,
                                [key]: e.target.value,
                              }))
                            }
                            className="bg-background/50 border-border/50 text-foreground font-mono text-xs h-9 focus:border-accent/50 transition-all"
                          />
                          <div
                            className="w-9 h-9 rounded border border-border/50 shadow-sm flex-shrink-0"
                            style={{
                              background: value.includes('linear-gradient')
                                ? value
                                : value,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <Separator className="bg-border/50" />

            <div className="pt-2 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  Export
                </h3>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Info className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="left"
                      className="max-w-[280px] text-xs"
                    >
                      <p>
                        The exported HTML contains a config section wrapped in{' '}
                        <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">
                          {'<!-- <CONFIG_JSON> -->'}
                        </code>{' '}
                        and{' '}
                        <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">
                          {'<!-- </CONFIG_JSON> -->'}
                        </code>{' '}
                        comments. Replace this section with your server-side
                        configuration (payTo address, amount, etc.) when
                        integrating.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <Button
                onClick={handleExportHTML}
                className="w-full h-11 bg-gradient-to-r from-accent to-accent/80 hover:from-accent/90 hover:to-accent/70 text-accent-foreground font-semibold shadow-lg shadow-accent/20 transition-all"
              >
                <Download className="w-4 h-4 mr-2" />
                Export HTML
              </Button>

              <Button
                variant="outline"
                onClick={handleCopyCode}
                className="w-full h-11 border-border/50 hover:bg-secondary/50 transition-all bg-transparent"
              >
                <Code2 className="w-4 h-4 mr-2" />
                Copy Code
              </Button>

              <Button
                variant="ghost"
                onClick={handleResetDefaults}
                className="w-full h-9 text-muted-foreground hover:text-foreground transition-all"
              >
                <RotateCcw className="w-3 h-3 mr-2" />
                Reset to Defaults
              </Button>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Preview Panel */}
      <div className="flex-1 flex flex-col">
        <div className="h-16 border-b border-border/50 flex items-center justify-center gap-2 bg-card/30 backdrop-blur-xl">
          <Tabs
            value={deviceSize}
            onValueChange={(v) => setDeviceSize(v as DeviceSize)}
          >
            <TabsList className="bg-secondary/50 border border-border/30 shadow-sm h-11">
              <TabsTrigger
                value="desktop"
                className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-md transition-all gap-2"
              >
                <Monitor className="w-4 h-4" />
                <span className="text-xs font-medium hidden sm:inline">
                  Desktop
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="tablet"
                className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-md transition-all gap-2"
              >
                <Tablet className="w-4 h-4" />
                <span className="text-xs font-medium hidden sm:inline">
                  Tablet
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="mobile"
                className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-md transition-all gap-2"
              >
                <Smartphone className="w-4 h-4" />
                <span className="text-xs font-medium hidden sm:inline">
                  Mobile
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-1 overflow-auto bg-gradient-to-br from-muted/10 via-muted/5 to-background p-8 flex items-center justify-center">
          <div
            className={`${getDeviceWidth()} w-full transition-all duration-500 ease-out`}
          >
            {/* Paywall Preview - Actual x402 HTML in iframe */}
            <div className="rounded-xl shadow-2xl border border-border/20">
              <iframe
                key={previewHtml.length}
                srcDoc={previewHtml}
                className="w-full border-0 rounded-xl"
                style={{
                  height: getDeviceHeight(),
                  pointerEvents: 'auto',
                  display: 'block',
                }}
                title="Paywall Preview"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
