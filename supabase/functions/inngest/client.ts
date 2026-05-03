import { Inngest } from "inngest";

export const inngest = new Inngest({ 
  id: "fitjourney-app",
  eventKey: Deno.env.get("INNGEST_EVENT_KEY"),
});
