import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type MemoryType = "preference" | "goal" | "health" | "biographical_fact" | "routine" | "procedural_memory" | "relationship";

interface PreferenceClassification {
  memory_type: MemoryType | "ephemeral" | "irrelevant";
  is_global_candidate: boolean;
  short_summary: string;
  reason: string;
  confidence: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message } = (await req.json()) as { message?: string };

    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "Missing 'message' in request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(JSON.stringify({ error: "AI backend not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: any = {
      model: "google/gemini-2.5-flash-lite",
      messages: [
        {
          role: "system",
          content:
            "You classify user messages into structured memories for a chat assistant that can remember things globally. " +
            "Treat future appointments, reminders, and tasks (for example, 'remind me about my dentist appointment next week') as 'goal' memories and usually set is_global_candidate to true unless they are clearly limited to the current conversation. " +
            "Long-term preferences, recurring routines, and important personal facts should also be global candidates, while short-lived or trivial details should be classified as 'ephemeral' or 'irrelevant' with is_global_candidate set to false.",
        },
        {
          role: "user",
          content:
            "Classify this message from a user so we know whether to remember it globally as a preference or fact:\n\n" +
            message,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "classify_memory",
            description:
              "Classify a user message into one of the memory types for long-term recall and session management.",
            parameters: {
              type: "object",
              properties: {
                memory_type: {
                  type: "string",
                  enum: [
                    "preference",
                    "goal",
                    "health",
                    "biographical_fact",
                    "routine",
                    "procedural_memory",
                    "relationship",
                    "ephemeral",
                    "irrelevant"
                  ],
                  description:
                    "Type of memory: preference (likes/dislikes), goal (objectives), health (medical info), biographical_fact (stable personal info), routine (habits), procedural_memory (how-to knowledge), relationship (info about others), ephemeral (temporary), irrelevant (not worth remembering).",
                },
                is_global_candidate: {
                  type: "boolean",
                  description:
                    "True if this memory should persist across sessions globally; false if it is session-only or ephemeral.",
                },
                short_summary: {
                  type: "string",
                  description:
                    "Very short normalized summary of what should be remembered (e.g. 'User prefers minimalist design and dark mode').",
                },
                reason: {
                  type: "string",
                  description:
                    "One-sentence explanation of why this was classified as this memory_type and scope.",
                },
                confidence: {
                  type: "number",
                  description:
                    "A confidence score between 0 and 1 indicating how certain the classification is (e.g. 0.95 for very certain).",
                  minimum: 0,
                  maximum: 1,
                },
              },
              required: [
                "memory_type",
                "is_global_candidate",
                "short_summary",
                "reason",
                "confidence",
              ],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "classify_memory" } },
    };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await response.json();

    let parsed: PreferenceClassification | null = null;
    try {
      const choice = json.choices?.[0];
      const toolCall = choice?.message?.tool_calls?.[0];
      const args = toolCall?.function?.arguments;
      if (typeof args === "string") {
        parsed = JSON.parse(args) as PreferenceClassification;
      } else if (args && typeof args === "object") {
        parsed = args as PreferenceClassification;
      }
    } catch (error) {
      console.error("Failed to parse tool output:", error);
    }

    if (!parsed) {
      console.error("No structured classification returned from AI", json);
      return new Response(JSON.stringify({ error: "Failed to classify preference" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("preference-classifier error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
