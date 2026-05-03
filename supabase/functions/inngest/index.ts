import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { serve as serveInngest } from "https://esm.sh/inngest@3.16.0/deno";
import { inngest } from "./client.ts";
import { processMealPlanJob } from "./functions.ts";

const handler = serveInngest({
  client: inngest,
  functions: [processMealPlanJob],
});

serve(handler);
