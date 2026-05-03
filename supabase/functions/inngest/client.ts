import { Inngest } from "https://esm.sh/inngest@3.16.0";

export const inngest = new Inngest({ 
  id: "fitjourney-app",
  eventKey: Deno.env.get("INNGEST_EVENT_KEY"),
});
