import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { endpoints, payments, requestLogs } from "@/lib/db/schema";
import { eq, count, sum, and, gte, desc } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Globe,
  DollarSign,
  Activity,
  TrendingUp,
  Plus,
  ArrowRight,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const userId = session?.user?.id;

  // Fetch real stats from database
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Run all queries in parallel for better performance
  const [
    endpointsCount,
    paymentsData,
    requestsTodayCount,
    recentPayments,
  ] = await Promise.all([
    // Total endpoints for this user
    userId
      ? db
          .select({ count: count() })
          .from(endpoints)
          .where(eq(endpoints.userId, userId))
          .then((r) => r[0]?.count ?? 0)
      : Promise.resolve(0),

    // Total settled payments count and sum for this user
    userId
      ? db
          .select({
            count: count(),
            total: sum(payments.amount),
          })
          .from(payments)
          .where(
            and(
              eq(payments.userId, userId),
              eq(payments.status, "settled")
            )
          )
          .then((r) => ({
            count: r[0]?.count ?? 0,
            total: r[0]?.total ?? "0",
          }))
      : Promise.resolve({ count: 0, total: "0" }),

    // Requests today for this user
    userId
      ? db
          .select({ count: count() })
          .from(requestLogs)
          .where(
            and(
              eq(requestLogs.userId, userId),
              gte(requestLogs.createdAt, today)
            )
          )
          .then((r) => r[0]?.count ?? 0)
      : Promise.resolve(0),

    // Recent 10 payments for activity feed
    userId
      ? db
          .select({
            id: payments.id,
            amount: payments.amount,
            status: payments.status,
            payerAddress: payments.payerAddress,
            createdAt: payments.createdAt,
            endpointId: payments.endpointId,
          })
          .from(payments)
          .where(eq(payments.userId, userId))
          .orderBy(desc(payments.createdAt))
          .limit(10)
      : Promise.resolve([]),
  ]);

  const stats = {
    totalEndpoints: endpointsCount,
    totalPayments: paymentsData.count,
    totalRevenue: `$${parseFloat(paymentsData.total).toFixed(2)}`,
    requestsToday: requestsTodayCount,
  };

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div>
        <h1 className="text-3xl font-bold">
          Welcome back, {session?.user?.name?.split(" ")[0] || "there"}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s an overview of your API monetization
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Endpoints
            </CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEndpoints}</div>
            <p className="text-xs text-muted-foreground">Active proxy endpoints</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPayments}</div>
            <p className="text-xs text-muted-foreground">Successful payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              {stats.totalRevenue}
            </div>
            <p className="text-xs text-muted-foreground">USDC earned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Requests Today</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.requestsToday}</div>
            <p className="text-xs text-muted-foreground">API requests</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Get Started</CardTitle>
            <CardDescription>
              Create your first endpoint to start monetizing your API
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                  1
                </div>
                <span>Create an endpoint with your API URL</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                  2
                </div>
                <span>Configure authentication and pricing</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                  3
                </div>
                <span>Share your proxy URL and get paid</span>
              </div>
            </div>
            <Button asChild>
              <Link href="/dashboard/endpoints/new">
                <Plus className="h-4 w-4 mr-2" />
                Create Endpoint
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Proxy URL</CardTitle>
            <CardDescription>
              Share this base URL with your users to access your endpoints
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-muted rounded-lg font-mono text-sm break-all">
              {process.env.NEXT_PUBLIC_APP_URL || "https://x402proxy.com"}/
              {session?.user?.slug || "your-username"}/
              <span className="text-muted-foreground">{"<endpoint-slug>"}</span>
            </div>
            <Button variant="outline" asChild>
              <Link href="/dashboard/endpoints">
                View Endpoints
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Your latest payments and requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentPayments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No activity yet</p>
              <p className="text-sm">
                Create an endpoint to start receiving payments
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    {payment.status === "settled" ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : payment.status === "pending" || payment.status === "verified" ? (
                      <Clock className="h-5 w-5 text-yellow-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <div>
                      <p className="font-medium text-sm">
                        ${parseFloat(payment.amount).toFixed(2)} USDC
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {payment.payerAddress.slice(0, 6)}...{payment.payerAddress.slice(-4)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        payment.status === "settled"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : payment.status === "pending" || payment.status === "verified"
                          ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {payment.status}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
              {recentPayments.length > 0 && (
                <Button variant="ghost" className="w-full" asChild>
                  <Link href="/dashboard/payments">
                    View all payments
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
