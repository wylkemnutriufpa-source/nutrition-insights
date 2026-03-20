import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { patient_id } = await req.json();
    if (!patient_id) {
      return new Response(JSON.stringify({ error: "patient_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Get active clinical flags for this patient
    const { data: flags } = await supabase
      .from("patient_clinical_flags")
      .select("flag_key, confidence")
      .eq("patient_id", patient_id)
      .eq("is_active", true);

    if (!flags || flags.length === 0) {
      return new Response(JSON.stringify({
        tasks_generated: 0,
        messages_generated: 0,
        detail: "No active clinical flags",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const flagKeys = flags.map((f: any) => f.flag_key);

    // 2. Get behavior rules that match these flags
    const { data: rules } = await supabase
      .from("clinical_behavior_rules")
      .select("*")
      .in("trigger_flag", flagKeys)
      .eq("is_active", true)
      .order("priority", { ascending: false });

    if (!rules || rules.length === 0) {
      return new Response(JSON.stringify({
        tasks_generated: 0,
        messages_generated: 0,
        detail: "No matching behavior rules",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 3. Get checklist templates and message templates
    const checklistCodes = rules
      .map((r: any) => r.checklist_template_code)
      .filter(Boolean);
    const messageCodes = rules
      .map((r: any) => r.message_template_code)
      .filter(Boolean);

    const [checklistRes, messageRes, existingTasksRes, existingMsgsRes] = await Promise.all([
      checklistCodes.length > 0
        ? supabase.from("clinical_checklist_templates").select("*").in("template_code", checklistCodes).eq("is_active", true)
        : { data: [] },
      messageCodes.length > 0
        ? supabase.from("clinical_message_templates").select("*").in("message_code", messageCodes).eq("is_active", true)
        : { data: [] },
      // Get existing active tasks to avoid duplicates
      supabase.from("patient_behavioral_tasks").select("template_code, source_flag").eq("patient_id", patient_id).in("status", ["pending", "completed"]),
      // Get existing active messages to avoid duplicates
      supabase.from("patient_clinical_messages").select("message_code, source_flag").eq("patient_id", patient_id).eq("status", "active"),
    ]);

    const checklistMap = new Map(
      (checklistRes.data || []).map((t: any) => [t.template_code, t])
    );
    const messageMap = new Map(
      (messageRes.data || []).map((m: any) => [m.message_code, m])
    );

    const existingTaskKeys = new Set(
      (existingTasksRes.data || []).map((t: any) => `${t.template_code}:${t.source_flag}`)
    );
    const existingMsgKeys = new Set(
      (existingMsgsRes.data || []).map((m: any) => `${m.message_code}:${m.source_flag}`)
    );

    // 4. Generate tasks
    const tasksToInsert: any[] = [];
    const msgsToInsert: any[] = [];

    for (const rule of rules) {
      const flagConf = flags.find((f: any) => f.flag_key === rule.trigger_flag);

      // Generate task from checklist template
      if (rule.checklist_template_code) {
        const tmpl = checklistMap.get(rule.checklist_template_code);
        const key = `${rule.checklist_template_code}:${rule.trigger_flag}`;
        if (tmpl && !existingTaskKeys.has(key)) {
          tasksToInsert.push({
            patient_id,
            source_flag: rule.trigger_flag,
            template_code: rule.checklist_template_code,
            title: tmpl.title,
            description: tmpl.description,
            frequency: rule.frequency || tmpl.frequency || "daily",
            priority: rule.priority || 5,
            status: "pending",
            due_date: new Date().toISOString().split("T")[0],
            generated_by: "rule_engine",
          });
          existingTaskKeys.add(key);
        }
      }

      // Generate message from message template
      if (rule.message_template_code) {
        const tmpl = messageMap.get(rule.message_template_code);
        const key = `${rule.message_template_code}:${rule.trigger_flag}`;
        if (tmpl && !existingMsgKeys.has(key)) {
          msgsToInsert.push({
            patient_id,
            source_flag: rule.trigger_flag,
            message_code: rule.message_template_code,
            channel: tmpl.channel || "dashboard_highlight",
            title: tmpl.title,
            body: tmpl.body,
            priority: rule.priority || 5,
            status: "active",
            generated_by: "rule_engine",
          });
          existingMsgKeys.add(key);
        }
      }
    }

    // 5. Archive tasks/messages for flags that are no longer active
    const { data: staleTasks } = await supabase
      .from("patient_behavioral_tasks")
      .select("id, source_flag")
      .eq("patient_id", patient_id)
      .eq("status", "pending")
      .eq("generated_by", "rule_engine");

    const staleTaskIds = (staleTasks || [])
      .filter((t: any) => t.source_flag && !flagKeys.includes(t.source_flag))
      .map((t: any) => t.id);

    if (staleTaskIds.length > 0) {
      await supabase
        .from("patient_behavioral_tasks")
        .update({ status: "archived", updated_at: new Date().toISOString() })
        .in("id", staleTaskIds);
    }

    const { data: staleMsgs } = await supabase
      .from("patient_clinical_messages")
      .select("id, source_flag")
      .eq("patient_id", patient_id)
      .eq("status", "active")
      .eq("generated_by", "rule_engine");

    const staleMsgIds = (staleMsgs || [])
      .filter((m: any) => m.source_flag && !flagKeys.includes(m.source_flag))
      .map((m: any) => m.id);

    if (staleMsgIds.length > 0) {
      await supabase
        .from("patient_clinical_messages")
        .update({ status: "archived", updated_at: new Date().toISOString() })
        .in("id", staleMsgIds);
    }

    // 6. Insert new tasks and messages
    if (tasksToInsert.length > 0) {
      await supabase.from("patient_behavioral_tasks").insert(tasksToInsert);
    }
    if (msgsToInsert.length > 0) {
      await supabase.from("patient_clinical_messages").insert(msgsToInsert);
    }

    return new Response(JSON.stringify({
      tasks_generated: tasksToInsert.length,
      messages_generated: msgsToInsert.length,
      tasks_archived: staleTaskIds.length,
      messages_archived: staleMsgIds.length,
      flags_evaluated: flagKeys.length,
      rules_matched: rules.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    console.error("Generate behavioral tasks error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
