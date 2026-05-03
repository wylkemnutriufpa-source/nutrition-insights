import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { serve as serveInngest } from "inngest/deno";
import { inngest } from "./client.ts";
import { processMealPlanJob } from "./functions.ts";

const handler = serveInngest({
  client: inngest,
  functions: [processMealPlanJob],
});

serve(handler);
