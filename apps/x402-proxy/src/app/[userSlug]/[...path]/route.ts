import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, endpoints, secrets, payments, requestLogs } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { resolveSecretReferences } from "@/lib/crypto";
import {
  parsePaymentSignature,
  verifyPayment,
  settlePayment,
  generatePaymentRequiredResponse,
  usdToUsdc,
  type PaymentPayload,
} from "@/lib/proxy/facilitator";
import { checkRateLimit, rateLimitExceededResponse, getRateLimitHeaders } from "@/lib/proxy/rate-limiter";
import { CHAIN_CONFIG, generateGenericPaywallTemplate, THEME_PRESETS, populateMetaTagPaywallConfig } from "@d3servelabs/x402-paywall-builder";

/**
 * Extract payer address from payment payload
 */
function extractPayerAddressFromPayload(payload: PaymentPayload): string | null {
  try {
    const innerPayload = payload.payload;
    if (innerPayload && typeof innerPayload === "object") {
      const obj = innerPayload as Record<string, unknown>;
      if ("from" in obj && typeof obj.from === "string") {
        return obj.from;
      }
      if ("authorization" in obj && typeof obj.authorization === "object") {
        const auth = obj.authorization as Record<string, unknown>;
        if ("from" in auth && typeof auth.from === "string") {
          return auth.from;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Detect if request is from a browser
 */
function isBrowserRequest(request: Request): boolean {
  const accept = request.headers.get("Accept") || "";
  const userAgent = request.headers.get("User-Agent") || "";

  // Check Accept header for HTML preference
  if (accept.includes("text/html")) return true;

  // Check for common browser user agents
  const browserPatterns = [/Mozilla/i, /Chrome/i, /Safari/i, /Firefox/i, /Edge/i];
  return browserPatterns.some((pattern) => pattern.test(userAgent));
}

/**
 * Build auth headers based on endpoint config
 */
async function buildAuthHeaders(
  endpoint: typeof endpoints.$inferSelect,
  userId: string
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  const config = endpoint.authConfig as Record<string, string> | null;

  if (!config || endpoint.authType === "none") {
    return headers;
  }

  // Helper to resolve secret references
  const resolveValue = async (value: string): Promise<string> => {
    return resolveSecretReferences(value, async (name) => {
      const [secret] = await db
        .select({ encryptedValue: secrets.encryptedValue, iv: secrets.iv })
        .from(secrets)
        .where(and(eq(secrets.userId, userId), eq(secrets.name, name)))
        .limit(1);
      return secret || null;
    });
  };

  switch (endpoint.authType) {
    case "bearer":
      if (config.token) {
        const token = await resolveValue(config.token);
        headers["Authorization"] = `Bearer ${token}`;
      }
      break;

    case "api_key_header":
      if (config.headerName && config.headerValue) {
        const value = await resolveValue(config.headerValue);
        headers[config.headerName] = value;
      }
      break;

    case "basic_auth":
      if (config.username && config.password) {
        const username = await resolveValue(config.username);
        const password = await resolveValue(config.password);
        const encoded = Buffer.from(`${username}:${password}`).toString("base64");
        headers["Authorization"] = `Basic ${encoded}`;
      }
      break;

    case "custom_headers":
      if (config.headers) {
        const customHeaders =
          typeof config.headers === "string"
            ? JSON.parse(config.headers)
            : config.headers;
        for (const [key, value] of Object.entries(customHeaders)) {
          if (typeof value === "string") {
            headers[key] = await resolveValue(value);
          }
        }
      }
      break;
  }

  return headers;
}

/**
 * Build target URL with query parameters
 */
function buildTargetUrl(
  baseUrl: string,
  pathSegments: string[],
  searchParams: URLSearchParams,
  endpoint: typeof endpoints.$inferSelect
): string {
  // Remove trailing slash from base URL
  let url = baseUrl.replace(/\/$/, "");

  // Add path segments (skip first two which are userSlug and endpointSlug)
  const additionalPath = pathSegments.slice(1).join("/");
  if (additionalPath) {
    url += "/" + additionalPath;
  }

  // Handle API key in query param
  if (endpoint.authType === "api_key_query") {
    const config = endpoint.authConfig as Record<string, string> | null;
    if (config?.queryParam && config?.queryValue) {
      searchParams.set(config.queryParam, config.queryValue);
    }
  }

  // Add query params
  const queryString = searchParams.toString();
  if (queryString) {
    url += "?" + queryString;
  }

  return url;
}

/**
 * Log the request
 */
async function logRequest(
  endpointId: string,
  userId: string,
  request: Request,
  responseStatus: number,
  options: {
    paid?: boolean;
    paymentId?: string;
    rateLimited?: boolean;
    responseTimeMs?: number;
  } = {}
) {
  try {
    const url = new URL(request.url);
    await db.insert(requestLogs).values({
      endpointId,
      userId,
      paymentId: options.paymentId,
      requestPath: url.pathname,
      requestMethod: request.method,
      responseStatus,
      responseTimeMs: options.responseTimeMs,
      clientIp: request.headers.get("x-forwarded-for")?.split(",")[0] || null,
      userAgent: request.headers.get("user-agent"),
      isBrowser: isBrowserRequest(request),
      paid: options.paid ?? false,
      rateLimited: options.rateLimited ?? false,
    });
  } catch (error) {
    console.error("Failed to log request:", error);
  }
}

// Debug logging prefix for proxy handler
const PROXY_LOG_PREFIX = "[x402-proxy]";

function proxyDebugLog(message: string, data?: unknown) {
  console.log(`${PROXY_LOG_PREFIX} ${message}`, data !== undefined ? JSON.stringify(data, null, 2) : "");
}

function proxyErrorLog(message: string, error?: unknown) {
  console.error(`${PROXY_LOG_PREFIX} ERROR: ${message}`, error);
}

/**
 * Main proxy handler
 */
async function handleRequest(
  request: Request,
  { params }: { params: Promise<{ userSlug: string; path: string[] }> }
) {
  const startTime = Date.now();
  const { userSlug, path } = await params;
  
  proxyDebugLog("=== PROXY REQUEST START ===", {
    method: request.method,
    url: request.url,
    userSlug,
    path,
  });

  // Log all headers for debugging
  const headersObj: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    // Mask sensitive headers
    if (key.toLowerCase().includes('auth') || key.toLowerCase().includes('cookie')) {
      headersObj[key] = '[MASKED]';
    } else {
      headersObj[key] = value;
    }
  });
  proxyDebugLog("Request headers", headersObj);
  
  // Ensure we have an endpoint slug
  if (!path || path.length === 0 || !path[0]) {
    proxyDebugLog("No endpoint slug provided");
    return NextResponse.json({ error: "Endpoint slug required" }, { status: 400 });
  }
  
  const endpointSlug = path[0];

  // Skip if this looks like a system route
  if (
    userSlug === "api" ||
    userSlug === "dashboard" ||
    userSlug === "login" ||
    userSlug === "register" ||
    userSlug === "_next"
  ) {
    proxyDebugLog("Skipping system route", { userSlug });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    // Find user by slug
    proxyDebugLog("Looking up user", { userSlug });
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.slug, userSlug))
      .limit(1);

    if (!user) {
      proxyDebugLog("User not found", { userSlug });
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    proxyDebugLog("User found", { userId: user.id, userSlug: user.slug });

    // Find endpoint
    proxyDebugLog("Looking up endpoint", { userId: user.id, endpointSlug });
    const [endpoint] = await db
      .select()
      .from(endpoints)
      .where(
        and(eq(endpoints.userId, user.id), eq(endpoints.slug, endpointSlug))
      )
      .limit(1);

    if (!endpoint) {
      proxyDebugLog("Endpoint not found", { endpointSlug });
      return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
    }
    proxyDebugLog("Endpoint found", {
      endpointId: endpoint.id,
      endpointSlug: endpoint.slug,
      targetUrl: endpoint.targetUrl,
      paywallAmount: endpoint.paywallAmount,
      paywallTestnet: endpoint.paywallTestnet,
      paywallPayTo: endpoint.paywallPayTo,
      isActive: endpoint.isActive,
    });

    if (!endpoint.isActive) {
      proxyDebugLog("Endpoint is not active");
      return NextResponse.json(
        { error: "Endpoint is not active" },
        { status: 404 }
      );
    }

    // Check rate limit
    const rateLimitResult = checkRateLimit(
      endpoint.id,
      endpoint.rateLimitPerSec
    );

    if (!rateLimitResult.allowed) {
      proxyDebugLog("Rate limit exceeded", rateLimitResult);
      await logRequest(endpoint.id, user.id, request, 429, {
        rateLimited: true,
        responseTimeMs: Date.now() - startTime,
      });
      return rateLimitExceededResponse(rateLimitResult);
    }

    // Check for payment signature
    proxyDebugLog("Checking for payment signature...");
    const paymentPayload = parsePaymentSignature(request);
    proxyDebugLog("Payment signature check result", {
      hasPaymentPayload: !!paymentPayload,
    });
    const url = new URL(request.url);
    const payTo = endpoint.paywallPayTo || user.defaultPayTo;

    if (!payTo) {
      return NextResponse.json(
        { error: "No payment address configured" },
        { status: 500 }
      );
    }

    if (!paymentPayload) {
      // No payment - return paywall
      await logRequest(endpoint.id, user.id, request, 402, {
        paid: false,
        responseTimeMs: Date.now() - startTime,
      });

      // The paywallAmount is stored in USD (e.g., 0.01 for 1 cent)
      const priceUsd = Number(endpoint.paywallAmount);
      const usdcAsset = usdToUsdc(priceUsd, endpoint.paywallTestnet);

      // Generate payment required response
      const paymentRequiredResponse = generatePaymentRequiredResponse({
        url: url.toString(),
        description:
          (endpoint.paywallConfig as Record<string, unknown>)
            ?.resourceDescription as string || endpoint.description || endpoint.name,
        priceUsd,
        payTo,
        testnet: endpoint.paywallTestnet,
      });

      // Check if browser request
      if (isBrowserRequest(request)) {
        // Return HTML paywall
        const paywallConfig = endpoint.paywallConfig as Record<string, unknown> || {};
        
        // Check if custom HTML template is provided
        if (endpoint.customHtml) {
          // Build the x402 payment config to inject into custom HTML
          const x402Config = {
            paymentRequired: paymentRequiredResponse,
            amount: priceUsd,
            amountInAtomicUnits: usdcAsset.amount,
            payTo,
            network: endpoint.paywallTestnet ? "eip155:84532" : "eip155:8453",
            chainId: endpoint.paywallTestnet ? 84532 : 8453,
            chainIdHex: endpoint.paywallTestnet ? "0x14a34" : "0x2105",
            chainName: endpoint.paywallTestnet ? "Base Sepolia" : "Base",
            usdcAddress: endpoint.paywallTestnet
              ? "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
              : "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            rpcUrl: endpoint.paywallTestnet
              ? "https://sepolia.base.org"
              : "https://mainnet.base.org",
            blockExplorer: endpoint.paywallTestnet
              ? "https://sepolia.basescan.org"
              : "https://basescan.org",
            currentUrl: url.toString(),
            testnet: endpoint.paywallTestnet,
            resourceDescription:
              (paywallConfig.resourceDescription as string) ||
              endpoint.description ||
              endpoint.name,
            branding: {
              appName: (paywallConfig.branding as { appName?: string; appLogo?: string })?.appName || endpoint.name,
              appLogo: (paywallConfig.branding as { appName?: string; appLogo?: string })?.appLogo || "",
            },
            walletConnectProjectId:
            (paywallConfig.walletConnectProjectId as string) ||
            process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
            chainConfigs: CHAIN_CONFIG,
          };
          
          // Populate the custom HTML with the payment config
          // Uses {{payment-config}} placeholder by default
          const html = populateMetaTagPaywallConfig(endpoint.customHtml, x402Config);
          
          return new Response(html, {
            status: 402,
            headers: {
              "Content-Type": "text/html",
              ...getRateLimitHeaders(rateLimitResult),
            },
          });
        }
        
        // Use default generated paywall template
        const themePreset = (paywallConfig.theme as string) || "Coinbase";
        const theme = THEME_PRESETS[themePreset as keyof typeof THEME_PRESETS];

        const html = generateGenericPaywallTemplate({
          amount: priceUsd,
          amountInAtomicUnits: usdcAsset.amount,
          payTo,
          chainConfigs: CHAIN_CONFIG,
          network: endpoint.paywallTestnet ? "eip155:84532" : "eip155:8453",
          chainId: endpoint.paywallTestnet ? 84532 : 8453,
          chainIdHex: endpoint.paywallTestnet ? "0x14a34" : "0x2105",
          chainName: endpoint.paywallTestnet ? "Base Sepolia" : "Base",
          usdcAddress: endpoint.paywallTestnet
            ? "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
            : "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
          rpcUrl: endpoint.paywallTestnet
            ? "https://sepolia.base.org"
            : "https://mainnet.base.org",
          blockExplorer: endpoint.paywallTestnet
            ? "https://sepolia.basescan.org"
            : "https://basescan.org",
          currentUrl: url.toString(),
          testnet: endpoint.paywallTestnet,
          paymentRequired: paymentRequiredResponse,
          resourceDescription:
            (paywallConfig.resourceDescription as string) ||
            endpoint.description ||
            endpoint.name,
          theme,
          branding: {
            appName: (paywallConfig.branding as { appName?: string; appLogo?: string })?.appName || endpoint.name,
            appLogo: (paywallConfig.branding as { appName?: string; appLogo?: string })?.appLogo || "",
          },
          walletConnectProjectId:
            (paywallConfig.walletConnectProjectId as string) ||
            process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
        });

        return new Response(html, {
          status: 402,
          headers: {
            "Content-Type": "text/html",
            ...getRateLimitHeaders(rateLimitResult),
          },
        });
      } 
        // Return JSON for programmatic clients
        return NextResponse.json(paymentRequiredResponse, {
          status: 402,
          headers: getRateLimitHeaders(rateLimitResult),
        });
      
    }

    // Verify payment
    proxyDebugLog("=== PAYMENT VERIFICATION ===");
    // The paywallAmount is stored in USD
    const priceUsdForVerify = Number(endpoint.paywallAmount);
    proxyDebugLog("Verification parameters", {
      priceUsd: priceUsdForVerify,
      expectedPayTo: payTo,
      testnet: endpoint.paywallTestnet,
      endpointPaywallAmount: endpoint.paywallAmount,
    });
    
    proxyDebugLog("Payment payload details", {
      x402Version: paymentPayload.x402Version,
      accepted: paymentPayload.accepted,
      resource: paymentPayload.resource,
      payloadKeys: Object.keys(paymentPayload.payload || {}),
    });

    const verifyResult = await verifyPayment(paymentPayload, {
      priceUsd: priceUsdForVerify,
      payTo,
      testnet: endpoint.paywallTestnet,
    });

    proxyDebugLog("Verification result", verifyResult);

    if (!verifyResult.valid) {
      proxyErrorLog("Payment verification FAILED", {
        invalidReason: verifyResult.invalidReason,
      });
      await logRequest(endpoint.id, user.id, request, 402, {
        paid: false,
        responseTimeMs: Date.now() - startTime,
      });

      return NextResponse.json(
        {
          error: "Payment verification failed",
          reason: verifyResult.invalidReason,
        },
        { status: 402, headers: getRateLimitHeaders(rateLimitResult) }
      );
    }

    // Extract payer address from verified result or payload
    const payerAddress = verifyResult.payerAddress || 
      extractPayerAddressFromPayload(paymentPayload) ||
      "unknown";

    // Create pending payment record
    const [payment] = await db
      .insert(payments)
      .values({
        endpointId: endpoint.id,
        userId: user.id,
        payerAddress,
        amount: endpoint.paywallAmount,
        chainId: verifyResult.chainId || (endpoint.paywallTestnet ? 84532 : 8453),
        network: endpoint.paywallTestnet ? "base-sepolia" : "base",
        status: "verified",
        paymentPayload: paymentPayload,
        requestPath: url.pathname,
        requestMethod: request.method,
      })
      .returning();

    if (!payment) {
      return NextResponse.json(
        { error: "Failed to create payment record" },
        { status: 500 }
      );
    }

    // Build auth headers
    const authHeaders = await buildAuthHeaders(endpoint, user.id);

    // Build target URL
    const targetUrl = buildTargetUrl(
      endpoint.targetUrl,
      path,
      url.searchParams,
      endpoint
    );

    // Forward headers (excluding hop-by-hop and payment headers)
    const forwardHeaders: Record<string, string> = {};
    const skipHeaders = [
      // Hop-by-hop headers that shouldn't be forwarded
      "host",
      "connection",
      "keep-alive",
      // "transfer-encoding",
      "te",
      "trailer",
      "upgrade",
      // Payment headers (we handle these ourselves)
      "x-payment",
      "x-payment-signature",
      "payment-signature",
      // Content-length will be recalculated
      "content-length",
    ];

    request.headers.forEach((value, key) => {
      if (!skipHeaders.includes(key.toLowerCase())) {
        forwardHeaders[key] = value;
      }
    });

    proxyDebugLog("Forwarding request to target", {
      targetUrl,
      method: request.method,
      headerCount: Object.keys(forwardHeaders).length,
      hasBody: !["GET", "HEAD"].includes(request.method),
    });

    // Proxy the request
    let proxyResponse: Response;
    let proxyResponseBody: ArrayBuffer;
    try {
      proxyResponse = await fetch(targetUrl, {
        method: request.method,
        headers: {
          ...forwardHeaders,
          ...authHeaders,
        },
        body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
        // @ts-expect-error - duplex is a valid option in Node.js fetch
        duplex: "half",
      });
      proxyResponseBody = await proxyResponse.arrayBuffer();
      
      proxyDebugLog("Target response received", {
        status: proxyResponse.status,
        statusText: proxyResponse.statusText,
        contentType: proxyResponse.headers.get("content-type"),
      });
    } catch (error) {
      proxyErrorLog("Proxy fetch error", error);

      // Update payment status to failed
      await db
        .update(payments)
        .set({
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Proxy failed",
        })
        .where(eq(payments.id, payment.id));

      await logRequest(endpoint.id, user.id, request, 502, {
        paid: true,
        paymentId: payment.id,
        responseTimeMs: Date.now() - startTime,
      });

      // Return error in appropriate format based on Accept header
      const acceptHeader = request.headers.get("accept") || "";
      if (acceptHeader.includes("text/html")) {
        return new Response(
          `<html><body><h1>502 Bad Gateway</h1><p>Failed to proxy request to target</p></body></html>`,
          { 
            status: 502, 
            headers: { 
              "Content-Type": "text/html",
              ...getRateLimitHeaders(rateLimitResult),
            } 
          }
        );
      }
      
      return NextResponse.json(
        { error: "Failed to proxy request to target" },
        { status: 502, headers: getRateLimitHeaders(rateLimitResult) }
      );
    }

    // Settle payment
    const settleResult = await settlePayment(paymentPayload, {
      priceUsd: Number(endpoint.paywallAmount),
      payTo,
      testnet: endpoint.paywallTestnet,
    });

    // Update payment record
    await db
      .update(payments)
      .set({
        status: settleResult.success ? "settled" : "failed",
        txHash: settleResult.txHash,
        settlementResponse: settleResult,
        settledAt: settleResult.success ? new Date() : null,
        errorMessage: settleResult.error,
      })
      .where(eq(payments.id, payment.id));

    // Log successful request
    await logRequest(endpoint.id, user.id, request, proxyResponse.status, {
      paid: true,
      paymentId: payment.id,
      responseTimeMs: Date.now() - startTime,
    });

    // Forward response - preserve all headers from target
    const responseHeaders = new Headers();
    
    // Copy headers from target response, excluding hop-by-hop headers
    const passThroughHeaders = [
      "content-type",
    ];
    
    proxyResponse.headers.forEach((value, key) => {
      if (passThroughHeaders.includes(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });
    
    // Add rate limit headers
    Object.entries(getRateLimitHeaders(rateLimitResult)).forEach(([key, value]) => {
      responseHeaders.set(key, value);
    });

    // Add payment response header if settled
    if (settleResult.success && settleResult.txHash) {
      responseHeaders.set(
        "X-Payment-Response",
        btoa(JSON.stringify(settleResult))
      );
      responseHeaders.set(
        "Payment-Response",
        btoa(JSON.stringify(settleResult))
      );
    }

    return new Response(proxyResponseBody, {
      status: proxyResponse.status,
      statusText: proxyResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Proxy handler error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Export handlers for all HTTP methods
export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
export const OPTIONS = handleRequest;
