import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

const PRODUCT_TIERS: Record<string, string> = {
  "prod_U7pdgNHCagBgbj": "basic",
  "prod_U7pdcyM7zmUSwe": "profissional",
  "prod_U7peMQ2sGCp8oL": "premium",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ subscribed: false, error: "No authorization header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData?.user?.email) {
      logStep("Auth failed, returning unsubscribed", { error: userError?.message });
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    const user = userData.user;
    logStep("User authenticated", { userId: user.id, email: user.email?.replace(/(.{2}).*@(.{2}).*(\..+)/, "$1***@$2***$3") });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    // ── 1. Check Stripe subscriptions ──
    let hasActiveSub = false;
    let productId = null;
    let subscriptionTier: string | null = null;
    let subscriptionEnd: string | null = null;
    let isTrial = false;
    let trialEnd: string | null = null;

    if (customers.data.length > 0) {
      const customerId = customers.data[0].id;
      logStep("Found customer", { customerId });

      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      });

      let trialingSubs = { data: [] as any[] };
      if (subscriptions.data.length === 0) {
        trialingSubs = await stripe.subscriptions.list({
          customer: customerId,
          status: "trialing",
          limit: 1,
        });
      }

      const allSubs = [...subscriptions.data, ...trialingSubs.data];
      hasActiveSub = allSubs.length > 0;

      if (hasActiveSub) {
        const subscription = allSubs[0];
        subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
        productId = subscription.items.data[0].price.product;
        subscriptionTier = PRODUCT_TIERS[productId as string] || "unknown";
        isTrial = subscription.status === "trialing";
        if (subscription.trial_end) {
          trialEnd = new Date(subscription.trial_end * 1000).toISOString();
        }
        logStep("Active Stripe subscription found", { tier: subscriptionTier, isTrial });
      }
    } else {
      logStep("No Stripe customer found");
    }

    // ── 2. Fallback: check manual payments in DB ──
    if (!hasActiveSub) {
      logStep("Checking manual payments fallback");
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: manualPayment } = await supabaseClient
        .from("payments")
        .select("id, amount, status, paid_at, metadata")
        .eq("user_id", user.id)
        .eq("status", "paid")
        .gte("paid_at", thirtyDaysAgo)
        .order("paid_at", { ascending: false })
        .limit(1);

      if (manualPayment && manualPayment.length > 0) {
        const payment = manualPayment[0];
        const meta = (payment.metadata || {}) as Record<string, any>;
        subscriptionTier = meta.plan_slug || "profissional";
        const paidDate = new Date(payment.paid_at);
        const periodMonths = meta.period === "yearly" ? 12 : 1;
        subscriptionEnd = new Date(paidDate.getTime() + periodMonths * 30 * 24 * 60 * 60 * 1000).toISOString();
        hasActiveSub = true;
        logStep("Manual payment found", { paymentId: payment.id, tier: subscriptionTier, end: subscriptionEnd });
      } else {
        logStep("No manual payment found");
      }
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      product_id: productId,
      subscription_tier: subscriptionTier,
      subscription_end: subscriptionEnd,
      is_trial: isTrial,
      trial_end: trialEnd,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
