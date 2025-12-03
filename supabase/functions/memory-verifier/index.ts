import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type MemoryType = "preference" | "goal" | "health" | "biographical_fact" | "routine" | "procedural_memory" | "relationship";

interface VerificationResult {
  verified: boolean;
  adjusted_memory_type: MemoryType | null;
  adjusted_summary: string;
  verification_explanation: string;
  conflicts_detected: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { memory_type, short_summary, existing_memories } = (await req.json()) as {
      memory_type?: MemoryType;
      short_summary?: string;
      existing_memories?: Array<{ memory_type: MemoryType; short_summary: string }>;
    };

    if (!memory_type || !short_summary) {
      return new Response(JSON.stringify({ error: "Missing 'memory_type' or 'short_summary' in request body" }), {
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

    const systemPrompt = `You are a memory verification assistant. Your task is to:
1. Verify that the classified memory type and short summary are accurate.
2. Adjust the memory_type or summary if needed for clarity or accuracy.
3. Detect conflicts with existing memories if provided.
4. Provide a brief explanation of your verification.

Memory types:
- preference: likes/dislikes, style choices
- goal: objectives, aspirations, long-term plans
- health: medical info, allergies, wellness data
- biographical_fact: stable personal info (name, age, location, job, etc.)
- routine: habits, regular activities
- procedural_memory: how-to knowledge, learned skills
- relationship: information about other people or interpersonal connections

Output must be structured JSON.`;

    const userPrompt = `Verify this memory:

Memory type: ${memory_type}
Summary: ${short_summary}

${existing_memories && existing_memories.length > 0 ? `\nExisting memories:\n${existing_memories.map(m => `- [${m.memory_type}] ${m.short_summary}`).join("\n")}` : ""}

Return:
- verified: true/false
- adjusted_memory_type: corrected type if needed, else null
- adjusted_summary: improved summary if needed, else original
- verification_explanation: one-sentence reason for your decision
- conflicts_detected: array of conflicts with existing memories (e.g. ["Conflicts with preference about theme"])`;

    const body: any = {
      model: "google/gemini-2.5-flash-lite",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "verify_memory",
            description: "Verify and adjust a memory classification, detecting conflicts with existing memories.",
            parameters: {
              type: "object",
              properties: {
                verified: {
                  type: "boolean",
                  description: "True if the memory type and summary are accurate and reasonable.",
                },
                adjusted_memory_type: {
                  type: "string",
                  enum: ["preference", "goal", "health", "biographical_fact", "routine", "procedural_memory", "relationship", null],
                  description: "Corrected memory type if the original was wrong, otherwise null.",
                },
                adjusted_summary: {
                  type: "string",
                  description: "Improved or normalized summary; if no changes needed, return the original.",
                },
                verification_explanation: {
                  type: "string",
                  description: "Brief one-sentence explanation of verification outcome.",
                },
                conflicts_detected: {
                  type: "array",
                  items: { type: "string" },
                  description: "List of conflicts detected with existing memories (e.g. 'Conflicts with preference about dark mode').",
                },
              },
              required: ["verified", "adjusted_summary", "verification_explanation", "conflicts_detected"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "verify_memory" } },
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

    let parsed: VerificationResult | null = null;
    try {
      const choice = json.choices?.[0];
      const toolCall = choice?.message?.tool_calls?.[0];
      const args = toolCall?.function?.arguments;
      if (typeof args === "string") {
        parsed = JSON.parse(args) as VerificationResult;
      } else if (args && typeof args === "object") {
        parsed = args as VerificationResult;
      }
    } catch (error) {
      console.error("Failed to parse tool output:", error);
    }

    if (!parsed) {
      console.error("No structured verification returned from AI", json);
      return new Response(JSON.stringify({ error: "Failed to verify memory" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("memory-verifier error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
