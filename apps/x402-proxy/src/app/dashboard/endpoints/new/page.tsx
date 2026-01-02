"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";

type AuthType = "none" | "bearer" | "api_key_header" | "api_key_query" | "basic_auth" | "custom_headers";

// Check if testnet is forced via environment variable
const isTestnetForced = process.env.NEXT_PUBLIC_FORCE_TESTNET === "true";

export default function NewEndpointPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [authType, setAuthType] = useState<AuthType>("none");
  const [authConfig, setAuthConfig] = useState<Record<string, string>>({});
  const [paywallAmount, setPaywallAmount] = useState("");
  const [paywallPayTo, setPaywallPayTo] = useState("");
  const [paywallTestnet, setPaywallTestnet] = useState(isTestnetForced);
  
  // Paywall branding
  const [appName, setAppName] = useState("");
  const [appLogo, setAppLogo] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/endpoints", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          slug,
          description,
          targetUrl,
          authType,
          authConfig,
          paywallAmount: parseFloat(paywallAmount),
          paywallPayTo: paywallPayTo || null,
          paywallTestnet,
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
        throw new Error(error.message || "Failed to create endpoint");
      }

      toast.success("Endpoint created successfully!");
      router.push("/dashboard/endpoints");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create endpoint");
    } finally {
      setIsLoading(false);
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/endpoints">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Create Endpoint</h1>
          <p className="text-muted-foreground mt-1">
            Set up a new proxy endpoint for your API
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Give your endpoint a name and URL slug
            </CardDescription>
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
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))
                }
                required
              />
              <p className="text-xs text-muted-foreground">
                Your endpoint URL will be: /your-username/{slug || "my-api"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                placeholder="A brief description of what this endpoint does"
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
            <CardDescription>
              The API endpoint that will receive proxied requests
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="targetUrl">Target URL</Label>
              <Input
                id="targetUrl"
                type="url"
                placeholder="https://api.example.com/v1"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                The full URL of your API endpoint
              </p>
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
            <CardDescription>
              Configure pricing and payment recipient
            </CardDescription>
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
              <Label htmlFor="paywallPayTo">
                Payment Address (optional)
              </Label>
              <Input
                id="paywallPayTo"
                placeholder="0x... (leave empty to use default wallet)"
                value={paywallPayTo}
                onChange={(e) => setPaywallPayTo(e.target.value)}
                pattern="^0x[a-fA-F0-9]{40}$"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to use your default wallet address
              </p>
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
                      <p>Testnet mode is forced via NEXT_PUBLIC_FORCE_TESTNET environment variable</p>
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

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" asChild>
            <Link href="/dashboard/endpoints">Cancel</Link>
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Endpoint
          </Button>
        </div>
      </form>
    </div>
  );
}
