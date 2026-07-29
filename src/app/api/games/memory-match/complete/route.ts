import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";

export async function POST() {
  try {
    await requireSession();
    return NextResponse.json(
      {
        error:
          "Legacy completion is disabled. Complete the persisted server-authoritative attempt instead.",
      },
      { status: 410 },
    );
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
