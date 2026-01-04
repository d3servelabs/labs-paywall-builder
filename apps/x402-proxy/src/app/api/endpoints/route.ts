import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { endpoints } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { isValidEthAddress, validateEndpointUrl } from "@/lib/utils";

// Get URL validation config from environment
const urlValidationConfig = {
  allowLocalhost: process.env.NEXT_PUBLIC_ALLOW_LOCALHOST_ENDPOINT === "true",
  allowOtherSchemes: process.env.NEXT_PUBLIC_ALLOW_OTHER_ENDPOINT_SCHEMES === "true",
};

// Validation schema
const createEndpointSchema = z.object({
  name: z.string().min(1).max(128),
  slug: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens"),
  description: z.string().max(1000).optional(),
  targetUrl: z.string().url(),
  authType: z.enum([
    "none",
    "bearer",
    "api_key_header",
    "api_key_query",
    "basic_auth",
    "custom_headers",
  ]),
  authConfig: z.record(z.string()).optional(),
  paywallAmount: z.number().positive(),
  paywallPayTo: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .nullable()
    .optional(),
  paywallTestnet: z.boolean().optional(),
  paywallConfig: z.record(z.unknown()).optional(),
  customHtml: z.string().optional(),
  cname: z.string().max(253).optional(),
  rateLimitPerSec: z.number().int().positive().max(100).optional(),
});

// GET /api/endpoints - List user's endpoints
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEndpoints = await db
      .select()
      .from(endpoints)
      .where(eq(endpoints.userId, session.user.id))
      .orderBy(endpoints.createdAt);

    return NextResponse.json(userEndpoints);
  } catch (error) {
    console.error("Error fetching endpoints:", error);
    return NextResponse.json(
      { error: "Failed to fetch endpoints" },
      { status: 500 }
    );
  }
}

// POST /api/endpoints - Create new endpoint
export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = createEndpointSchema.parse(body);

    // Validate target URL
    const urlValidation = validateEndpointUrl(validated.targetUrl, urlValidationConfig);
    if (!urlValidation.valid) {
      return NextResponse.json(
        { error: urlValidation.error || "Invalid target URL" },
        { status: 400 }
      );
    }

    // Check if slug already exists for this user
    const existing = await db
      .select({ id: endpoints.id })
      .from(endpoints)
      .where(
        and(
          eq(endpoints.userId, session.user.id),
          eq(endpoints.slug, validated.slug)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "An endpoint with this slug already exists" },
        { status: 400 }
      );
    }

    // Check CNAME uniqueness if provided
    if (validated.cname) {
      const existingCname = await db
        .select({ id: endpoints.id })
        .from(endpoints)
        .where(eq(endpoints.cname, validated.cname))
        .limit(1);

      if (existingCname.length > 0) {
        return NextResponse.json(
          { error: "This CNAME is already in use" },
          { status: 400 }
        );
      }
    }

    // Create the endpoint
    const [newEndpoint] = await db
      .insert(endpoints)
      .values({
        userId: session.user.id,
        name: validated.name,
        slug: validated.slug,
        description: validated.description,
        targetUrl: validated.targetUrl,
        authType: validated.authType,
        authConfig: validated.authConfig || {},
        paywallAmount: validated.paywallAmount.toString(),
        paywallPayTo: validated.paywallPayTo,
        paywallTestnet: validated.paywallTestnet ?? false,
        paywallConfig: validated.paywallConfig || {},
        customHtml: validated.customHtml,
        cname: validated.cname,
        rateLimitPerSec: validated.rateLimitPerSec ?? 5,
      })
      .returning();

    return NextResponse.json(newEndpoint, { status: 201 });
  } catch (error) {
    console.error("Error creating endpoint:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create endpoint" },
      { status: 500 }
    );
  }
}
