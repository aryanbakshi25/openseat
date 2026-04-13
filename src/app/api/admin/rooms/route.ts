import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { getServiceClient } from "@/lib/supabase/server";

const createSchema = z.object({
  library_id: z.string().uuid(),
  display_name: z.string().min(1).max(200),
  floor: z.string().max(50).nullable().optional(),
  capacity: z.number().int().min(1).nullable().optional(),
  is_reservable: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const libraryId = req.nextUrl.searchParams.get("library_id");
  if (!libraryId) {
    return NextResponse.json(
      { error: "library_id is required" },
      { status: 400 },
    );
  }

  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("library_id", libraryId)
      .order("display_name");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ rooms: data });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch rooms" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
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
      .insert({
        library_id: parsed.data.library_id,
        display_name: parsed.data.display_name,
        floor: parsed.data.floor ?? null,
        capacity: parsed.data.capacity ?? null,
        is_reservable: parsed.data.is_reservable ?? true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ room: data }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create room" },
      { status: 500 },
    );
  }
}
