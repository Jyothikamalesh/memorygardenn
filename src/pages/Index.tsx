import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast, toastRememberGlobally } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
}

interface PreferenceClassification {
  classification: "preference" | "personal_fact" | "ephemeral" | "irrelevant";
  is_preference: boolean;
  is_personal_fact: boolean;
  is_global_candidate: boolean;
  short_summary: string;
  reason: string;
}

const Index = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: "assistant",
      content: "Hi! Tell me about yourself and I can remember things about you globally.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isClassifying, setIsClassifying] = useState(false);

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
          title: "Preference classification failed",
          description: message,
          variant: "destructive",
        });
        return null;
      }

      if (data && "error" in data && typeof data.error === "string") {
        const statusError = data.error;
        toast({
          title: "Preference classification issue",
          description: statusError,
          variant: "destructive",
        });
        return null;
      }

      return data as PreferenceClassification;
    } catch (error) {
      console.error("preference-classifier exception", error);
      setIsClassifying(false);
      toast({
        title: "Preference classification failed",
        description: "Something went wrong while talking to the AI backend.",
        variant: "destructive",
      });
      return null;
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isClassifying) return;

    const nextId = messages.length ? messages[messages.length - 1]!.id + 1 : 1;

    const userMessage: ChatMessage = {
      id: nextId,
      role: "user",
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    const classification = await classifyPreference(trimmed);

    if (classification?.is_global_candidate) {
      toastRememberGlobally();
    }

    if (classification) {
      const assistantMessage: ChatMessage = {
        id: nextId + 1,
        role: "assistant",
        content: `Classification: ${classification.classification}.\nSummary: ${classification.short_summary}.\nReason: ${classification.reason}`,
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
          <span className="rounded-full border border-border/60 px-3 py-1 text-xs text-muted-foreground">
            Minimal brutalist UI · Lovable AI (cheapest model) for prefs
          </span>
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
                Tell me about your preferences or long-term facts. I&apos;ll classify them and ask to remember good global
                candidates.
              </p>
            </div>
            {isClassifying && (
              <span className="text-[11px] text-muted-foreground">Classifying preference with Lovable AI…</span>
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
              placeholder="For example: I prefer dark mode and short answers."
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="min-h-[80px] resize-none bg-background/80"
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] text-muted-foreground">
                Uses Lovable AI with the cheapest model for preference classification. Global storage comes next.
              </p>
              <Button type="submit" size="sm" disabled={!input.trim() || isClassifying}>
                {isClassifying ? "Classifying…" : "Send"}
              </Button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
};

export default Index;
