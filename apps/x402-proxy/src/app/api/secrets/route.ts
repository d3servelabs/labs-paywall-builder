import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { secrets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { encrypt } from "@/lib/crypto";

// Validation schema
const createSecretSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(64)
    .regex(
      /^[a-zA-Z_][a-zA-Z0-9_]*$/,
      "Must start with letter or underscore, contain only letters, numbers, and underscores"
    ),
  value: z.string().min(1),
});

// GET /api/secrets - List user's secrets (names only, not values)
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userSecrets = await db
      .select({
        id: secrets.id,
        name: secrets.name,
        createdAt: secrets.createdAt,
        updatedAt: secrets.updatedAt,
      })
      .from(secrets)
      .where(eq(secrets.userId, session.user.id))
      .orderBy(secrets.name);

    return NextResponse.json(userSecrets);
  } catch (error) {
    console.error("Error fetching secrets:", error);
    return NextResponse.json(
      { error: "Failed to fetch secrets" },
      { status: 500 }
    );
  }
}

// POST /api/secrets - Create new secret
export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = createSecretSchema.parse(body);

    // Check if secret name already exists for this user
    const [existing] = await db
      .select({ id: secrets.id })
      .from(secrets)
      .where(eq(secrets.userId, session.user.id))
      .limit(1);

    // Check by name
    const existingByName = await db
      .select({ id: secrets.id })
      .from(secrets)
      .where(eq(secrets.name, validated.name))
      .limit(1);

    if (existingByName.length > 0) {
      return NextResponse.json(
        { error: "A secret with this name already exists" },
        { status: 400 }
      );
    }

    // Encrypt the value
    const { encrypted, iv } = encrypt(validated.value);

    // Create the secret
    const [newSecret] = await db
      .insert(secrets)
      .values({
        userId: session.user.id,
        name: validated.name,
        encryptedValue: encrypted,
        iv,
      })
      .returning({
        id: secrets.id,
        name: secrets.name,
        createdAt: secrets.createdAt,
        updatedAt: secrets.updatedAt,
      });

    return NextResponse.json(newSecret, { status: 201 });
  } catch (error) {
    console.error("Error creating secret:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create secret" },
      { status: 500 }
    );
  }
}
