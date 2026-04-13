import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import {
  getAccessToken,
  LIBCAL_BASE_URL,
} from "@/lib/providers/reservations/libcal";

const bodySchema = z.object({
  bookId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const clientId = process.env.LIBCAL_CLIENT_ID;
  const clientSecret = process.env.LIBCAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "LibCal credentials not configured" },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Missing bookId" },
      { status: 400 },
    );
  }

  const { bookId } = parsed.data;

  try {
    const token = await getAccessToken(clientId, clientSecret);
    const res = await fetch(`${LIBCAL_BASE_URL}/space/cancel/${bookId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const text = await res.text();
    if (!res.ok) {
      return NextResponse.json(
        { error: `LibCal cancel failed: ${text}` },
        { status: res.status },
      );
    }

    return NextResponse.json({ success: true, message: text });
  } catch (err) {
    console.error("Cancel error:", err);
    return NextResponse.json(
      { error: "Failed to cancel booking" },
      { status: 500 },
    );
  }
}
