import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { isReservedSlug } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json(
        { error: "Slug is required" },
        { status: 400 }
      );
    }

    // Check if slug is reserved
    if (isReservedSlug(slug)) {
      return NextResponse.json({
        available: false,
        reason: "reserved",
      });
    }

    // Check if slug is valid format
    if (!/^[a-z0-9-]+$/.test(slug) || slug.length < 3 || slug.length > 32) {
      return NextResponse.json({
        available: false,
        reason: "invalid",
      });
    }

    // Check database for existing user with this slug
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.slug, slug))
      .limit(1);

    return NextResponse.json({
      available: existingUser.length === 0,
      reason: existingUser.length > 0 ? "taken" : null,
    });
  } catch (error) {
    console.error("Error checking slug:", error);
    return NextResponse.json(
      { error: "Failed to check slug availability" },
      { status: 500 }
    );
  }
}
