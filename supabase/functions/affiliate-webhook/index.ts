import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

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
    let event_type: string;
    let invoice_id: string | undefined;
    let subscription_id: string | undefined;
    let customer_email: string | undefined;
    let amount: number | undefined;
    let user_id: string | undefined;
    let ip_address: string | undefined;

    const signature = req.headers.get("stripe-signature");

    // ─── STRIPE SIGNATURE VERIFICATION ───
    // If request has stripe-signature header AND webhook secret is configured,
    // verify authenticity via Stripe SDK (production-grade security)
    if (signature && webhookSecret) {
      const rawBody = await req.text();
      let event: any;
      try {
        event = await stripe.webhooks.constructEventAsync(
          rawBody,
          signature,
          webhookSecret,
          undefined,
          Stripe.createSubtleCryptoProvider()
        );
      } catch (err: any) {
        const msg = err instanceof Error ? err.message : String(err);
        log("SIGNATURE VERIFICATION FAILED", { error: msg });
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      log("Stripe signature verified ✅", { type: event.type });

      // Extract fields from verified Stripe event
      event_type = event.type;
      const obj = event.data?.object || {};
      invoice_id = obj.id || obj.invoice;
      subscription_id = obj.subscription || obj.id;
      customer_email = obj.customer_email || obj.receipt_email;
      amount = obj.amount_paid != null ? obj.amount_paid / 100 : (obj.total != null ? obj.total / 100 : undefined);

      // If no email in event object, lookup via Stripe customer
      if (!customer_email && obj.customer) {
        try {
          const cust = await stripe.customers.retrieve(obj.customer);
          if (cust && !cust.deleted) {
            customer_email = (cust as any).email;
          }
        } catch (_) { /* ignore */ }
      }
    } else if (!webhookSecret) {
      // Hard fail: webhook signature verification is mandatory in production
      log("REJECTED: STRIPE_WEBHOOK_SECRET is not configured");
      return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      // Has webhook secret but no signature header — reject
      log("REJECTED: Missing stripe-signature header");
      return new Response(JSON.stringify({ error: "Missing stripe-signature header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    log("Processing event", { event_type, invoice_id, customer_email });

    // ─── INVOICE PAID → COMMISSION ───
    if (event_type === "invoice.paid" && invoice_id && customer_email) {
      const { data: referral } = await supabase
        .from("affiliate_referrals")
        .select("*, affiliates(*)")
        .eq("referred_email", customer_email.toLowerCase())
        .in("status", ["registered", "paying"])
        .single();

      if (!referral) {
        log("No affiliate referral found", { customer_email });
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

      // Resolve tenant_id from affiliate's tenant or user
      const affiliateTenantId = affiliate.tenant_id || null;
      const tenantSpread = affiliateTenantId ? { tenant_id: affiliateTenantId } : {};

      // ─── ANTI-FRAUD CHECKS ───

      // 1. Self-referral check (same user_id)
      if (affiliate.user_id && affiliate.user_id === user_id) {
        log("FRAUD: Self-referral blocked", { user_id });
        await supabase.from("affiliate_risk_flags").insert({
          affiliate_id: affiliate.id,
          referral_id: referral.id,
          flag_type: "self_referral",
          severity: "critical",
          description: `Self-referral attempt: affiliate user_id matches referred user_id (${user_id})`,
          metadata: { user_id, customer_email },
        });
        return new Response(JSON.stringify({ ok: true, commission: false, reason: "self_referral" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 2. Same email domain check (affiliate email = referred email)
      if (affiliate.email && affiliate.email.toLowerCase() === customer_email.toLowerCase()) {
        log("FRAUD: Same email blocked", { affiliate_email: affiliate.email, customer_email });
        await supabase.from("affiliate_risk_flags").insert({
          affiliate_id: affiliate.id,
          referral_id: referral.id,
          flag_type: "self_referral",
          severity: "critical",
          description: `Same email: affiliate email matches referred email`,
          metadata: { affiliate_email: affiliate.email, customer_email },
        });
        return new Response(JSON.stringify({ ok: true, commission: false, reason: "same_email" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 3. Rapid signup detection (referral created < 2 min ago = suspicious)
      const referralAge = Date.now() - new Date(referral.created_at).getTime();
      const TWO_MINUTES = 2 * 60 * 1000;
      if (referralAge < TWO_MINUTES) {
        log("FRAUD: Rapid signup detected", { referral_age_ms: referralAge });
        await supabase.from("affiliate_risk_flags").insert({
          affiliate_id: affiliate.id,
          referral_id: referral.id,
          flag_type: "rapid_signup",
          severity: "high",
          description: `Referral created ${Math.round(referralAge / 1000)}s before payment`,
          metadata: { referral_age_ms: referralAge, customer_email },
        });
        // Don't block, but flag - commission still created as pending
      }

      // 4. Check for suspicious volume (>5 referrals in last hour from same affiliate)
      const { count: recentCount } = await supabase
        .from("affiliate_referrals")
        .select("*", { count: "exact", head: true })
        .eq("affiliate_id", affiliate.id)
        .gte("created_at", new Date(Date.now() - 3600000).toISOString());

      if (recentCount && recentCount > 5) {
        log("FRAUD: High volume detected", { recentCount, affiliate_id: affiliate.id });
        await supabase.from("affiliate_risk_flags").insert({
          affiliate_id: affiliate.id,
          flag_type: "suspicious_pattern",
          severity: "high",
          description: `${recentCount} referrals in the last hour`,
          metadata: { recent_count: recentCount },
        });
      }

      // ─── COMMISSION CALCULATION ───
      const { data: tierData } = await supabase.rpc("get_affiliate_commission_tier", {
        _affiliate_id: affiliate.id,
      });

      const tier = tierData && tierData.length > 0 ? tierData[0] : null;

      const { data: existingFirst } = await supabase
        .from("affiliate_commissions")
        .select("id")
        .eq("referral_id", referral.id)
        .eq("commission_type", "first_payment")
        .limit(1);

      const isFirstPayment = !existingFirst || existingFirst.length === 0;
      const commissionType = isFirstPayment ? "first_payment" : "recurring";

      const commissionPercent = tier
        ? (isFirstPayment ? Number(tier.first_payment_percent) : Number(tier.recurring_percent))
        : (isFirstPayment ? affiliate.first_payment_commission_percent : affiliate.recurring_commission_percent);

      const grossAmount = amount || 0;
      const commissionAmount = Math.round((grossAmount * commissionPercent) / 100 * 100) / 100;

      log("Commission calc", {
        tier_name: tier?.tier_name,
        commissionPercent,
        commissionType,
        grossAmount,
        commissionAmount,
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

      // Create commission — always PENDING (approved next month after verification)
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
          status: "pending",
        });

      if (commError) {
        log("Error creating commission", { error: commError.message });
        throw new Error(commError.message);
      }

      // Update referral status
      if (referral.status !== "paying") {
        await supabase
          .from("affiliate_referrals")
          .update({ status: "paying", converted_at: new Date().toISOString() })
          .eq("id", referral.id);
      }

      // Create notification for affiliate
      if (affiliate.user_id) {
        await supabase.from("notifications").insert({
          user_id: affiliate.user_id,
          title: "💰 Nova comissão!",
          message: `Você ganhou R$ ${commissionAmount.toFixed(2)} de comissão (${commissionType === "first_payment" ? "1ª venda" : "recorrente"}).`,
          type: "commission",
          action_url: "/ambassador",
          ...tenantSpread,
        });
      }

      log("Commission created", { commissionType, commissionAmount, tier: tier?.tier_name });

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

    // ─── SUBSCRIPTION CANCELLED ───
    if (event_type === "customer.subscription.deleted" && customer_email) {
      // Update referral status
      const { data: cancelledReferrals } = await supabase
        .from("affiliate_referrals")
        .update({ status: "cancelled" })
        .eq("referred_email", customer_email.toLowerCase())
        .eq("status", "paying")
        .select("id, affiliate_id, created_at");

      // Check for early cancellation (< 7 days) → flag pending commissions
      if (cancelledReferrals) {
        for (const ref of cancelledReferrals) {
          const refAge = Date.now() - new Date(ref.created_at).getTime();
          const SEVEN_DAYS = 7 * 24 * 3600 * 1000;

          if (refAge < SEVEN_DAYS) {
            // Early cancel — reverse pending commissions
            await supabase
              .from("affiliate_commissions")
              .update({ status: "reversed" })
              .eq("referral_id", ref.id)
              .eq("status", "pending");

            await supabase.from("affiliate_risk_flags").insert({
              affiliate_id: ref.affiliate_id,
              referral_id: ref.id,
              flag_type: "early_cancel",
              severity: "high",
              description: `Subscription cancelled within ${Math.round(refAge / 86400000)} days — pending commissions reversed`,
              metadata: { days_active: Math.round(refAge / 86400000), customer_email },
            });

            log("Early cancel — commissions reversed", { referral_id: ref.id });
          }
        }
      }

      log("Subscription cancelled", { customer_email });
      return new Response(JSON.stringify({ ok: true, action: "referral_cancelled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── CHARGE REFUNDED ───
    if (event_type === "charge.refunded" && invoice_id) {
      const { data: reversedComms } = await supabase
        .from("affiliate_commissions")
        .update({ status: "reversed" })
        .eq("stripe_invoice_id", invoice_id)
        .in("status", ["pending", "approved"])
        .select("affiliate_id");

      // Flag refunds
      if (reversedComms && reversedComms.length > 0) {
        for (const c of reversedComms) {
          await supabase.from("affiliate_risk_flags").insert({
            affiliate_id: c.affiliate_id,
            flag_type: "suspicious_pattern",
            severity: "medium",
            description: `Charge refunded for invoice ${invoice_id}`,
            metadata: { invoice_id },
          });
        }
      }

      log("Commissions reversed due to refund", { invoice_id });
      return new Response(JSON.stringify({ ok: true, action: "commissions_reversed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, action: "no_action" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
