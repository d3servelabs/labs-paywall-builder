import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updateSettingsSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  defaultPayTo: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address")
    .nullable()
    .optional(),
});

/**
 * GET /api/settings - Get current user settings
 */
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        slug: users.slug,
        defaultPayTo: users.defaultPayTo,
        image: users.image,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/settings - Update user settings
 */
export async function PATCH(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateSettingsSchema.parse(body);

    // Build update object
    const updateData: Partial<{
      name: string;
      defaultPayTo: string | null;
      updatedAt: Date;
    }> = {
      updatedAt: new Date(),
    };

    if (validatedData.name !== undefined) {
      updateData.name = validatedData.name;
    }

    if (validatedData.defaultPayTo !== undefined) {
      updateData.defaultPayTo = validatedData.defaultPayTo;
    }

    // Update user
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, session.user.id))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        slug: users.slug,
        defaultPayTo: users.defaultPayTo,
        image: users.image,
      });

    return NextResponse.json(updatedUser);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
