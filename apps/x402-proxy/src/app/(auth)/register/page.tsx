"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { signUp } from "@/lib/auth-client";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { isReservedSlug, slugify } from "@/lib/utils";

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [slug, setSlug] = useState("");
  const [slugStatus, setSlugStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "invalid"
  >("idle");

  // Debounced slug check
  const checkSlugAvailability = useCallback(async (slugToCheck: string) => {
    if (!slugToCheck || slugToCheck.length < 3) {
      setSlugStatus("idle");
      return;
    }

    if (isReservedSlug(slugToCheck)) {
      setSlugStatus("invalid");
      return;
    }

    if (!/^[a-z0-9-]+$/.test(slugToCheck)) {
      setSlugStatus("invalid");
      return;
    }

    setSlugStatus("checking");

    try {
      const response = await fetch(
        `/api/check-slug?slug=${encodeURIComponent(slugToCheck)}`
      );
      const data = await response.json();

      if (data.available) {
        setSlugStatus("available");
      } else {
        setSlugStatus("taken");
      }
    } catch (error) {
      console.error("Failed to check slug:", error);
      setSlugStatus("idle");
    }
  }, []);

  const handleSlugChange = (value: string) => {
    const sanitized = slugify(value);
    setSlug(sanitized);

    // Debounce the availability check
    const timeoutId = setTimeout(() => {
      checkSlugAvailability(sanitized);
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (slugStatus !== "available") {
      toast.error("Please choose an available username");
      return;
    }

    setIsLoading(true);

    try {
      const result = await signUp.email(
        {
          email,
          password,
          name,
        },
        {
          body: {
            slug,
          },
        }
      );

      if (result.error) {
        toast.error(result.error.message || "Failed to create account");
        return;
      }

      toast.success(
        "Account created! Please check your email to verify your account."
      );
      router.push("/login");
    } catch (error) {
      toast.error("An unexpected error occurred");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSlugStatusIcon = () => {
    switch (slugStatus) {
      case "checking":
        return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
      case "available":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "taken":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "invalid":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getSlugStatusMessage = () => {
    switch (slugStatus) {
      case "checking":
        return "Checking availability...";
      case "available":
        return "Username is available!";
      case "taken":
        return "This username is already taken";
      case "invalid":
        return "Only lowercase letters, numbers, and hyphens allowed";
      default:
        return "This will be your unique URL identifier";
    }
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Create an account</CardTitle>
        <CardDescription>
          Start monetizing your APIs with crypto payments
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Username</Label>
            <div className="relative">
              <Input
                id="slug"
                type="text"
                placeholder="my-username"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                required
                disabled={isLoading}
                className="pr-10"
                minLength={3}
                maxLength={32}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {getSlugStatusIcon()}
              </div>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {getSlugStatusMessage()}
            </p>
            <p className="text-xs text-muted-foreground">
              Your proxy URLs will be:{" "}
              <code className="bg-muted px-1 py-0.5 rounded">
                x402proxy.com/{slug || "username"}/...
              </code>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              minLength={8}
            />
            <p className="text-xs text-muted-foreground">
              Must be at least 8 characters
            </p>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || slugStatus !== "available"}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Account
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Or sign up with
            </span>
          </div>
        </div>

        {/* OAuth Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" disabled={isLoading}>
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google
          </Button>
          <Button variant="outline" disabled={isLoading}>
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
              />
            </svg>
            GitHub
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          By creating an account, you agree to our{" "}
          <Link href="/terms" className="underline hover:text-foreground">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline hover:text-foreground">
            Privacy Policy
          </Link>
          .
        </p>
      </CardContent>

      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
