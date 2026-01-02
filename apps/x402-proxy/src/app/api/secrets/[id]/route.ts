import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { secrets } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { encrypt } from "@/lib/crypto";

// Validation schema for updates
const updateSecretSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(64)
    .regex(
      /^[a-zA-Z_][a-zA-Z0-9_]*$/,
      "Must start with letter or underscore, contain only letters, numbers, and underscores"
    )
    .optional(),
  value: z.string().min(1).optional(),
});

// DELETE /api/secrets/[id] - Delete secret
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

    // Check if secret exists and belongs to user
    const [existingSecret] = await db
      .select({ id: secrets.id })
      .from(secrets)
      .where(and(eq(secrets.id, id), eq(secrets.userId, session.user.id)))
      .limit(1);

    if (!existingSecret) {
      return NextResponse.json({ error: "Secret not found" }, { status: 404 });
    }

    await db.delete(secrets).where(eq(secrets.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting secret:", error);
    return NextResponse.json(
      { error: "Failed to delete secret" },
      { status: 500 }
    );
  }
}

// PATCH /api/secrets/[id] - Update secret
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

    // Check if secret exists and belongs to user
    const [existingSecret] = await db
      .select()
      .from(secrets)
      .where(and(eq(secrets.id, id), eq(secrets.userId, session.user.id)))
      .limit(1);

    if (!existingSecret) {
      return NextResponse.json({ error: "Secret not found" }, { status: 404 });
    }

    const body = await request.json();
    const validated = updateSecretSchema.parse(body);

    // Check if name is being changed and if it's unique
    if (validated.name && validated.name !== existingSecret.name) {
      const [nameExists] = await db
        .select({ id: secrets.id })
        .from(secrets)
        .where(
          and(eq(secrets.userId, session.user.id), eq(secrets.name, validated.name))
        )
        .limit(1);

      if (nameExists) {
        return NextResponse.json(
          { error: "A secret with this name already exists" },
          { status: 400 }
        );
      }
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (validated.name) {
      updateData.name = validated.name;
    }

    if (validated.value) {
      const { encrypted, iv } = encrypt(validated.value);
      updateData.encryptedValue = encrypted;
      updateData.iv = iv;
    }

    const [updatedSecret] = await db
      .update(secrets)
      .set(updateData)
      .where(eq(secrets.id, id))
      .returning({
        id: secrets.id,
        name: secrets.name,
        createdAt: secrets.createdAt,
        updatedAt: secrets.updatedAt,
      });

    return NextResponse.json(updatedSecret);
  } catch (error) {
    console.error("Error updating secret:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update secret" },
      { status: 500 }
    );
  }
}
