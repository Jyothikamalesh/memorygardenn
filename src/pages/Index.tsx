import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast, toastRememberGlobally } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  classification?: PreferenceClassification;
  verification?: VerificationResult | null;
  memoryScope?: "global" | "session" | "none";
}

 type MemoryType =
  | "preference"
  | "goal"
  | "health"
  | "biographical_fact"
  | "routine"
  | "procedural_memory"
  | "relationship";

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
  const [isChatting, setIsChatting] = useState(false);
  const [isClassifying, setIsClassifying] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

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

  const persistMemory = async (
    classification: PreferenceClassification,
    verification: VerificationResult,
    userMessage: string
  ) => {
    if (!sessionId) {
      toast({
        title: "Cannot save memory",
        description: "No active session",
        variant: "destructive",
      });
      return;
    }

    // Use adjusted type if provided, otherwise use original (but only if it's a valid memory type)
    const finalType: MemoryType = 
      verification.adjusted_memory_type ?? 
      (classification.memory_type as MemoryType);
    
    const finalSummary = verification.adjusted_summary;

    const { error } = await supabase.from("memories").insert({
      session_id: sessionId,
      memory_type: finalType,
      scope: "global",
      content: userMessage,
      short_summary: finalSummary,
      confidence: classification.confidence,
      verified: verification.verified,
      verification_prompt: `Type: ${classification.memory_type}, Summary: ${classification.short_summary}`,
      verification_response: verification.verification_explanation,
    });

    if (error) {
      console.error("Failed to persist memory", error);
      toast({
        title: "Failed to save memory",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Memory saved",
        description: `Remembered: ${finalSummary}`,
      });
    }
  };

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
      console.log("verifyMemory called with:", { classification, existingMemories });
      setIsVerifying(true);
      
      console.log("Calling memory-verifier function...");
      
      // Add timeout to prevent hanging forever
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Memory verification timed out after 30 seconds")), 30000)
      );
      
      const invokePromise = supabase.functions.invoke<VerificationResult | { error: string }>("memory-verifier", {
        body: {
          memory_type: classification.memory_type,
          short_summary: classification.short_summary,
          existing_memories: existingMemories,
        },
      });
      
      const { data, error } = await Promise.race([invokePromise, timeoutPromise]) as any;

      console.log("memory-verifier response:", { data, error });
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

  const runClassificationFlow = async (userText: string, messageId: number) => {
    const classification = await classifyPreference(userText);

    if (!classification) return;

    console.log("Classification result:", classification);

    const attachMeta = (updates: {
      classification?: PreferenceClassification;
      verification?: VerificationResult | null;
      memoryScope?: "global" | "session" | "none";
    }) => {
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, ...updates } : m)));
    };

    if (
      classification.is_global_candidate &&
      classification.memory_type !== "ephemeral" &&
      classification.memory_type !== "irrelevant"
    ) {
      console.log("This is a global candidate, fetching existing memories...");

      const { data: existingMemories, error: fetchError } = await supabase
        .from("memories")
        .select("memory_type, short_summary")
        .eq("scope", "global");

      if (fetchError) {
        console.error("Failed to fetch existing memories", fetchError);
      }

      const existing = (existingMemories ?? []) as Array<{
        memory_type: MemoryType;
        short_summary: string;
      }>;

      console.log("Existing memories:", existing);
      console.log("About to call verifyMemory with:", { classification, existing });

      const verification = await verifyMemory(classification, existing);
      console.log("Verification result:", verification);

      if (verification) {
        const conflictWarning =
          verification.conflicts_detected.length > 0
            ? `⚠️ Conflicts: ${verification.conflicts_detected.join(", ")}`
            : "";

        attachMeta({
          classification,
          verification,
          memoryScope: "global",
        });

        toastRememberGlobally({
          title: "Remember this globally?",
          description: `[${classification.memory_type}] ${verification.adjusted_summary}${
            conflictWarning ? ` — ${conflictWarning}` : ""
          }`,
          duration: 15000,
          action: (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  persistMemory(classification, verification, userText);
                }}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                Yes
              </button>
              <button
                onClick={() => {
                  toast({
                    title: "Memory not saved",
                    description: "You chose not to remember this.",
                  });
                }}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
              >
                No
              </button>
            </div>
          ),
        });
      }
    } else if (
      !classification.is_global_candidate &&
      classification.memory_type !== "ephemeral" &&
      classification.memory_type !== "irrelevant"
    ) {
      console.log("This is a session-specific memory, storing without verification...");

      const { error } = await supabase.from("memories").insert({
        session_id: sessionId,
        memory_type: classification.memory_type as MemoryType,
        scope: "session",
        content: userText,
        short_summary: classification.short_summary,
        confidence: classification.confidence,
        verified: false,
        verification_prompt: null,
        verification_response: null,
      });

      if (error) {
        console.error("Failed to store session memory", error);
        toast({
          title: "Failed to store session memory",
          description: error.message,
          variant: "destructive",
        });
      } else {
        attachMeta({
          classification,
          verification: null,
          memoryScope: "session",
        });

        toast({
          title: "Thread memory stored",
          description: `[${classification.memory_type}] ${classification.short_summary}`,
        });
      }
    } else {
      const notWorthyReason =
        classification.memory_type === "ephemeral"
          ? "This is temporary information that doesn't need long-term storage."
          : classification.memory_type === "irrelevant"
          ? "This doesn't contain information worth remembering."
          : "This is session-only information, not a global candidate.";

      console.log("Not remembrance-worthy", {
        classification,
        reason: notWorthyReason,
      });

      attachMeta({
        classification,
        verification: null,
        memoryScope: "none",
      });
    }
  };

  const askAssistant = async (
    conversation: { role: "user" | "assistant"; content: string }[],
    assistantId: number,
  ) => {
    try {
      setIsChatting(true);

      const { data, error } = await supabase.functions.invoke<{
        content?: string;
        error?: string;
        code?: number;
      }>("chat", {
        body: { messages: conversation },
      });

      if (error || !data || !data.content) {
        const message =
          (data && data.error) ||
          ((error as any)?.message as string) ||
          "Failed to get AI response.";

        toast({
          title: "Assistant error",
          description: message,
          variant: "destructive",
        });
        return;
      }

      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: data.content,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("chat function exception", error);
      toast({
        title: "Assistant error",
        description: "Something went wrong while talking to the AI assistant.",
        variant: "destructive",
      });
    } finally {
      setIsChatting(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isChatting || !sessionId) return;

    const nextId = messages.length ? messages[messages.length - 1]!.id + 1 : 1;

    const userMessage: ChatMessage = {
      id: nextId,
      role: "user",
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    void runClassificationFlow(trimmed, nextId);

    const conversation = [...messages, userMessage].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    await askAssistant(conversation, nextId + 1);
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

                  {message.role === "user" && message.classification && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="rounded-full border border-border/60 px-2 py-0.5 text-[9px] lowercase text-muted-foreground">
                          {message.memoryScope === "global"
                            ? `global · ${message.classification.memory_type}`
                            : message.memoryScope === "session"
                            ? `session · ${message.classification.memory_type}`
                            : message.classification.memory_type}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" align="start" className="max-w-xs text-left">
                        <p className="mb-1 text-[11px] font-semibold">Memory classification</p>
                        <p className="text-[11px]">
                          <span className="font-medium">Type:</span> {message.classification.memory_type}
                        </p>
                        {message.memoryScope && (
                          <p className="text-[11px]">
                            <span className="font-medium">Scope:</span> {message.memoryScope}
                          </p>
                        )}
                        <p className="mt-1 text-[11px]">
                          <span className="font-medium">Summary:</span> {message.classification.short_summary}
                        </p>
                        <p className="text-[11px]">
                          <span className="font-medium">Confidence:</span>{" "}
                          {message.classification.confidence.toFixed(2)}
                        </p>
                        <p className="mt-1 text-[11px]">
                          <span className="font-medium">Reason:</span> {message.classification.reason}
                        </p>
                        {message.verification && (
                          <>
                            <p className="mt-1 text-[11px]">
                              <span className="font-medium">Verification:</span>{" "}
                              {message.verification.verification_explanation}
                            </p>
                            {message.verification.conflicts_detected.length > 0 && (
                              <p className="text-[11px]">
                                <span className="font-medium">Conflicts:</span>{" "}
                                {message.verification.conflicts_detected.join(", ")}
                              </p>
                            )}
                          </>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  )}
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
                 Classification → Verification → Conflict detection runs in the background. Hover your messages to see memory details.
               </p>
               <Button type="submit" size="sm" disabled={!input.trim() || isChatting || !sessionId}>
                 {isChatting ? "Sending…" : "Send"}
               </Button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
};

export default Index;
