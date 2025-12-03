import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast, toastRememberGlobally } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
}

type MemoryType = "preference" | "goal" | "health" | "biographical_fact" | "routine" | "procedural_memory" | "relationship";

interface PreferenceClassification {
  memory_type: MemoryType | "ephemeral" | "irrelevant";
  is_global_candidate: boolean;
  short_summary: string;
  reason: string;
  confidence: number;
}

interface VerificationResult {
  verified: boolean;
  adjusted_memory_type: MemoryType | null;
  adjusted_summary: string;
  verification_explanation: string;
  conflicts_detected: string[];
}

const Index = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: "assistant",
      content: "Hi! Tell me about yourself and I can remember things about you globally.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isClassifying, setIsClassifying] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [pendingMemory, setPendingMemory] = useState<PreferenceClassification | null>(null);

  useEffect(() => {
    const initSession = async () => {
      const { data, error } = await supabase.from("sessions").insert({}).select().single();
      if (error) {
        console.error("Failed to create session", error);
        toast({
          title: "Session initialization failed",
          description: "Could not create a session for memory tracking.",
          variant: "destructive",
        });
      } else {
        setSessionId(data.id);
      }
    };
    initSession();
  }, []);

  const classifyPreference = async (text: string): Promise<PreferenceClassification | null> => {
    try {
      setIsClassifying(true);
      const { data, error } = await supabase.functions.invoke<PreferenceClassification | { error: string }>(
        "preference-classifier",
        {
          body: { message: text },
        },
      );

      setIsClassifying(false);

      if (error) {
        console.error("preference-classifier error", error);
        const message = (error as any).message ?? "Failed to classify preference";
        toast({
          title: "Classification failed",
          description: message,
          variant: "destructive",
        });
        return null;
      }

      if (data && "error" in data && typeof data.error === "string") {
        toast({
          title: "Classification issue",
          description: data.error,
          variant: "destructive",
        });
        return null;
      }

      return data as PreferenceClassification;
    } catch (error) {
      console.error("preference-classifier exception", error);
      setIsClassifying(false);
      toast({
        title: "Classification failed",
        description: "Something went wrong while talking to the AI backend.",
        variant: "destructive",
      });
      return null;
    }
  };

  const verifyMemory = async (
    classification: PreferenceClassification,
    existingMemories: Array<{ memory_type: MemoryType; short_summary: string }>,
  ): Promise<VerificationResult | null> => {
    try {
      setIsVerifying(true);
      const { data, error } = await supabase.functions.invoke<VerificationResult | { error: string }>("memory-verifier", {
        body: {
          memory_type: classification.memory_type,
          short_summary: classification.short_summary,
          existing_memories: existingMemories,
        },
      });

      setIsVerifying(false);

      if (error) {
        console.error("memory-verifier error", error);
        const message = (error as any).message ?? "Failed to verify memory";
        toast({
          title: "Verification failed",
          description: message,
          variant: "destructive",
        });
        return null;
      }

      if (data && "error" in data && typeof data.error === "string") {
        toast({
          title: "Verification issue",
          description: data.error,
          variant: "destructive",
        });
        return null;
      }

      return data as VerificationResult;
    } catch (error) {
      console.error("memory-verifier exception", error);
      setIsVerifying(false);
      toast({
        title: "Verification failed",
        description: "Something went wrong while verifying the memory.",
        variant: "destructive",
      });
      return null;
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isClassifying || isVerifying || !sessionId) return;

    const nextId = messages.length ? messages[messages.length - 1]!.id + 1 : 1;

    const userMessage: ChatMessage = {
      id: nextId,
      role: "user",
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    const classification = await classifyPreference(trimmed);

    if (!classification) return;

    if (classification.is_global_candidate && classification.memory_type !== "ephemeral" && classification.memory_type !== "irrelevant") {
      // Fetch existing global memories for conflict detection
      const { data: existingMemories, error: fetchError } = await supabase
        .from("memories")
        .select("memory_type, short_summary")
        .eq("scope", "global");

      if (fetchError) {
        console.error("Failed to fetch existing memories", fetchError);
      }

      const existing = (existingMemories ?? []) as Array<{ memory_type: MemoryType; short_summary: string }>;

      const verification = await verifyMemory(classification, existing);

      if (verification) {
        setPendingMemory(classification);

        const conflictWarning = verification.conflicts_detected.length > 0
          ? `\n\n⚠️ Conflicts detected: ${verification.conflicts_detected.join(", ")}`
          : "";

        const assistantMessage: ChatMessage = {
          id: nextId + 1,
          role: "assistant",
          content: `Memory classified as: **${classification.memory_type}** (confidence: ${classification.confidence.toFixed(2)})
Summary: "${verification.adjusted_summary}"
Verification: ${verification.verification_explanation}
Reason: ${classification.reason}${conflictWarning}

Would you like to remember this globally?`,
        };

        setMessages((prev) => [...prev, assistantMessage]);

        toastRememberGlobally();
      }
    } else {
      const assistantMessage: ChatMessage = {
        id: nextId + 1,
        role: "assistant",
        content: `Classification: ${classification.memory_type} (confidence: ${classification.confidence.toFixed(2)}).
Summary: ${classification.short_summary}.
Reason: ${classification.reason}
${classification.is_global_candidate ? "" : "(Not a global candidate — ephemeral or irrelevant.)"}`,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Prototype</p>
            <h1 className="text-lg font-semibold leading-tight">AI Chat with Global Memory</h1>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="rounded-full border border-border/60 px-3 py-1 text-[10px] text-muted-foreground">
              Minimal brutalist · Lovable AI (cheapest)
            </span>
            {sessionId && (
              <span className="text-[9px] text-muted-foreground/60">
                Session: {sessionId.slice(0, 8)}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="flex flex-1 justify-center px-4 py-4">
        <section
          aria-label="Chat with AI assistant"
          className="flex h-full w-full max-w-4xl flex-col rounded-lg border border-border/70 bg-card/60 p-3 sm:p-4"
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-medium">Conversation</h2>
              <p className="text-xs text-muted-foreground">
                Memory types: Preference, Goal, Health, Biographical Fact, Routine, Procedural Memory, Relationship. LLM verifies & detects conflicts.
              </p>
            </div>
            {(isClassifying || isVerifying) && (
              <span className="text-[11px] text-muted-foreground">
                {isClassifying && "Classifying…"}
                {isVerifying && "Verifying…"}
              </span>
            )}
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto rounded-md border border-border/60 bg-background/60 p-3 text-sm">
            {messages.map((message) => (
              <article
                key={message.id}
                className="flex max-w-[80%] flex-col gap-1 rounded-lg border border-border/60 bg-card px-3 py-2 shadow-sm"
              >
                <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  <span
                    className={
                      message.role === "assistant"
                        ? "rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary"
                        : "rounded-full bg-secondary/20 px-2 py-0.5 text-[10px] text-secondary-foreground"
                    }
                  >
                    {message.role === "assistant" ? "Assistant" : "You"}
                  </span>
                </div>
                <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
              </article>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2">
            <label htmlFor="chat-input" className="text-xs font-medium text-muted-foreground">
              Message
            </label>
            <Textarea
              id="chat-input"
              placeholder="For example: I love minimalist design and dark mode."
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="min-h-[80px] resize-none bg-background/80"
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] text-muted-foreground">
                Classification → Verification → Conflict detection. Session-based temporal graph for memory management.
              </p>
              <Button type="submit" size="sm" disabled={!input.trim() || isClassifying || isVerifying || !sessionId}>
                {isClassifying ? "Classifying…" : isVerifying ? "Verifying…" : "Send"}
              </Button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
};

export default Index;
