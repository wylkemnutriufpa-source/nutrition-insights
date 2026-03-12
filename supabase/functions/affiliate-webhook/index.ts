import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: any) => {
  console.log(`[AFFILIATE-WEBHOOK] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    return new Response(JSON.stringify({ error: "STRIPE_SECRET_KEY not set" }), { status: 500, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

  try {
    const body = await req.json();
    const { event_type, invoice_id, subscription_id, customer_email, amount, user_id } = body;

    log("Processing event", { event_type, invoice_id, customer_email });

    if (event_type === "invoice.paid" && invoice_id && customer_email) {
      // Find referral for this customer
      const { data: referral } = await supabase
        .from("affiliate_referrals")
        .select("*, affiliates(*)")
        .eq("referred_email", customer_email.toLowerCase())
        .in("status", ["registered", "paying"])
        .single();

      if (!referral) {
        log("No affiliate referral found for customer", { customer_email });
        return new Response(JSON.stringify({ ok: true, commission: false, reason: "no_referral" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const affiliate = referral.affiliates;
      if (!affiliate || !affiliate.is_active) {
        log("Affiliate inactive", { affiliate_id: referral.affiliate_id });
        return new Response(JSON.stringify({ ok: true, commission: false, reason: "affiliate_inactive" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Anti-abuse: self-referral check
      if (affiliate.user_id && affiliate.user_id === user_id) {
        log("Self-referral blocked", { user_id });
        return new Response(JSON.stringify({ ok: true, commission: false, reason: "self_referral" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get dynamic commission tier based on referral count
      const { data: tierData } = await supabase.rpc("get_affiliate_commission_tier", {
        _affiliate_id: affiliate.id,
      });

      const tier = tierData && tierData.length > 0 ? tierData[0] : null;

      // Check if first_payment commission already exists for this referral
      const { data: existingFirst } = await supabase
        .from("affiliate_commissions")
        .select("id")
        .eq("referral_id", referral.id)
        .eq("commission_type", "first_payment")
        .limit(1);

      const isFirstPayment = !existingFirst || existingFirst.length === 0;
      const commissionType = isFirstPayment ? "first_payment" : "recurring";

      // Use tier-based commission if available, fallback to affiliate's stored values
      const commissionPercent = tier
        ? (isFirstPayment ? Number(tier.first_payment_percent) : Number(tier.recurring_percent))
        : (isFirstPayment ? affiliate.first_payment_commission_percent : affiliate.recurring_commission_percent);

      const grossAmount = amount || 0;
      const commissionAmount = Math.round((grossAmount * commissionPercent) / 100 * 100) / 100;

      log("Tier-based commission", {
        tier_name: tier?.tier_name,
        tier_level: tier?.tier_level,
        commissionPercent,
        is_premium: tier?.is_premium,
      });

      // Duplicate invoice check
      const { data: existingInvoice } = await supabase
        .from("affiliate_commissions")
        .select("id")
        .eq("stripe_invoice_id", invoice_id)
        .eq("commission_type", commissionType)
        .limit(1);

      if (existingInvoice && existingInvoice.length > 0) {
        log("Duplicate commission blocked", { invoice_id, commissionType });
        return new Response(JSON.stringify({ ok: true, commission: false, reason: "duplicate" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create commission with status "pending" - will be approved next month
      const { error: commError } = await supabase
        .from("affiliate_commissions")
        .insert({
          affiliate_id: affiliate.id,
          referral_id: referral.id,
          stripe_invoice_id: invoice_id,
          stripe_subscription_id: subscription_id || null,
          commission_type: commissionType,
          gross_amount: grossAmount,
          commission_percent: commissionPercent,
          commission_amount: commissionAmount,
          status: "pending", // Always pending - paid next month after verification
        });

      if (commError) {
        log("Error creating commission", { error: commError.message });
        throw new Error(commError.message);
      }

      // Update referral status to paying
      if (referral.status !== "paying") {
        await supabase
          .from("affiliate_referrals")
          .update({ status: "paying", converted_at: new Date().toISOString() })
          .eq("id", referral.id);
      }

      log("Commission created", {
        commissionType, commissionAmount, commissionPercent,
        tier_name: tier?.tier_name, affiliate_id: affiliate.id
      });

      return new Response(JSON.stringify({
        ok: true,
        commission: true,
        commission_type: commissionType,
        commission_amount: commissionAmount,
        commission_percent: commissionPercent,
        tier: tier?.tier_name,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (event_type === "customer.subscription.deleted" && customer_email) {
      const { error } = await supabase
        .from("affiliate_referrals")
        .update({ status: "cancelled" })
        .eq("referred_email", customer_email.toLowerCase())
        .eq("status", "paying");

      log("Subscription cancelled, referral updated", { customer_email, error: error?.message });

      return new Response(JSON.stringify({ ok: true, action: "referral_cancelled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (event_type === "charge.refunded" && invoice_id) {
      const { error } = await supabase
        .from("affiliate_commissions")
        .update({ status: "reversed" })
        .eq("stripe_invoice_id", invoice_id)
        .in("status", ["pending", "approved"]);

      log("Commissions reversed due to refund", { invoice_id, error: error?.message });

      return new Response(JSON.stringify({ ok: true, action: "commissions_reversed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, action: "no_action" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
