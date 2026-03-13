import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: any) => {
  console.log(`[STRIPE-WEBHOOK] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

const PRODUCT_TIERS: Record<string, string> = {
  "prod_U7pdgNHCagBgbj": "Basic",
  "prod_U7pdcyM7zmUSwe": "Profissional",
  "prod_U7peMQ2sGCp8oL": "Premium",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!stripeKey) {
    return new Response(JSON.stringify({ error: "STRIPE_SECRET_KEY not set" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

  try {
    let event: Stripe.Event;
    const signature = req.headers.get("stripe-signature");

    if (signature && webhookSecret) {
      const rawBody = await req.text();
      try {
        event = await stripe.webhooks.constructEventAsync(
          rawBody, signature, webhookSecret, undefined,
          Stripe.createSubtleCryptoProvider()
        );
      } catch (err) {
        log("SIGNATURE VERIFICATION FAILED", { error: String(err) });
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      log("Stripe signature verified ✅", { type: event.type });
    } else {
      log("WARNING: No webhook secret or signature — rejecting");
      return new Response(JSON.stringify({ error: "Missing signature or secret" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── CHECKOUT COMPLETED ───
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerEmail = session.customer_email || session.customer_details?.email;
      const subscriptionId = session.subscription as string | null;

      log("Checkout completed", { customerEmail, subscriptionId, amount: session.amount_total });

      if (customerEmail) {
        // Find user by email
        const { data: userData } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .ilike("email", customerEmail)
          .maybeSingle();

        // Also try auth.users
        let userId = userData?.user_id;
        if (!userId) {
          const { data: authUser } = await supabase.rpc("get_user_id_by_email", { _email: customerEmail });
          userId = authUser;
        }

        if (userId && session.amount_total) {
          const amount = session.amount_total / 100;

          // Determine plan name from subscription
          let planName = "Assinatura";
          if (subscriptionId) {
            try {
              const sub = await stripe.subscriptions.retrieve(subscriptionId);
              const productId = sub.items.data[0]?.price?.product as string;
              planName = `Plano ${PRODUCT_TIERS[productId] || "Premium"}`;
            } catch (_) { /* ignore */ }
          }

          // Create payment record
          await supabase.from("payments").insert({
            user_id: userId,
            gateway: "stripe",
            gateway_payment_id: session.id,
            amount,
            currency: "BRL",
            status: "paid",
            paid_at: new Date().toISOString(),
            metadata: {
              plan_name: planName,
              subscription_id: subscriptionId,
              checkout_session_id: session.id,
            },
          });

          // Create financial transaction for the nutritionist
          // The user paying IS the professional in this case
          await supabase.from("financial_transactions").insert({
            nutritionist_id: userId,
            type: "income",
            description: `${planName} - Stripe`,
            amount,
            date: new Date().toISOString().split("T")[0],
            status: "paid",
            category: "assinatura",
          });

          log("Payment + financial transaction created", { userId, amount, planName });
        }
      }
    }

    // ─── INVOICE PAID (recurring payments) ───
    if (event.type === "invoice.paid") {
      const invoice = event.data.object as Stripe.Invoice;
      const customerEmail = invoice.customer_email;
      const amount = (invoice.amount_paid || 0) / 100;
      const subscriptionId = invoice.subscription as string | null;

      log("Invoice paid", { customerEmail, amount, subscriptionId });

      if (customerEmail && amount > 0) {
        // Don't double-count the first invoice (already handled by checkout.session.completed)
        // Check billing_reason: 'subscription_cycle' = recurring, 'subscription_create' = first
        const billingReason = (invoice as any).billing_reason;
        
        if (billingReason === "subscription_cycle") {
          // Find user
          const { data: users } = await supabase
            .rpc("get_patient_emails", { _patient_ids: [] });
          
          // Use auth lookup
          let userId: string | null = null;
          const { data: profileData } = await supabase
            .from("profiles")
            .select("user_id")
            .ilike("email", customerEmail)
            .maybeSingle();
          
          userId = profileData?.user_id || null;

          if (userId) {
            let planName = "Assinatura";
            if (subscriptionId) {
              try {
                const sub = await stripe.subscriptions.retrieve(subscriptionId);
                const productId = sub.items.data[0]?.price?.product as string;
                planName = `Plano ${PRODUCT_TIERS[productId] || "Premium"}`;
              } catch (_) { /* ignore */ }
            }

            // Check duplicate by gateway_payment_id
            const { data: existing } = await supabase
              .from("payments")
              .select("id")
              .eq("gateway_payment_id", invoice.id)
              .maybeSingle();

            if (!existing) {
              await supabase.from("payments").insert({
                user_id: userId,
                gateway: "stripe",
                gateway_payment_id: invoice.id,
                amount,
                currency: "BRL",
                status: "paid",
                paid_at: new Date().toISOString(),
                metadata: {
                  plan_name: planName,
                  subscription_id: subscriptionId,
                  billing_reason: billingReason,
                },
              });

              await supabase.from("financial_transactions").insert({
                nutritionist_id: userId,
                type: "income",
                description: `${planName} - Renovação Stripe`,
                amount,
                date: new Date().toISOString().split("T")[0],
                status: "paid",
                category: "assinatura",
              });

              log("Recurring payment recorded", { userId, amount, planName });
            } else {
              log("Duplicate invoice skipped", { invoiceId: invoice.id });
            }
          }
        }
      }

      // Forward to affiliate webhook for commission processing
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        await fetch(`${supabaseUrl}/functions/v1/affiliate-webhook`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            event_type: "invoice.paid",
            invoice_id: invoice.id,
            subscription_id: subscriptionId,
            customer_email: customerEmail,
            amount,
          }),
        });
        log("Forwarded to affiliate webhook");
      } catch (e) {
        log("Failed to forward to affiliate webhook", { error: String(e) });
      }
    }

    // ─── SUBSCRIPTION UPDATED ───
    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      log("Subscription updated", {
        subscriptionId: subscription.id,
        status: subscription.status,
      });

      // Get customer email
      let customerEmail: string | undefined;
      try {
        const customer = await stripe.customers.retrieve(customerId);
        if (customer && !customer.deleted) {
          customerEmail = (customer as Stripe.Customer).email || undefined;
        }
      } catch (_) { /* ignore */ }

      if (customerEmail) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("user_id")
          .ilike("email", customerEmail)
          .maybeSingle();

        if (profileData?.user_id) {
          const productId = subscription.items.data[0]?.price?.product as string;
          const planName = PRODUCT_TIERS[productId] || "Premium";

          // Create notification for user about plan change
          await supabase.from("notifications").insert({
            user_id: profileData.user_id,
            title: "📋 Plano atualizado",
            message: `Seu plano foi atualizado para ${planName}. Status: ${subscription.status}.`,
            type: "subscription",
            action_url: "/settings",
          });

          log("User notified of plan update", { userId: profileData.user_id, planName });
        }
      }
    }

    // ─── SUBSCRIPTION DELETED ───
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      let customerEmail: string | undefined;
      try {
        const customer = await stripe.customers.retrieve(customerId);
        if (customer && !customer.deleted) {
          customerEmail = (customer as Stripe.Customer).email || undefined;
        }
      } catch (_) { /* ignore */ }

      log("Subscription deleted", { customerEmail });

      if (customerEmail) {
        // Forward to affiliate webhook
        try {
          const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
          const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
          await fetch(`${supabaseUrl}/functions/v1/affiliate-webhook`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({
              event_type: "customer.subscription.deleted",
              customer_email: customerEmail,
            }),
          });
        } catch (_) { /* ignore */ }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    log("ERROR", { message: String(error) });
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
