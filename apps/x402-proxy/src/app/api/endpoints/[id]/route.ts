import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { endpoints } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { validateEndpointUrl } from "@/lib/utils";

// Get URL validation config from environment
const urlValidationConfig = {
  allowLocalhost: process.env.NEXT_PUBLIC_ALLOW_LOCALHOST_ENDPOINT === "true",
  allowOtherSchemes: process.env.NEXT_PUBLIC_ALLOW_OTHER_ENDPOINT_SCHEMES === "true",
};

// Validation schema for updates
const updateEndpointSchema = z.object({
  name: z.string().min(1).max(128).optional(),
  slug: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens")
    .optional(),
  description: z.string().max(1000).optional().nullable(),
  targetUrl: z.string().url().optional(),
  authType: z
    .enum([
      "none",
      "bearer",
      "api_key_header",
      "api_key_query",
      "basic_auth",
      "custom_headers",
    ])
    .optional(),
  authConfig: z.record(z.string()).optional(),
  paywallAmount: z.number().positive().optional(),
  paywallPayTo: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .nullable()
    .optional(),
  paywallTestnet: z.boolean().optional(),
  paywallConfig: z.record(z.unknown()).optional(),
  customHtml: z.string().nullable().optional(),
  cname: z.string().max(253).nullable().optional(),
  isActive: z.boolean().optional(),
  rateLimitPerSec: z.number().int().positive().max(100).optional(),
});

// GET /api/endpoints/[id] - Get single endpoint
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [endpoint] = await db
      .select()
      .from(endpoints)
      .where(
        and(eq(endpoints.id, id), eq(endpoints.userId, session.user.id))
      )
      .limit(1);

    if (!endpoint) {
      return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
    }

    return NextResponse.json(endpoint);
  } catch (error) {
    console.error("Error fetching endpoint:", error);
    return NextResponse.json(
      { error: "Failed to fetch endpoint" },
      { status: 500 }
    );
  }
}

// PATCH /api/endpoints/[id] - Update endpoint
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if endpoint exists and belongs to user
    const [existingEndpoint] = await db
      .select()
      .from(endpoints)
      .where(
        and(eq(endpoints.id, id), eq(endpoints.userId, session.user.id))
      )
      .limit(1);

    if (!existingEndpoint) {
      return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
    }

    const body = await request.json();
    const validated = updateEndpointSchema.parse(body);

    // Validate target URL if being updated
    if (validated.targetUrl) {
      const urlValidation = validateEndpointUrl(validated.targetUrl, urlValidationConfig);
      if (!urlValidation.valid) {
        return NextResponse.json(
          { error: urlValidation.error || "Invalid target URL" },
          { status: 400 }
        );
      }
    }

    // Check if slug is being changed and if it's unique
    if (validated.slug && validated.slug !== existingEndpoint.slug) {
      const [slugExists] = await db
        .select({ id: endpoints.id })
        .from(endpoints)
        .where(
          and(
            eq(endpoints.userId, session.user.id),
            eq(endpoints.slug, validated.slug)
          )
        )
        .limit(1);

      if (slugExists) {
        return NextResponse.json(
          { error: "An endpoint with this slug already exists" },
          { status: 400 }
        );
      }
    }

    // Check CNAME uniqueness if being changed
    if (validated.cname && validated.cname !== existingEndpoint.cname) {
      const [cnameExists] = await db
        .select({ id: endpoints.id })
        .from(endpoints)
        .where(eq(endpoints.cname, validated.cname))
        .limit(1);

      if (cnameExists) {
        return NextResponse.json(
          { error: "This CNAME is already in use" },
          { status: 400 }
        );
      }
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.slug !== undefined) updateData.slug = validated.slug;
    if (validated.description !== undefined)
      updateData.description = validated.description;
    if (validated.targetUrl !== undefined)
      updateData.targetUrl = validated.targetUrl;
    if (validated.authType !== undefined)
      updateData.authType = validated.authType;
    if (validated.authConfig !== undefined)
      updateData.authConfig = validated.authConfig;
    if (validated.paywallAmount !== undefined)
      updateData.paywallAmount = validated.paywallAmount.toString();
    if (validated.paywallPayTo !== undefined)
      updateData.paywallPayTo = validated.paywallPayTo;
    if (validated.paywallTestnet !== undefined)
      updateData.paywallTestnet = validated.paywallTestnet;
    if (validated.paywallConfig !== undefined)
      updateData.paywallConfig = validated.paywallConfig;
    if (validated.customHtml !== undefined)
      updateData.customHtml = validated.customHtml;
    if (validated.cname !== undefined) {
      updateData.cname = validated.cname;
      updateData.cnameVerified = false; // Reset verification when CNAME changes
    }
    if (validated.isActive !== undefined)
      updateData.isActive = validated.isActive;
    if (validated.rateLimitPerSec !== undefined)
      updateData.rateLimitPerSec = validated.rateLimitPerSec;

    const [updatedEndpoint] = await db
      .update(endpoints)
      .set(updateData)
      .where(eq(endpoints.id, id))
      .returning();

    return NextResponse.json(updatedEndpoint);
  } catch (error) {
    console.error("Error updating endpoint:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update endpoint" },
      { status: 500 }
    );
  }
}

// DELETE /api/endpoints/[id] - Delete endpoint
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if endpoint exists and belongs to user
    const [existingEndpoint] = await db
      .select({ id: endpoints.id })
      .from(endpoints)
      .where(
        and(eq(endpoints.id, id), eq(endpoints.userId, session.user.id))
      )
      .limit(1);

    if (!existingEndpoint) {
      return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
    }

    await db.delete(endpoints).where(eq(endpoints.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting endpoint:", error);
    return NextResponse.json(
      { error: "Failed to delete endpoint" },
      { status: 500 }
    );
  }
}
