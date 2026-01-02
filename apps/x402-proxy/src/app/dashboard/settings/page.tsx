"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/lib/auth-client";
import { Settings, Wallet, User, Save, Loader2 } from "lucide-react";
import { isValidEthAddress } from "@/lib/utils";

export default function SettingsPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form state
  const [name, setName] = useState("");
  const [defaultPayTo, setDefaultPayTo] = useState("");

  // Initialize form with user data
  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || "");
      setDefaultPayTo((session.user as { defaultPayTo?: string }).defaultPayTo || "");
    }
  }, [session]);

  const handleSave = async () => {
    setError("");
    setSuccess("");

    // Validate wallet address if provided
    if (defaultPayTo && !isValidEthAddress(defaultPayTo)) {
      setError("Please enter a valid Ethereum address");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          defaultPayTo: defaultPayTo.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save settings");
      }

      setSuccess("Settings saved successfully!");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account settings
        </p>
      </div>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5" />
            <CardTitle>Profile</CardTitle>
          </div>
          <CardDescription>
            Your personal information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={session.user.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Username / Slug</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">
                {process.env.NEXT_PUBLIC_APP_URL || "https://x402proxy.com"}/
              </span>
              <Input
                id="slug"
                value={(session.user as { slug?: string }).slug || ""}
                disabled
                className="bg-muted max-w-[200px]"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Username cannot be changed after registration
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Payment Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            <CardTitle>Payment Settings</CardTitle>
          </div>
          <CardDescription>
            Configure your default payment wallet
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="defaultPayTo">Default Wallet Address</Label>
            <Input
              id="defaultPayTo"
              value={defaultPayTo}
              onChange={(e) => setDefaultPayTo(e.target.value)}
              placeholder="0x..."
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              This wallet will receive payments for endpoints that don&apos;t have a specific wallet configured.
              Must be a valid Ethereum/Base address.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* API Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <CardTitle>API Information</CardTitle>
          </div>
          <CardDescription>
            Your proxy endpoint base URL
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-3 bg-muted rounded-lg font-mono text-sm break-all">
            {process.env.NEXT_PUBLIC_APP_URL || "https://x402proxy.com"}/
            {(session.user as { slug?: string }).slug || "your-username"}/
            <span className="text-muted-foreground">{"<endpoint-slug>"}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Share this base URL with your users. Each endpoint will have its own slug appended.
          </p>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex items-center justify-between">
        <div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          {success && <p className="text-sm text-green-500">{success}</p>}
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
