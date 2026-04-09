import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { nutritionist_id, amount, customer_name, customer_email, slot_date, slot_time } = await req.json();

    if (!nutritionist_id || !amount || !customer_name || !customer_email) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Resolve tenant_id from nutritionist (active tenant only)
    const { data: tenantId } = await supabase.rpc("get_user_active_tenant", { _user_id: nutritionist_id });

    // Create booking payment record
    const { data: bookingPayment, error: dbError } = await supabase
      .from("booking_payments")
      .insert({
        nutritionist_id,
        customer_email,
        customer_name,
        amount,
        status: "pending",
        ...(tenantId ? { tenant_id: tenantId } : {}),
      })
      .select("id")
      .single();

    if (dbError) throw new Error(dbError.message);

    // Get nutritionist name
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", nutritionist_id)
      .single();

    const nutName = profile?.full_name || "Nutricionista";
    const origin = req.headers.get("origin") || "https://fijourney.lovable.app";

    // Create Stripe checkout session (one-off payment)
    const session = await stripe.checkout.sessions.create({
      customer_email,
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
    console.error("[create-booking-payment]", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
