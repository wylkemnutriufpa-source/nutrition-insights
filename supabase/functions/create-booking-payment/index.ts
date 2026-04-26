import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// UUID v4 regex for nutritionist_id validation
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_AMOUNT = 10; // R$10 minimum
const MAX_AMOUNT = 50000; // R$50.000 maximum
const MAX_NAME_LENGTH = 200;
const MAX_EMAIL_LENGTH = 254;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // === 1. Parse body safely ===
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { nutritionist_id, amount, customer_name, customer_email, slot_date, slot_time } = body as {
      nutritionist_id: string;
      amount: number;
      customer_name: string;
      customer_email: string;
      slot_date?: string;
      slot_time?: string;
    };

    // === 2. Strict input validation ===
    const errors: string[] = [];

    if (!nutritionist_id || typeof nutritionist_id !== "string" || !UUID_RE.test(nutritionist_id)) {
      errors.push("Invalid nutritionist_id format");
    }
    if (typeof amount !== "number" || !isFinite(amount) || amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
      errors.push(`Amount must be between ${MIN_AMOUNT} and ${MAX_AMOUNT}`);
    }
    if (!customer_name || typeof customer_name !== "string" || customer_name.trim().length < 2 || customer_name.length > MAX_NAME_LENGTH) {
      errors.push("customer_name must be 2-200 characters");
    }
    if (!customer_email || typeof customer_email !== "string" || !EMAIL_RE.test(customer_email) || customer_email.length > MAX_EMAIL_LENGTH) {
      errors.push("Invalid customer_email");
    }
    if (slot_date && (typeof slot_date !== "string" || slot_date.length > 20)) {
      errors.push("Invalid slot_date");
    }
    if (slot_time && (typeof slot_time !== "string" || slot_time.length > 10)) {
      errors.push("Invalid slot_time");
    }

    if (errors.length > 0) {
      return new Response(JSON.stringify({ error: "Validation failed", details: errors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === 3. Rate limiting by email (anti-spam) ===
    const { allowed } = await checkRateLimit(
      "create-booking-payment",
      customer_email.toLowerCase().trim(),
      5,  // max 5 booking attempts per email
      30  // per 30 minutes
    );
    if (!allowed) {
      // Log abuse attempt
      await supabase.from("security_events").insert({
        event_type: "booking_rate_limit",
        function_name: "create-booking-payment",
        metadata: {
          email_hash: customer_email.substring(0, 3) + "***",
          nutritionist_id,
          amount,
        },
      });
      return rateLimitResponse();
    }

    // === 4. Validate nutritionist exists and is active ===
    const { data: nutProfile, error: nutError } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .eq("user_id", nutritionist_id)
      .single();

    if (nutError || !nutProfile) {
      return new Response(JSON.stringify({ error: "Nutritionist not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === 5. Idempotency: check for recent duplicate booking ===
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: existingBooking } = await supabase
      .from("booking_payments")
      .select("id, stripe_session_id, status")
      .eq("nutritionist_id", nutritionist_id)
      .eq("customer_email", customer_email.toLowerCase().trim())
      .eq("amount", amount)
      .eq("status", "pending")
      .gte("created_at", fiveMinAgo)
      .limit(1)
      .maybeSingle();

    if (existingBooking?.stripe_session_id) {
      // Return existing session instead of creating duplicate
      console.log("[create-booking-payment] Returning existing pending session");
      return new Response(JSON.stringify({
        url: null, // Session URL expired, client should retry if needed
        booking_id: existingBooking.id,
        message: "A pending booking already exists. Please complete the existing payment or wait a few minutes."
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === 6. Stripe setup ===
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "Payment gateway not configured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Resolve tenant_id from nutritionist (active tenant only)
    const { data: tenantId } = await supabase.rpc("get_user_active_tenant", { _user_id: nutritionist_id });

    // Create booking payment record
    const sanitizedName = customer_name.trim().substring(0, MAX_NAME_LENGTH);
    const sanitizedEmail = customer_email.toLowerCase().trim();

    const { data: bookingPayment, error: dbError } = await supabase
      .from("booking_payments")
      .insert({
        nutritionist_id,
        customer_email: sanitizedEmail,
        customer_name: sanitizedName,
        amount,
        status: "pending",
        ...(tenantId ? { tenant_id: tenantId } : {}),
      })
      .select("id")
      .single();

    if (dbError) {
      console.error("[create-booking-payment] DB error:", dbError.code);
      return new Response(JSON.stringify({ error: "Failed to create booking" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const nutName = nutProfile.full_name || "Nutricionista";
    const origin = "https://www.fitjourney.com.br";

    // Create Stripe checkout session (one-off payment)
    const session = await stripe.checkout.sessions.create({
      customer_email: sanitizedEmail,
      line_items: [
        {
          price_data: {
            currency: "brl",
            unit_amount: Math.round(amount * 100),
            product_data: {
              name: `Consulta com ${nutName}`,
              description: slot_date && slot_time
                ? `Agendamento: ${slot_date} às ${slot_time}`
                : "Agendamento de consulta",
            },
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      metadata: {
        booking_payment_id: bookingPayment.id,
        nutritionist_id,
        slot_date: slot_date || "",
        slot_time: slot_time || "",
      },
      success_url: `${origin}/booking-success?session_id={CHECKOUT_SESSION_ID}&booking_id=${bookingPayment.id}`,
      cancel_url: `${origin}/booking-cancelled`,
    });

    // Update booking with session ID
    await supabase
      .from("booking_payments")
      .update({ stripe_session_id: session.id })
      .eq("id", bookingPayment.id);

    return new Response(JSON.stringify({ url: session.url, booking_id: bookingPayment.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    // Never expose internal error details to client
    console.error("[create-booking-payment] Unexpected error:", err.message);
    return new Response(JSON.stringify({ error: "An unexpected error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
