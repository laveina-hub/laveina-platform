/**
 * Stripe webhook handler — processes payment events (checkout completed, refunds, etc.).
 * Reads the raw body and verifies the Stripe signature before processing.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import Stripe from "stripe";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  const stripe = getStripe();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`Webhook signature verification failed: ${message}`);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  // Handle specific event types
  switch (event.type) {
    case "checkout.session.completed": {
      // TODO: Mark shipment as paid, generate tracking ID, send confirmation
      console.log("Checkout session completed:", event.data.object.id);
      break;
    }
    case "charge.refunded": {
      // TODO: Handle refund — update shipment status
      console.log("Charge refunded:", event.data.object.id);
      break;
    }
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
