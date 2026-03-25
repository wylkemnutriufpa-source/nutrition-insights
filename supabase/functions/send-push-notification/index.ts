import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VAPID_PUBLIC_KEY = "BEvGFMB5dpy0wBBOKQhwOY_duamSBsGsu0CTVhu9W6IoEzmxI2BFbZR8c0Q6T5wEwiqT7kHdKwXNSiUlYYQ745s";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = "mailto:contato@fitjourney.app";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const { user_id, title, body, url, tag, skip_inapp } = await req.json();

    if (!user_id || !title) {
      return new Response(JSON.stringify({ error: "user_id and title required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all push subscriptions for this user
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", user_id);

    if (subError) throw subError;

    const payload = JSON.stringify({
      title,
      body: body || "",
      url: url || "/",
      tag: tag || "fitjourney-notification",
      icon: "/pwa-192x192.png",
    });

    const results = { sent: 0, failed: 0, expired: 0 };

    for (const sub of subscriptions || []) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
        results.sent++;
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Subscription expired — clean up
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", sub.endpoint);
          results.expired++;
        } else {
          console.error(`Push failed for ${sub.endpoint}:`, err.message);
          results.failed++;
        }
      }
    }

    // Only store as in-app notification if NOT called from DB trigger (avoid duplicates)
    if (!skip_inapp) {
      await supabase.from("notifications").insert({
        user_id,
        title,
        message: body || "",
        type: "push",
        action_url: url || null,
      });
    }

    return new Response(JSON.stringify({ success: true, ...results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[SEND-PUSH] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
