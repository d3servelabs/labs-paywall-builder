"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Trash2, ExternalLink, AlertCircle } from "lucide-react";
import { validateEndpointUrl, getUrlValidationConfig } from "@/lib/utils";

type AuthType =
  | "none"
  | "bearer"
  | "api_key_header"
  | "api_key_query"
  | "basic_auth"
  | "custom_headers";

// Check if testnet is forced via environment variable
const isTestnetForced = process.env.NEXT_PUBLIC_FORCE_TESTNET === "true";

// Get URL validation config
const urlValidationConfig = getUrlValidationConfig();

interface Endpoint {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  targetUrl: string;
  authType: AuthType;
  authConfig: Record<string, string>;
  paywallAmount: string;
  paywallPayTo: string | null;
  paywallTestnet: boolean;
  paywallConfig: Record<string, unknown>;
  customHtml: string | null;
  cname: string | null;
  cnameVerified: boolean;
  isActive: boolean;
  rateLimitPerSec: number;
}

export default function EditEndpointPage() {
  const router = useRouter();
  const params = useParams();
  const endpointId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [authType, setAuthType] = useState<AuthType>("none");
  const [authConfig, setAuthConfig] = useState<Record<string, string>>({});
  const [paywallAmount, setPaywallAmount] = useState("");
  const [paywallPayTo, setPaywallPayTo] = useState("");
  const [paywallTestnet, setPaywallTestnet] = useState(false);
  const [customHtml, setCustomHtml] = useState("");
  const [cname, setCname] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [rateLimitPerSec, setRateLimitPerSec] = useState("5");
  
  // Paywall branding
  const [appName, setAppName] = useState("");
  const [appLogo, setAppLogo] = useState("");
  
  // URL validation error
  const [targetUrlError, setTargetUrlError] = useState<string | null>(null);

  // Validate target URL when it changes
  const handleTargetUrlChange = (value: string) => {
    setTargetUrl(value);
    if (value) {
      const result = validateEndpointUrl(value, urlValidationConfig);
      setTargetUrlError(result.valid ? null : result.error || null);
    } else {
      setTargetUrlError(null);
    }
  };

  // Load endpoint data
  useEffect(() => {
    const fetchEndpoint = async () => {
      try {
        const response = await fetch(`/api/endpoints/${endpointId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch endpoint");
        }
        const data: Endpoint = await response.json();

        setName(data.name);
        setSlug(data.slug);
        setDescription(data.description || "");
        setTargetUrl(data.targetUrl);
        setAuthType(data.authType);
        setAuthConfig(data.authConfig || {});
        setPaywallAmount(data.paywallAmount);
        setPaywallPayTo(data.paywallPayTo || "");
        setPaywallTestnet(data.paywallTestnet);
        setCustomHtml(data.customHtml || "");
        setCname(data.cname || "");
        setIsActive(data.isActive);
        setRateLimitPerSec(data.rateLimitPerSec.toString());
        
        // Load branding from paywallConfig
        const paywallConfig = data.paywallConfig as { branding?: { appName?: string; appLogo?: string } } || {};
        setAppName(paywallConfig.branding?.appName || "");
        setAppLogo(paywallConfig.branding?.appLogo || "");
      } catch (error) {
        toast.error("Failed to load endpoint");
        router.push("/dashboard/endpoints");
      } finally {
        setIsLoading(false);
      }
    };

    fetchEndpoint();
  }, [endpointId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate URL before submitting
    const urlValidation = validateEndpointUrl(targetUrl, urlValidationConfig);
    if (!urlValidation.valid) {
      setTargetUrlError(urlValidation.error || "Invalid URL");
      toast.error(urlValidation.error || "Invalid target URL");
      return;
    }
    
    setIsSaving(true);

    try {
      const response = await fetch(`/api/endpoints/${endpointId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          slug,
          description: description || null,
          targetUrl,
          authType,
          authConfig,
          paywallAmount: parseFloat(paywallAmount),
          paywallPayTo: paywallPayTo || null,
          paywallTestnet,
          customHtml: customHtml || null,
          cname: cname || null,
          isActive,
          rateLimitPerSec: parseInt(rateLimitPerSec),
          paywallConfig: {
            branding: {
              appName: appName || undefined,
              appLogo: appLogo || undefined,
            },
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update endpoint");
      }

      toast.success("Endpoint updated successfully!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update endpoint"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this endpoint? This action cannot be undone."
      )
    ) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/endpoints/${endpointId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete endpoint");
      }

      toast.success("Endpoint deleted successfully!");
      router.push("/dashboard/endpoints");
    } catch (error) {
      toast.error("Failed to delete endpoint");
    } finally {
      setIsDeleting(false);
    }
  };

  const renderAuthConfig = () => {
    switch (authType) {
      case "bearer":
        return (
          <div className="space-y-2">
            <Label htmlFor="token">Bearer Token</Label>
            <Input
              id="token"
              type="password"
              placeholder="Enter token or use {{SECRET:name}}"
              value={authConfig.token || ""}
              onChange={(e) =>
                setAuthConfig({ ...authConfig, token: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">
              Use {"{{SECRET:name}}"} to reference an encrypted secret
            </p>
          </div>
        );

      case "api_key_header":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="headerName">Header Name</Label>
              <Input
                id="headerName"
                placeholder="X-API-Key"
                value={authConfig.headerName || ""}
                onChange={(e) =>
                  setAuthConfig({ ...authConfig, headerName: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="headerValue">Header Value</Label>
              <Input
                id="headerValue"
                type="password"
                placeholder="Enter value or use {{SECRET:name}}"
                value={authConfig.headerValue || ""}
                onChange={(e) =>
                  setAuthConfig({ ...authConfig, headerValue: e.target.value })
                }
              />
            </div>
          </div>
        );

      case "api_key_query":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="queryParam">Query Parameter</Label>
              <Input
                id="queryParam"
                placeholder="api_key"
                value={authConfig.queryParam || ""}
                onChange={(e) =>
                  setAuthConfig({ ...authConfig, queryParam: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="queryValue">Query Value</Label>
              <Input
                id="queryValue"
                type="password"
                placeholder="Enter value or use {{SECRET:name}}"
                value={authConfig.queryValue || ""}
                onChange={(e) =>
                  setAuthConfig({ ...authConfig, queryValue: e.target.value })
                }
              />
            </div>
          </div>
        );

      case "basic_auth":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="Username"
                value={authConfig.username || ""}
                onChange={(e) =>
                  setAuthConfig({ ...authConfig, username: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password or use {{SECRET:name}}"
                value={authConfig.password || ""}
                onChange={(e) =>
                  setAuthConfig({ ...authConfig, password: e.target.value })
                }
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/endpoints">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Edit Endpoint</h1>
            <p className="text-muted-foreground mt-1">{name}</p>
          </div>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          <span className="ml-2">Delete</span>
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Status Toggle */}
        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
            <CardDescription>
              Enable or disable this endpoint
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {isActive ? "Active" : "Inactive"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isActive
                    ? "This endpoint is accepting requests"
                    : "This endpoint will return 404"}
                </p>
              </div>
              <Button
                type="button"
                variant={isActive ? "default" : "outline"}
                onClick={() => setIsActive(!isActive)}
              >
                {isActive ? "Disable" : "Enable"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="My API Endpoint"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                placeholder="my-api"
                value={slug}
                onChange={(e) =>
                  setSlug(
                    e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-")
                  )
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                placeholder="A brief description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Target API */}
        <Card>
          <CardHeader>
            <CardTitle>Target API</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="targetUrl">Target URL</Label>
              <Input
                id="targetUrl"
                type="url"
                placeholder="https://api.example.com/v1"
                value={targetUrl}
                onChange={(e) => handleTargetUrlChange(e.target.value)}
                required
                className={targetUrlError ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {targetUrlError ? (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {targetUrlError}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  The full URL of your API endpoint (HTTPS required)
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="authType">Authentication Type</Label>
              <select
                id="authType"
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={authType}
                onChange={(e) => {
                  setAuthType(e.target.value as AuthType);
                  setAuthConfig({});
                }}
              >
                <option value="none">No Authentication</option>
                <option value="bearer">Bearer Token</option>
                <option value="api_key_header">API Key (Header)</option>
                <option value="api_key_query">API Key (Query Param)</option>
                <option value="basic_auth">Basic Auth</option>
              </select>
            </div>

            {renderAuthConfig()}
          </CardContent>
        </Card>

        {/* Payment Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paywallAmount">Price per Request (USDC)</Label>
              <Input
                id="paywallAmount"
                type="number"
                step="0.000001"
                min="0.000001"
                placeholder="0.10"
                value={paywallAmount}
                onChange={(e) => setPaywallAmount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paywallPayTo">Payment Address (optional)</Label>
              <Input
                id="paywallPayTo"
                placeholder="0x... (leave empty to use default wallet)"
                value={paywallPayTo}
                onChange={(e) => setPaywallPayTo(e.target.value)}
                pattern="^0x[a-fA-F0-9]{40}$"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="paywallTestnet"
                checked={isTestnetForced || paywallTestnet}
                onChange={(e) => !isTestnetForced && setPaywallTestnet(e.target.checked)}
                disabled={isTestnetForced}
                className="rounded border-input disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <Label 
                htmlFor="paywallTestnet" 
                className={`cursor-pointer ${isTestnetForced ? "opacity-70" : ""}`}
              >
                Use testnet (Base Sepolia)
              </Label>
              {isTestnetForced && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertCircle className="h-4 w-4 text-yellow-500 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Testnet mode is forced, this is a test environment.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Paywall Branding */}
        <Card>
          <CardHeader>
            <CardTitle>Paywall Branding</CardTitle>
            <CardDescription>
              Customize how your paywall appears to users
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="appName">App Name (optional)</Label>
              <Input
                id="appName"
                placeholder="My Amazing API"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Displayed on the paywall as the service name
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="appLogo">App Logo URL (optional)</Label>
              <Input
                id="appLogo"
                type="url"
                placeholder="https://example.com/logo.png"
                value={appLogo}
                onChange={(e) => setAppLogo(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                URL to your logo image (recommended: 200x200px, PNG or SVG)
              </p>
            </div>

            {appLogo && (
              <div className="mt-4">
                <Label>Preview</Label>
                <div className="mt-2 p-4 bg-muted rounded-lg flex items-center justify-center">
                  <img
                    src={appLogo}
                    alt="Logo preview"
                    className="max-h-16 max-w-32 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Advanced Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Advanced Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rateLimitPerSec">Rate Limit (requests/second)</Label>
              <Input
                id="rateLimitPerSec"
                type="number"
                min="1"
                max="100"
                value={rateLimitPerSec}
                onChange={(e) => setRateLimitPerSec(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cname">Custom Domain (CNAME)</Label>
              <Input
                id="cname"
                placeholder="api.yourdomain.com"
                value={cname}
                onChange={(e) => setCname(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Point your domain to this proxy to use a custom URL
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customHtml">Custom Paywall HTML (optional)</Label>
              <textarea
                id="customHtml"
                className="w-full h-32 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                placeholder="<!-- Custom HTML for paywall -->"
                value={customHtml}
                onChange={(e) => setCustomHtml(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" asChild>
            <Link href="/dashboard/endpoints">Cancel</Link>
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
