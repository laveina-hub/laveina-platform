import { NextResponse } from "next/server";

import { env } from "@/env";
import { verifyAuth } from "@/lib/supabase/auth";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyAuth();
    if (auth.error) return auth.error;
    const { supabase, role } = auth;

    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const { data: shipment } = await supabase
      .from("shipments")
      .select("label_url, tracking_id")
      .eq("id", id)
      .single();

    if (!shipment?.label_url) {
      return NextResponse.json({ error: "No label available" }, { status: 404 });
    }

    const pub = env.SENDCLOUD_PUBLIC_KEY;
    const secret = env.SENDCLOUD_SECRET_KEY;

    if (!pub || !secret) {
      return NextResponse.json({ error: "SendCloud not configured" }, { status: 500 });
    }

    // Proxy the label PDF from SendCloud with authentication
    const credentials = Buffer.from(`${pub}:${secret}`).toString("base64");
    const labelRes = await fetch(shipment.label_url, {
      headers: { Authorization: `Basic ${credentials}` },
    });

    if (!labelRes.ok) {
      return NextResponse.json({ error: "Failed to fetch label" }, { status: 502 });
    }

    const pdfBuffer = await labelRes.arrayBuffer();

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="label-${shipment.tracking_id}.pdf"`,
      },
    });
  } catch (err) {
    console.error("GET /api/shipments/[id]/label failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
