import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toastRememberGlobally } from "@/components/ui/use-toast";

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
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

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    const nextId = messages.length ? messages[messages.length - 1]!.id + 1 : 1;

    const userMessage: ChatMessage = {
      id: nextId,
      role: "user",
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);

    // Very simple heuristic: if user talks about themselves, show the global memory toast
    if (/\b(i|me|my|mine|myself)\b/i.test(trimmed)) {
      toastRememberGlobally();
    }

    // Placeholder assistant reply for now
    const assistantMessage: ChatMessage = {
      id: nextId + 1,
      role: "assistant",
      content: "Got it. I will soon use Lovable AI to respond and remember this when you approve.",
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setInput("");
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
            Powered by Lovable AI (cheapest model, coming soon)
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
                Type something about yourself. When it looks like a stable preference or fact, I&apos;ll ask to remember it globally.
              </p>
            </div>
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
                This is a local prototype. Global memory and AI responses will be wired to Lovable Cloud next.
              </p>
              <Button type="submit" size="sm" disabled={!input.trim()}>
                Send
              </Button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
};

export default Index;
