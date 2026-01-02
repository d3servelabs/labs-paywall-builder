import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { endpoints } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Globe, ExternalLink, MoreHorizontal } from "lucide-react";
import { formatUSDC, truncateAddress } from "@/lib/utils";

export default async function EndpointsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return null;
  }

  // Fetch user's endpoints
  const userEndpoints = await db
    .select()
    .from(endpoints)
    .where(eq(endpoints.userId, session.user.id))
    .orderBy(endpoints.createdAt);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Endpoints</h1>
          <p className="text-muted-foreground mt-1">
            Manage your proxy endpoints
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/endpoints/new">
            <Plus className="h-4 w-4 mr-2" />
            New Endpoint
          </Link>
        </Button>
      </div>

      {/* Endpoints List */}
      {userEndpoints.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Globe className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold mb-2">No endpoints yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first endpoint to start monetizing your API
              </p>
              <Button asChild>
                <Link href="/dashboard/endpoints/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Endpoint
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {userEndpoints.map((endpoint) => (
            <Card key={endpoint.id} className="hover:border-primary/50 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      {endpoint.name}
                      {!endpoint.isActive && (
                        <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded">
                          Inactive
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription className="font-mono text-xs">
                      /{session.user.slug}/{endpoint.slug}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/dashboard/endpoints/${endpoint.id}`}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Target URL</p>
                    <p className="font-mono truncate">{endpoint.targetUrl}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Price</p>
                    <p className="font-semibold text-accent">
                      {formatUSDC(Number(endpoint.paywallAmount))} USDC
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Auth Type</p>
                    <p className="capitalize">{endpoint.authType.replace("_", " ")}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Pay To</p>
                    <p className="font-mono">
                      {endpoint.paywallPayTo
                        ? truncateAddress(endpoint.paywallPayTo)
                        : "Default wallet"}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/endpoints/${endpoint.id}`}>
                      Edit
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/endpoints/${endpoint.id}/analytics`}>
                      Analytics
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <a
                      href={`${process.env.NEXT_PUBLIC_APP_URL}/${session.user.slug}/${endpoint.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Test
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
