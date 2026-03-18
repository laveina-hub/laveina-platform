import { NextResponse } from "next/server";

/**
 * POST /api/shipments/calculate-price
 *
 * Stub — pricing will be implemented in Milestone 2 using:
 *  - Barcelona (internal): size-based prices from admin_settings
 *  - SendCloud routes: live carrier rates from SendCloud API + margin
 */
export async function POST() {
  return NextResponse.json({ error: "Price calculation is not yet implemented" }, { status: 501 });
}
