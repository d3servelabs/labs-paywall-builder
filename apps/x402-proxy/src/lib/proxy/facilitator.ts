/**
 * x402 Facilitator Integration
 *
 * Uses the official @x402/core and @x402/evm SDKs for payment verification and settlement.
 * Handles payment verification and settlement with the CDP facilitator.
 */

import {
  x402ResourceServer,
  HTTPFacilitatorClient,
} from "@x402/core/server";
import {
  decodePaymentSignatureHeader,
} from "@x402/core/http";
import type {
  PaymentPayload,
  PaymentRequirements,
  SettleResponse,
  VerifyResponse,
  AssetAmount,
} from "@x402/core/types";
import { ExactEvmScheme } from "@x402/evm/exact/server";

// Configuration from environment
const FACILITATOR_URL =
  process.env.FACILITATOR_URL || "https://x402.org/facilitator";

// Networks (typed as template literals for SDK compatibility)
const BASE_MAINNET = "eip155:8453" as const;
const BASE_SEPOLIA = "eip155:84532" as const;

// USDC contract addresses
const USDC_BASE_MAINNET = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

// Chain IDs
const BASE_MAINNET_CHAIN_ID = 8453;
const BASE_SEPOLIA_CHAIN_ID = 84532;

// Debug logging prefix
const LOG_PREFIX = "[x402-facilitator]";

/**
 * Debug log helper
 */
function debugLog(message: string, data?: unknown) {
  console.log(`${LOG_PREFIX} ${message}`, data !== undefined ? JSON.stringify(data, null, 2) : "");
}

/**
 * Error log helper
 */
function errorLog(message: string, error?: unknown) {
  console.error(`${LOG_PREFIX} ERROR: ${message}`, error);
}

/**
 * Singleton x402 resource server with lazy initialization
 */
let resourceServer: x402ResourceServer | null = null;
let serverInitialized = false;

async function getResourceServer(): Promise<x402ResourceServer> {
  if (!resourceServer) {
    debugLog("Initializing x402 resource server", {
      facilitatorUrl: FACILITATOR_URL,
      networks: [BASE_SEPOLIA],
    });

    const facilitatorClient = new HTTPFacilitatorClient({
      url: FACILITATOR_URL,
    });

    resourceServer = new x402ResourceServer(facilitatorClient).register(
      BASE_SEPOLIA,
      new ExactEvmScheme()
    );
  }

  if (!serverInitialized) {
    await resourceServer.initialize();
    serverInitialized = true;
    debugLog("x402 resource server initialized successfully");
    debugLog("hasRegisteredScheme", resourceServer.hasRegisteredScheme(BASE_SEPOLIA, "exact"));
    debugLog("getSupportedKind", resourceServer.getSupportedKind(2, BASE_SEPOLIA, "exact"));
  }

  return resourceServer;
}

/**
 * Payment payload from client (re-export for convenience)
 */
export type { PaymentPayload, PaymentRequirements, SettleResponse, VerifyResponse };

/**
 * Convert USD amount to USDC AssetAmount format
 * USDC has 6 decimals, so 1 USD = 1,000,000 atomic units
 * 
 * @param usdAmount - Amount in USD (e.g., 0.01 for 1 cent)
 * @param testnet - Whether to use testnet USDC contract
 * @returns AssetAmount object for x402 SDK
 */
export function usdToUsdc(usdAmount: number, testnet = true): AssetAmount {
  const asset = testnet ? USDC_BASE_SEPOLIA : USDC_BASE_MAINNET;
  // USDC has 6 decimals: 1 USD = 1,000,000 atomic units
  const amount = Math.floor(usdAmount * 1_000_000).toString();
  
  debugLog("Converting USD to USDC", {
    usdAmount,
    atomicAmount: amount,
    asset,
    testnet,
  });

  return {
    asset,
    amount,
    extra: {
      name: "USDC",
      version: "2",
    },
  };
}

/**
 * Convert cents to USDC AssetAmount format
 * 
 * @param cents - Amount in cents (e.g., 100 for $1.00)
 * @param testnet - Whether to use testnet USDC contract
 * @returns AssetAmount object for x402 SDK
 */
export function centsToUsdc(cents: number, testnet = true): AssetAmount {
  const asset = testnet ? USDC_BASE_SEPOLIA : USDC_BASE_MAINNET;
  // USDC has 6 decimals: 1 cent = 10,000 atomic units
  const amount = Math.floor(cents * 10_000).toString();
  
  debugLog("Converting cents to USDC", {
    cents,
    atomicAmount: amount,
    asset,
    testnet,
  });

  return {
    asset,
    amount,
    extra: {
      name: "USDC",
      version: "2",
    },
  };
}

/**
 * Build payment option for the exact scheme using AssetAmount price
 */
export function buildExactPaymentOption(config: {
  price: AssetAmount;
  payTo: string;
  testnet?: boolean;
  maxTimeoutSeconds?: number;
}) {
  const network = config.testnet ? BASE_SEPOLIA : BASE_MAINNET;

  const option = {
    scheme: "exact" as const,
    network,
    price: config.price,
    payTo: config.payTo,
    maxTimeoutSeconds: config.maxTimeoutSeconds ?? 300,
  };

  debugLog("Built exact payment option", option);
  return option;
}

/**
 * Parse the payment signature from request headers.
 * Returns the decoded payment payload or null if no signature is present.
 */
export function parsePaymentSignature(request: Request): PaymentPayload | null {
  const signatureFromX = request.headers.get("X-PAYMENT-SIGNATURE");
  const signatureFromPlain = request.headers.get("PAYMENT-SIGNATURE");
  const signature = signatureFromX || signatureFromPlain;

  debugLog("Parsing payment signature from headers", {
    hasXPaymentSignature: !!signatureFromX,
    hasPaymentSignature: !!signatureFromPlain,
    signatureLength: signature?.length,
    signaturePreview: signature ? `${signature.substring(0, 100)}...` : null,
  });

  if (!signature) {
    debugLog("No payment signature found in headers");
    return null;
  }

  try {
    const decoded = decodePaymentSignatureHeader(signature);
    debugLog("Successfully decoded payment signature", {
      x402Version: decoded.x402Version,
      resource: decoded.resource,
      accepted: decoded.accepted,
      hasPayload: !!decoded.payload,
      payloadKeys: decoded.payload ? Object.keys(decoded.payload) : [],
      extensions: decoded.extensions,
    });
    return decoded;
  } catch (error) {
    errorLog("Failed to decode payment signature", error);
    debugLog("Raw signature that failed to decode (first 200 chars)", {
      signature: signature.substring(0, 200),
    });
    return null;
  }
}

/**
 * Verify a payment with the facilitator
 *
 * @param payload - The payment payload from the client
 * @param expectedDetails - The expected payment details from endpoint config
 * @returns Verification result
 */
export async function verifyPayment(
  payload: PaymentPayload,
  expectedDetails: {
    priceUsd: number; // Price in USD (e.g., 0.01 for 1 cent)
    payTo: string;
    testnet?: boolean;
  }
): Promise<{
  valid: boolean;
  invalidReason?: string;
  payerAddress?: string;
  chainId?: number;
}> {
  debugLog("=== VERIFY PAYMENT START ===");
  debugLog("Expected details", expectedDetails);
  debugLog("Payment payload received", {
    x402Version: payload.x402Version,
    resource: payload.resource,
    accepted: payload.accepted,
    payloadType: typeof payload.payload,
    payloadKeys: payload.payload ? Object.keys(payload.payload) : [],
    fullPayload: payload,
  });

  try {
    const server = await getResourceServer();
    const network = expectedDetails.testnet ? BASE_SEPOLIA : BASE_MAINNET;

    // Build payment option with AssetAmount price
    const priceAsset = usdToUsdc(expectedDetails.priceUsd, expectedDetails.testnet);
    const paymentOption = buildExactPaymentOption({
      price: priceAsset,
      payTo: expectedDetails.payTo,
      testnet: expectedDetails.testnet,
    });

    debugLog("Building payment requirements for verification", paymentOption);

    // Build payment requirements for verification
    const paymentRequirements = await server.buildPaymentRequirementsFromOptions(
      [paymentOption],
      undefined
    );

    debugLog("Payment requirements built", {
      count: paymentRequirements.length,
      requirements: paymentRequirements,
    });

    const paymentRequirement = paymentRequirements[0];
    if (!paymentRequirement) {
      errorLog("Failed to build payment requirements - no requirements returned");
      return {
        valid: false,
        invalidReason: "Failed to build payment requirements",
      };
    }

    debugLog("Using payment requirement for verification", {
      scheme: paymentRequirement.scheme,
      network: paymentRequirement.network,
      amount: paymentRequirement.amount,
      payTo: paymentRequirement.payTo,
      asset: paymentRequirement.asset,
    });

    // Compare payload.accepted vs requirements
    debugLog("Comparing payload.accepted with requirements", {
      payloadNetwork: payload.accepted?.network,
      requirementNetwork: paymentRequirement.network,
      networkMatch: payload.accepted?.network === paymentRequirement.network,
      payloadScheme: payload.accepted?.scheme,
      requirementScheme: paymentRequirement.scheme,
      schemeMatch: payload.accepted?.scheme === paymentRequirement.scheme,
      payloadAmount: payload.accepted?.amount,
      requirementAmount: paymentRequirement.amount,
      payloadPayTo: payload.accepted?.payTo,
      requirementPayTo: paymentRequirement.payTo,
      payloadAsset: payload.accepted?.asset,
      requirementAsset: paymentRequirement.asset,
    });

    // Verify with the facilitator
    debugLog("Calling facilitator verifyPayment...");
    const verifyResult = await server.verifyPayment(payload, paymentRequirement);

    debugLog("Facilitator verification result", {
      isValid: verifyResult?.isValid,
      invalidReason: verifyResult?.invalidReason,
      payer: verifyResult?.payer,
      fullResult: verifyResult,
    });

    if (!verifyResult || !verifyResult.isValid) {
      errorLog("Payment verification failed", {
        isValid: verifyResult?.isValid,
        invalidReason: verifyResult?.invalidReason,
      });
      return {
        valid: false,
        invalidReason: verifyResult?.invalidReason || "Payment verification failed",
      };
    }

    // Extract payer address from payload or verification result
    const payerAddress = verifyResult.payer || extractPayerAddress(payload);
    const chainId = expectedDetails.testnet
      ? BASE_SEPOLIA_CHAIN_ID
      : BASE_MAINNET_CHAIN_ID;

    debugLog("=== VERIFY PAYMENT SUCCESS ===", {
      payerAddress,
      chainId,
    });

    return {
      valid: true,
      payerAddress: payerAddress ?? undefined,
      chainId,
    };
  } catch (error) {
    errorLog("Payment verification threw exception", error);
    debugLog("Exception details", {
      name: error instanceof Error ? error.name : "unknown",
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return {
      valid: false,
      invalidReason: error instanceof Error ? error.message : "Verification failed",
    };
  }
}

/**
 * Settle a payment with the facilitator
 *
 * @param payload - The verified payment payload
 * @param expectedDetails - The expected payment details
 * @returns Settlement result
 */
export async function settlePayment(
  payload: PaymentPayload,
  expectedDetails: {
    priceUsd: number;
    payTo: string;
    testnet?: boolean;
  }
): Promise<{
  success: boolean;
  txHash?: string;
  error?: string;
  chainId?: number;
  network?: string;
}> {
  debugLog("=== SETTLE PAYMENT START ===");
  debugLog("Expected details", expectedDetails);
  debugLog("Payment payload", {
    x402Version: payload.x402Version,
    accepted: payload.accepted,
    resource: payload.resource,
  });

  try {
    const server = await getResourceServer();
    const network = expectedDetails.testnet ? BASE_SEPOLIA : BASE_MAINNET;

    // Build payment option with AssetAmount price
    const priceAsset = usdToUsdc(expectedDetails.priceUsd, expectedDetails.testnet);
    const paymentOption = buildExactPaymentOption({
      price: priceAsset,
      payTo: expectedDetails.payTo,
      testnet: expectedDetails.testnet,
    });

    debugLog("Building payment requirements for settlement", paymentOption);

    // Build payment requirements for settlement
    const paymentRequirements = await server.buildPaymentRequirementsFromOptions(
      [paymentOption],
      undefined
    );

    debugLog("Payment requirements built for settlement", {
      count: paymentRequirements.length,
    });

    const paymentRequirement = paymentRequirements[0];
    if (!paymentRequirement) {
      errorLog("Failed to build payment requirements for settlement");
      return {
        success: false,
        error: "Failed to build payment requirements",
      };
    }

    // Settle with the facilitator
    debugLog("Calling facilitator settlePayment...");
    const settleResult = await server.settlePayment(payload, paymentRequirement);

    debugLog("Facilitator settlement result", {
      success: settleResult?.success,
      transaction: settleResult?.transaction,
      errorReason: settleResult?.errorReason,
      fullResult: settleResult,
    });

    if (!settleResult || !settleResult.success) {
      errorLog("Payment settlement failed", {
        success: settleResult?.success,
        errorReason: settleResult?.errorReason,
      });
      return {
        success: false,
        error: settleResult?.errorReason || "Payment settlement failed",
      };
    }

    debugLog("=== SETTLE PAYMENT SUCCESS ===", {
      txHash: settleResult.transaction,
      network,
    });

    return {
      success: true,
      txHash: settleResult.transaction,
      chainId: expectedDetails.testnet
        ? BASE_SEPOLIA_CHAIN_ID
        : BASE_MAINNET_CHAIN_ID,
      network,
    };
  } catch (error) {
    errorLog("Payment settlement threw exception", error);
    debugLog("Exception details", {
      name: error instanceof Error ? error.name : "unknown",
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Settlement failed",
    };
  }
}

/**
 * Generate payment required response (402)
 * This is the x402 protocol response format
 */
export function generatePaymentRequiredResponse(config: {
  url: string;
  description?: string;
  priceUsd: number; // Price in USD
  payTo: string;
  testnet?: boolean;
}) {
  const network = config.testnet ? BASE_SEPOLIA : BASE_MAINNET;
  const usdcAsset = usdToUsdc(config.priceUsd, config.testnet);

  const response = {
    x402Version: 2,
    resource: {
      url: config.url,
      description: config.description,
      mimeType: "application/json",
    },
    accepts: [
      {
        scheme: "exact",
        network,
        amount: usdcAsset.amount,
        payTo: config.payTo,
        maxTimeoutSeconds: 300,
        asset: usdcAsset.asset,
        extra: usdcAsset.extra,
      },
    ],
  };

  debugLog("Generated payment required response", response);
  return response;
}

/**
 * Convert USDC amount to atomic units (6 decimals)
 * @deprecated Use usdToUsdc or centsToUsdc instead
 */
export function toAtomicUnits(amount: number): string {
  const result = Math.floor(amount * 1_000_000).toString();
  debugLog("Converted to atomic units (deprecated)", { input: amount, output: result });
  return result;
}

/**
 * Convert atomic units to USDC amount
 */
export function fromAtomicUnits(atomicUnits: string): number {
  return Number(atomicUnits) / 1_000_000;
}

/**
 * Extract payer address from payment payload
 */
function extractPayerAddress(payload: PaymentPayload): string | null {
  debugLog("Extracting payer address from payload");

  try {
    const innerPayload = payload.payload;
    debugLog("Inner payload", {
      type: typeof innerPayload,
      keys: innerPayload && typeof innerPayload === "object" ? Object.keys(innerPayload) : [],
      value: innerPayload,
    });

    // EIP-3009 transferWithAuthorization has "from" field
    if (innerPayload && typeof innerPayload === "object") {
      const obj = innerPayload as Record<string, unknown>;

      // Direct "from" field
      if ("from" in obj && typeof obj.from === "string") {
        debugLog("Found payer address in direct 'from' field", { from: obj.from });
        return obj.from;
      }

      // Nested in "authorization"
      if ("authorization" in obj && typeof obj.authorization === "object") {
        const auth = obj.authorization as Record<string, unknown>;
        debugLog("Found authorization object", { keys: Object.keys(auth), auth });
        if ("from" in auth && typeof auth.from === "string") {
          debugLog("Found payer address in authorization.from", { from: auth.from });
          return auth.from;
        }
      }

      // Try other common field names
      if ("sender" in obj && typeof obj.sender === "string") {
        debugLog("Found payer address in 'sender' field", { sender: obj.sender });
        return obj.sender;
      }

      if ("payer" in obj && typeof obj.payer === "string") {
        debugLog("Found payer address in 'payer' field", { payer: obj.payer });
        return obj.payer;
      }
    }

    debugLog("Could not extract payer address from payload");
    return null;
  } catch (error) {
    errorLog("Error extracting payer address", error);
    return null;
  }
}

/**
 * Get network info for display
 */
export function getNetworkInfo(testnet?: boolean) {
  return {
    network: testnet ? BASE_SEPOLIA : BASE_MAINNET,
    chainId: testnet ? BASE_SEPOLIA_CHAIN_ID : BASE_MAINNET_CHAIN_ID,
    chainIdHex: testnet ? "0x14a34" : "0x2105",
    chainName: testnet ? "Base Sepolia" : "Base",
    usdcAddress: testnet ? USDC_BASE_SEPOLIA : USDC_BASE_MAINNET,
    rpcUrl: testnet ? "https://sepolia.base.org" : "https://mainnet.base.org",
    blockExplorer: testnet
      ? "https://sepolia.basescan.org"
      : "https://basescan.org",
  };
}
