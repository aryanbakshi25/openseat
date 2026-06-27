import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { getServiceClient } from "@/lib/supabase/server";

const dayScheduleSchema = z.union([
  z.tuple([z.number().int().min(0).max(24), z.number().int().min(0).max(24)]),
  z.null(),
]);

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z
    .string()
    .min(1)
    .max(20)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens")
    .optional(),
  hours: z.array(dayScheduleSchema).length(7).optional(),
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
      .from("libraries")
      .update(parsed.data)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A library with this slug already exists" },
          { status: 409 },
        );
      }
      console.error("Admin library update error:", error.message);
      return NextResponse.json({ error: "Failed to update library" }, { status: 500 });
    }

    return NextResponse.json({ library: data });
  } catch {
    return NextResponse.json(
      { error: "Failed to update library" },
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
    const { error } = await supabase.from("libraries").delete().eq("id", id);

    if (error) {
      console.error("Admin library delete error:", error.message);
      return NextResponse.json({ error: "Failed to delete library" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete library" },
      { status: 500 },
    );
  }
}
