import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireUser, requireRole } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // AUTH GUARD: only admin/nutritionist can execute campaigns
    const caller = await requireUser(req);
    requireRole(caller, "admin", "nutritionist");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { campaign_id, mode = "execute" } = await req.json();

    if (!campaign_id) throw new Error("campaign_id required");

    // Get campaign
    const { data: campaign, error: campErr } = await (supabase as any).from("campaigns").select("*").eq("id", campaign_id).single();
    if (campErr || !campaign) throw new Error("Campaign not found");

    const filters = campaign.filters_json || {};
    const channels = campaign.delivery_channels_json || ["notification"];
    const audienceType = campaign.audience_type || "patients";

    // Resolve audience
    let recipients: { id: string; type: string }[] = [];

    if (audienceType === "patients" || audienceType === "mixed") {
      let q = supabase.from("nutritionist_patients").select("patient_id");
      if (filters.status === "active") q = q.eq("status", "active");
      else if (filters.status === "inactive") q = q.eq("status", "inactive");
      else q = q.eq("status", "active"); // default to active
      const { data } = await q.limit(1000);
      if (data) recipients.push(...data.map((d: any) => ({ id: d.patient_id, type: "patient" })));
    }

    if (audienceType === "professionals" || audienceType === "mixed") {
      const { data } = await supabase.from("profiles").select("id").limit(500);
      if (data) recipients.push(...data.map((d: any) => ({ id: d.id, type: "professional" })));
    }

    // PREVIEW MODE
    if (mode === "preview") {
      const channelBreakdown = channels.map((ch: string) => ({
        channel: ch,
        count: recipients.length,
      }));

      return new Response(JSON.stringify({
        mode: "preview",
        total_recipients: recipients.length,
        by_channel: channelBreakdown,
        audience_type: audienceType,
        filters_applied: filters,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // EXECUTE MODE
    await (supabase as any).from("campaigns").update({ status: "running" }).eq("id", campaign_id);

    let deliveredCount = 0;
    let errorCount = 0;

    for (const recipient of recipients) {
      for (const channel of channels) {
        try {
          // Create delivery record
          await (supabase as any).from("campaign_deliveries").insert({
            campaign_id,
            recipient_id: recipient.id,
            recipient_type: recipient.type,
            channel,
            delivery_status: "sent",
            sent_at: new Date().toISOString(),
          });

          // Send notification
          if (channel === "notification") {
            await supabase.from("notifications").insert({
              user_id: recipient.id,
              title: campaign.title,
              message: campaign.message_body,
              type: "campaign",
            });
          }

          // WhatsApp (via existing integration)
          if (channel === "whatsapp") {
            try {
              const fnUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/whatsapp-send`;
              await fetch(fnUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
                body: JSON.stringify({ patient_id: recipient.id, message: `*${campaign.title}*\n\n${campaign.message_body}` }),
              });
            } catch {
              // WhatsApp is best-effort
            }
          }

          deliveredCount++;
        } catch (err: any) {
          errorCount++;
          await (supabase as any).from("campaign_deliveries").insert({
            campaign_id,
            recipient_id: recipient.id,
            recipient_type: recipient.type,
            channel,
            delivery_status: "failed",
            error_message: err.message?.substring(0, 500),
          });
        }
      }
    }

    // Update campaign status
    await (supabase as any).from("campaigns").update({
      status: errorCount === 0 ? "completed" : "completed",
    }).eq("id", campaign_id);

    return new Response(JSON.stringify({
      mode: "execute",
      campaign_id,
      total_recipients: recipients.length,
      delivered: deliveredCount,
      errors: errorCount,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("Campaign error:", err?.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
