import { supabase } from "@/integrations/supabase/client";
import { Database, Json } from "@/integrations/supabase/types";

type TimelineEventInsert = Database["public"]["Tables"]["timeline_events"]["Insert"];

export interface TimelineEventPayload {
  workspace_id: string;
  author_id: string;
  target_patient_id?: string;
  event_type: string;
  title: string;
  description?: string;
  media_url?: string;
  metadata_json?: Json;
  visibility_scope?: "global" | "patient_specific";
  poll_question?: string;
  poll_options?: string[];
}

export async function generateTimelineEvent(payload: TimelineEventPayload) {
  const insertPayload: TimelineEventInsert = {
    workspace_id: payload.workspace_id,
    author_id: payload.author_id,
    target_patient_id: payload.target_patient_id || null,
    event_type: payload.event_type,
    title: payload.title,
    description: payload.description || null,
    media_url: payload.media_url || null,
    metadata_json: payload.metadata_json || {},
    visibility_scope: payload.visibility_scope || "global",
    poll_question: payload.poll_question || null,
    poll_options: payload.poll_options || null,
  };

  const { data, error } = await supabase
    .from("timeline_events")
    .insert(insertPayload)
    .select()
    .single();

  if (error) console.error("Timeline event creation failed:", error);
  return data;
}

export async function generateSystemEvent(
  authorId: string,
  workspaceId: string,
  title: string,
  description?: string,
  targetPatientId?: string,
  metadata?: Json
) {
  return generateTimelineEvent({
    workspace_id: workspaceId,
    author_id: authorId,
    target_patient_id: targetPatientId,
    event_type: "system_event",
    title,
    description,
    metadata_json: metadata,
    visibility_scope: targetPatientId ? "patient_specific" : "global",
  });
}

export async function generateAchievementEvent(
  authorId: string,
  workspaceId: string,
  title: string,
  description?: string,
  targetPatientId?: string
) {
  return generateTimelineEvent({
    workspace_id: workspaceId,
    author_id: authorId,
    target_patient_id: targetPatientId,
    event_type: "achievement",
    title,
    description,
    visibility_scope: targetPatientId ? "patient_specific" : "global",
  });
}
