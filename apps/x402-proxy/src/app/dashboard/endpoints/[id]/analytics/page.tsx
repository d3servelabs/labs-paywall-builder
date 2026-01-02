import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { endpoints, payments, requestLogs } from "@/lib/db/schema";
import { eq, and, count, sum, desc, gte, sql } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  DollarSign,
  Activity,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  BarChart3,
} from "lucide-react";

interface AnalyticsPageProps {
  params: Promise<{ id: string }>;
}

export default async function EndpointAnalyticsPage({ params }: AnalyticsPageProps) {
  const { id } = await params;
  
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    notFound();
  }

  // Fetch the endpoint
  const [endpoint] = await db
    .select()
    .from(endpoints)
    .where(
      and(
        eq(endpoints.id, id),
        eq(endpoints.userId, session.user.id)
      )
    )
    .limit(1);

  if (!endpoint) {
    notFound();
  }

  // Calculate date ranges
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const last7Days = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Fetch analytics data in parallel
  const [
    totalPayments,
    totalRevenue,
    totalRequests,
    requestsToday,
    requests7Days,
    requests30Days,
    recentPayments,
    recentRequests,
    paymentsByStatus,
  ] = await Promise.all([
    // Total settled payments count
    db
      .select({ count: count() })
      .from(payments)
      .where(
        and(
          eq(payments.endpointId, id),
          eq(payments.status, "settled")
        )
      )
      .then((r) => r[0]?.count ?? 0),

    // Total revenue
    db
      .select({ total: sum(payments.amount) })
      .from(payments)
      .where(
        and(
          eq(payments.endpointId, id),
          eq(payments.status, "settled")
        )
      )
      .then((r) => r[0]?.total ?? "0"),

    // Total requests
    db
      .select({ count: count() })
      .from(requestLogs)
      .where(eq(requestLogs.endpointId, id))
      .then((r) => r[0]?.count ?? 0),

    // Requests today
    db
      .select({ count: count() })
      .from(requestLogs)
      .where(
        and(
          eq(requestLogs.endpointId, id),
          gte(requestLogs.createdAt, today)
        )
      )
      .then((r) => r[0]?.count ?? 0),

    // Requests last 7 days
    db
      .select({ count: count() })
      .from(requestLogs)
      .where(
        and(
          eq(requestLogs.endpointId, id),
          gte(requestLogs.createdAt, last7Days)
        )
      )
      .then((r) => r[0]?.count ?? 0),

    // Requests last 30 days
    db
      .select({ count: count() })
      .from(requestLogs)
      .where(
        and(
          eq(requestLogs.endpointId, id),
          gte(requestLogs.createdAt, last30Days)
        )
      )
      .then((r) => r[0]?.count ?? 0),

    // Recent 10 payments
    db
      .select({
        id: payments.id,
        amount: payments.amount,
        status: payments.status,
        payerAddress: payments.payerAddress,
        createdAt: payments.createdAt,
        txHash: payments.txHash,
      })
      .from(payments)
      .where(eq(payments.endpointId, id))
      .orderBy(desc(payments.createdAt))
      .limit(10),

    // Recent 20 requests
    db
      .select({
        id: requestLogs.id,
        requestMethod: requestLogs.requestMethod,
        requestPath: requestLogs.requestPath,
        responseStatus: requestLogs.responseStatus,
        responseTimeMs: requestLogs.responseTimeMs,
        paid: requestLogs.paid,
        createdAt: requestLogs.createdAt,
      })
      .from(requestLogs)
      .where(eq(requestLogs.endpointId, id))
      .orderBy(desc(requestLogs.createdAt))
      .limit(20),

    // Payments by status
    db
      .select({
        status: payments.status,
        count: count(),
      })
      .from(payments)
      .where(eq(payments.endpointId, id))
      .groupBy(payments.status),
  ]);

  // Calculate paid vs unpaid requests
  const paidRequests = recentRequests.filter((r) => r.paid).length;
  const conversionRate = totalRequests > 0 
    ? ((totalPayments / totalRequests) * 100).toFixed(1)
    : "0";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/endpoints">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground mt-1">{endpoint.name}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${parseFloat(totalRevenue).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">USDC earned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPayments}</div>
            <p className="text-xs text-muted-foreground">Settled payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRequests}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversionRate}%</div>
            <p className="text-xs text-muted-foreground">Requests to payments</p>
          </CardContent>
        </Card>
      </div>

      {/* Request Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{requestsToday}</div>
            <p className="text-xs text-muted-foreground">requests</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Last 7 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{requests7Days}</div>
            <p className="text-xs text-muted-foreground">requests</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Last 30 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{requests30Days}</div>
            <p className="text-xs text-muted-foreground">requests</p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Status Breakdown</CardTitle>
          <CardDescription>Distribution of payment statuses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {["settled", "verified", "pending", "failed"].map((status) => {
              const statusData = paymentsByStatus.find((p) => p.status === status);
              const statusCount = statusData?.count ?? 0;
              const colors: Record<string, string> = {
                settled: "text-green-600 bg-green-100 dark:bg-green-900/30",
                verified: "text-blue-600 bg-blue-100 dark:bg-blue-900/30",
                pending: "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30",
                failed: "text-red-600 bg-red-100 dark:bg-red-900/30",
              };
              return (
                <div
                  key={status}
                  className={`p-4 rounded-lg ${colors[status]}`}
                >
                  <p className="text-sm font-medium capitalize">{status}</p>
                  <p className="text-2xl font-bold">{statusCount}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Payments */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
            <CardDescription>Last 10 payment transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {recentPayments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No payments yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3">
                      {payment.status === "settled" ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : payment.status === "failed" ? (
                        <XCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <Clock className="h-4 w-4 text-yellow-500" />
                      )}
                      <div>
                        <p className="font-medium text-sm">
                          ${parseFloat(payment.amount).toFixed(4)}
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
                            : payment.status === "failed"
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
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
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Requests */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Requests</CardTitle>
            <CardDescription>Last 20 API requests</CardDescription>
          </CardHeader>
          <CardContent>
            {recentRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No requests yet</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {recentRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between text-sm border-b pb-2 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-xs font-mono ${
                          req.responseStatus < 300
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : req.responseStatus < 400
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            : req.responseStatus === 402
                            ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                      >
                        {req.responseStatus}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {req.requestMethod}
                      </span>
                      {req.paid && (
                        <span className="text-xs text-green-600">$</span>
                      )}
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      {req.responseTimeMs && (
                        <span className="mr-2">{req.responseTimeMs}ms</span>
                      )}
                      {new Date(req.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <Button variant="outline" asChild>
          <Link href={`/dashboard/endpoints/${id}`}>
            Edit Endpoint
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard/payments">
            View All Payments
          </Link>
        </Button>
      </div>
    </div>
  );
}
