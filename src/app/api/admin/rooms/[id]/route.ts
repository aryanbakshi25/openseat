import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { getServiceClient } from "@/lib/supabase/server";

const updateSchema = z.object({
  display_name: z.string().min(1).max(200).optional(),
  floor: z.string().max(50).nullable().optional(),
  capacity: z.number().int().min(1).nullable().optional(),
  is_reservable: z.boolean().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 },
    );
  }

  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("rooms")
      .update(parsed.data)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Admin room update error:", error.message);
      return NextResponse.json({ error: "Failed to update room" }, { status: 500 });
    }

    return NextResponse.json({ room: data });
  } catch {
    return NextResponse.json(
      { error: "Failed to update room" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const supabase = getServiceClient();
    const { error } = await supabase.from("rooms").delete().eq("id", id);

    if (error) {
      console.error("Admin room delete error:", error.message);
      return NextResponse.json({ error: "Failed to delete room" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete room" },
      { status: 500 },
    );
  }
}
