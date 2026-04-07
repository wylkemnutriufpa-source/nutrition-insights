import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PaymentRequest {
  plan_id: string;
  plan_slug: string;
  gateway: "stripe" | "mercado_pago" | "pagseguro" | "pix";
  billing_cycle: "monthly" | "yearly";
  amount: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const body: PaymentRequest = await req.json();
    const { plan_id, plan_slug, gateway, billing_cycle, amount } = body;

    // Resolve tenant_id for this user
    const serviceSupabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: tenantId } = await serviceSupabase.rpc("get_user_tenant", { _user_id: user.id });

    // Buscar plano
    const { data: plan, error: planError } = await supabase
      .from("pricing_plans")
      .select("*")
      .eq("id", plan_id)
      .single();

    if (planError || !plan) {
      throw new Error("Plan not found");
    }

    // Criar registro de pagamento pendente
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        user_id: user.id,
        gateway,
        amount,
        currency: "BRL",
        status: "pending",
        metadata: {
          plan_id,
          plan_slug,
          billing_cycle,
          plan_name: plan.name,
        },
        ...(tenantId ? { tenant_id: tenantId } : {}),
      })
      .select()
      .single();

    if (paymentError) {
      console.error("Payment insert error:", paymentError);
      throw new Error("Failed to create payment record");
    }

    // Processar conforme gateway selecionado
    let result: Record<string, unknown> = {};

    switch (gateway) {
      case "stripe": {
        const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
        if (!stripeKey) {
          result = {
            status: "gateway_not_configured",
            message: "Stripe não está configurado. Configure a chave secreta para usar este gateway.",
            payment_id: payment.id,
          };
        } else {
          const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${stripeKey}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              "mode": "subscription",
              "success_url": `${req.headers.get("origin")}/settings?payment=success`,
              "cancel_url": `${req.headers.get("origin")}/pricing?payment=cancelled`,
              "customer_email": user.email || "",
              "line_items[0][price_data][currency]": "brl",
              "line_items[0][price_data][product_data][name]": plan.name,
              "line_items[0][price_data][unit_amount]": String(Math.round(amount * 100)),
              "line_items[0][price_data][recurring][interval]": billing_cycle === "yearly" ? "year" : "month",
              "line_items[0][quantity]": "1",
              "metadata[payment_id]": payment.id,
              "metadata[user_id]": user.id,
            }),
          });

          const session = await stripeResponse.json();
          
          if (session.url) {
            await supabase
              .from("payments")
              .update({ gateway_payment_id: session.id })
              .eq("id", payment.id);

            result = { checkout_url: session.url };
          } else {
            result = { 
              status: "error", 
              message: session.error?.message || "Erro ao criar sessão de pagamento" 
            };
          }
        }
        break;
      }

      case "mercado_pago": {
        const mpAccessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
        if (!mpAccessToken) {
          result = {
            status: "gateway_not_configured",
            message: "Mercado Pago não está configurado. Configure o Access Token para usar este gateway.",
            payment_id: payment.id,
          };
        } else {
          const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${mpAccessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              items: [{
                title: plan.name,
                quantity: 1,
                currency_id: "BRL",
                unit_price: Number(amount),
              }],
              payer: { email: user.email },
              back_urls: {
                success: `${req.headers.get("origin")}/obrigado`,
                failure: `${req.headers.get("origin")}/pricing?payment=failed`,
                pending: `${req.headers.get("origin")}/pricing?payment=pending`,
              },
              auto_return: "approved",
              external_reference: payment.id,
              metadata: {
                payment_id: payment.id,
                user_id: user.id,
                plan_id: plan_id,
              },
            }),
          });

          const preference = await mpResponse.json();
          
          if (preference.init_point) {
            await supabase
              .from("payments")
              .update({ gateway_payment_id: preference.id })
              .eq("id", payment.id);

            result = { checkout_url: preference.init_point };
          } else {
            result = { 
              status: "error", 
              message: preference.message || "Erro ao criar preferência de pagamento" 
            };
          }
        }
        break;
      }

      case "pagseguro": {
        const pagseguroToken = Deno.env.get("PAGSEGURO_TOKEN");
        if (!pagseguroToken) {
          result = {
            status: "gateway_not_configured",
            message: "PagSeguro não está configurado. Configure o Token para usar este gateway.",
            payment_id: payment.id,
          };
        } else {
          result = {
            status: "gateway_pending_integration",
            message: "PagSeguro será integrado em breve. Use PIX ou outro gateway por enquanto.",
            payment_id: payment.id,
          };
        }
        break;
      }

      case "pix": {
        const mpAccessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
        
        if (mpAccessToken) {
          const pixResponse = await fetch("https://api.mercadopago.com/v1/payments", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${mpAccessToken}`,
              "Content-Type": "application/json",
              "X-Idempotency-Key": payment.id,
            },
            body: JSON.stringify({
              transaction_amount: Number(amount),
              description: `Assinatura ${plan.name}`,
              payment_method_id: "pix",
              payer: {
                email: user.email,
              },
              external_reference: payment.id,
            }),
          });

          const pixData = await pixResponse.json();
          
          if (pixData.point_of_interaction?.transaction_data?.qr_code) {
            await supabase
              .from("payments")
              .update({ 
                gateway_payment_id: String(pixData.id),
                metadata: {
                  ...payment.metadata,
                  pix_qr_code: pixData.point_of_interaction.transaction_data.qr_code,
                  pix_qr_code_base64: pixData.point_of_interaction.transaction_data.qr_code_base64,
                }
              })
              .eq("id", payment.id);

            result = {
              pix_code: pixData.point_of_interaction.transaction_data.qr_code,
              pix_qr_base64: pixData.point_of_interaction.transaction_data.qr_code_base64,
              payment_id: payment.id,
              expires_at: pixData.date_of_expiration,
            };
          } else {
            result = { 
              status: "error", 
              message: pixData.message || "Erro ao gerar PIX" 
            };
          }
        } else {
          result = {
            status: "manual_pix",
            message: "Configure o Mercado Pago para PIX automático. Por enquanto, entre em contato para pagamento manual.",
            payment_id: payment.id,
            pix_key: "contato@fitjourney.app",
            amount: amount,
            plan_name: plan.name,
          };
        }
        break;
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Payment processing error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
