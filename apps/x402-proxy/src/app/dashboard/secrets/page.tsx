"use client";

import { useState, useEffect } from "react";
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
import { toast } from "sonner";
import { Key, Plus, Trash2, Loader2, Eye, EyeOff, Copy } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

interface Secret {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export default function SecretsPage() {
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [newName, setNewName] = useState("");
  const [newValue, setNewValue] = useState("");
  const [showValue, setShowValue] = useState(false);

  const fetchSecrets = async () => {
    try {
      const response = await fetch("/api/secrets");
      if (!response.ok) throw new Error("Failed to fetch secrets");
      const data = await response.json();
      setSecrets(data);
    } catch (error) {
      toast.error("Failed to load secrets");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSecrets();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const response = await fetch("/api/secrets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, value: newValue }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create secret");
      }

      const newSecret = await response.json();
      setSecrets([...secrets, newSecret]);
      setNewName("");
      setNewValue("");
      setShowCreateForm(false);
      toast.success("Secret created successfully!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create secret"
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this secret?")) {
      return;
    }

    setDeletingId(id);

    try {
      const response = await fetch(`/api/secrets/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete secret");

      setSecrets(secrets.filter((s) => s.id !== id));
      toast.success("Secret deleted successfully!");
    } catch (error) {
      toast.error("Failed to delete secret");
    } finally {
      setDeletingId(null);
    }
  };

  const copyReference = (name: string) => {
    navigator.clipboard.writeText(`{{SECRET:${name}}}`);
    toast.success("Reference copied to clipboard!");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Secrets</h1>
          <p className="text-muted-foreground mt-1">
            Securely store API keys and tokens
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Secret
        </Button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Secret</CardTitle>
            <CardDescription>
              Secrets are encrypted with AES-256-GCM and can be referenced in
              endpoint configurations using {"{{SECRET:name}}"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="MY_API_KEY"
                  value={newName}
                  onChange={(e) =>
                    setNewName(
                      e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_")
                    )
                  }
                  required
                  pattern="^[A-Z_][A-Z0-9_]*$"
                />
                <p className="text-xs text-muted-foreground">
                  Uppercase letters, numbers, and underscores only
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="value">Value</Label>
                <div className="relative">
                  <Input
                    id="value"
                    type={showValue ? "text" : "password"}
                    placeholder="Your secret value"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowValue(!showValue)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showValue ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewName("");
                    setNewValue("");
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Create Secret
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Secrets List */}
      {secrets.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Key className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold mb-2">No secrets yet</h3>
              <p className="text-muted-foreground mb-4">
                Add secrets to securely store API keys and tokens
              </p>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Secret
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {secrets.map((secret) => (
            <Card key={secret.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Key className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-mono font-medium">{secret.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Updated {formatRelativeTime(new Date(secret.updatedAt))}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyReference(secret.name)}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy Reference
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(secret.id)}
                      disabled={deletingId === secret.id}
                    >
                      {deletingId === secret.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-destructive" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Usage Info */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">How to use secrets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            Reference secrets in your endpoint authentication configuration
            using the following syntax:
          </p>
          <code className="block p-3 bg-background rounded-lg font-mono">
            {"{{SECRET:YOUR_SECRET_NAME}}"}
          </code>
          <p className="text-muted-foreground">
            When a request is proxied, the secret reference will be replaced
            with the decrypted value. Secrets are never exposed in API responses
            or logs.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
