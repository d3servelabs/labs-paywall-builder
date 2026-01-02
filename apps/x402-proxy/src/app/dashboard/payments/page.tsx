import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { payments, endpoints } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  TrendingUp,
} from "lucide-react";
import { formatUSDC, truncateAddress, formatRelativeTime } from "@/lib/utils";

function getStatusIcon(status: string) {
  switch (status) {
    case "settled":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-red-500" />;
    case "verified":
    case "pending":
      return <Clock className="h-4 w-4 text-yellow-500" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "settled":
      return "Settled";
    case "failed":
      return "Failed";
    case "verified":
      return "Verified";
    case "pending":
      return "Pending";
    default:
      return status;
  }
}

export default async function PaymentsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return null;
  }

  // Fetch payments with endpoint details
  const userPayments = await db
    .select({
      id: payments.id,
      payerAddress: payments.payerAddress,
      amount: payments.amount,
      status: payments.status,
      txHash: payments.txHash,
      network: payments.network,
      chainId: payments.chainId,
      requestPath: payments.requestPath,
      requestMethod: payments.requestMethod,
      createdAt: payments.createdAt,
      settledAt: payments.settledAt,
      errorMessage: payments.errorMessage,
      endpointId: payments.endpointId,
      endpointName: endpoints.name,
      endpointSlug: endpoints.slug,
    })
    .from(payments)
    .leftJoin(endpoints, eq(payments.endpointId, endpoints.id))
    .where(eq(payments.userId, session.user.id))
    .orderBy(desc(payments.createdAt))
    .limit(100);

  // Calculate stats
  const stats = await db
    .select({
      totalPayments: sql<number>`count(*)`,
      settledPayments: sql<number>`count(*) filter (where ${payments.status} = 'settled')`,
      totalRevenue: sql<number>`coalesce(sum(${payments.amount}) filter (where ${payments.status} = 'settled'), 0)`,
    })
    .from(payments)
    .where(eq(payments.userId, session.user.id));

  const { totalPayments, settledPayments, totalRevenue } = stats[0] || {
    totalPayments: 0,
    settledPayments: 0,
    totalRevenue: 0,
  };

  const successRate = totalPayments > 0 
    ? Math.round((settledPayments / totalPayments) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Payments</h1>
        <p className="text-muted-foreground mt-1">
          View your payment history and revenue
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              {formatUSDC(Number(totalRevenue))}
            </div>
            <p className="text-xs text-muted-foreground">USDC earned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{settledPayments}</div>
            <p className="text-xs text-muted-foreground">
              of {totalPayments} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successRate}%</div>
            <p className="text-xs text-muted-foreground">Payment success</p>
          </CardContent>
        </Card>
      </div>

      {/* Payments List */}
      {userPayments.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold mb-2">No payments yet</h3>
              <p className="text-muted-foreground">
                Payments will appear here when users pay to access your endpoints
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>
              Recent payments for your endpoints
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {userPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  {/* Status Icon */}
                  <div className="mt-1">{getStatusIcon(payment.status)}</div>

                  {/* Payment Details */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {formatUSDC(Number(payment.amount))} USDC
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-muted capitalize">
                        {getStatusLabel(payment.status)}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {payment.endpointName ? (
                        <span className="font-mono">
                          /{session.user.slug}/{payment.endpointSlug}
                        </span>
                      ) : (
                        <span className="italic">Deleted endpoint</span>
                      )}
                      {payment.requestMethod && payment.requestPath && (
                        <span className="ml-2">
                          {payment.requestMethod} {payment.requestPath}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>From: {truncateAddress(payment.payerAddress)}</span>
                      <span className="capitalize">{payment.network}</span>
                      <span>{formatRelativeTime(new Date(payment.createdAt))}</span>
                    </div>
                    {payment.errorMessage && (
                      <p className="text-xs text-red-500">{payment.errorMessage}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {payment.txHash && (
                      <Button variant="ghost" size="sm" asChild>
                        <a
                          href={`${
                            payment.network === "base-sepolia"
                              ? "https://sepolia.basescan.org"
                              : "https://basescan.org"
                          }/tx/${payment.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
