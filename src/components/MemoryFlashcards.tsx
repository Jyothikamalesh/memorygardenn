import { Card } from "@/components/ui/card";

interface MemorySummary {
  id: string;
  memory_type: string;
  short_summary: string;
  scope: "global" | "session";
  confidence: number | null;
}

interface MemoryFlashcardsProps {
  threadMemories: MemorySummary[];
  globalMemories: MemorySummary[];
}

export const MemoryFlashcards = ({
  threadMemories,
  globalMemories,
}: MemoryFlashcardsProps) => {
  if (threadMemories.length === 0 && globalMemories.length === 0) {
    return null;
  }

  const renderList = (memories: MemorySummary[]) => (
    <div className="grid gap-2 sm:grid-cols-2">
      {memories.map((memory) => (
        <Card
          key={memory.id}
          className="border border-border/70 bg-background/80 p-3 text-xs"
        >
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              {memory.scope === "global" ? "Global memory" : "Thread memory"}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {memory.memory_type}
              {memory.confidence != null
                ? ` · ${(Number(memory.confidence) || 0).toFixed(2)}`
                : ""}
            </span>
          </div>
          <p className="text-[11px] leading-snug text-foreground">
            {memory.short_summary}
          </p>
        </Card>
      ))}
    </div>
  );

  return (
    <section
      aria-label="Stored memories"
      className="mt-3 space-y-3 rounded-md border border-border/60 bg-card/60 p-3 text-xs"
    >
      <header className="flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Stored memories
        </h3>
        <p className="text-[10px] text-muted-foreground">
          Global memories persist, thread memories stay in this conversation.
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        {globalMemories.length > 0 && (
          <div className="space-y-1">
            <p className="text-[11px] font-medium text-muted-foreground">
              Global memories
            </p>
            {renderList(globalMemories)}
          </div>
        )}

        {threadMemories.length > 0 && (
          <div className="space-y-1">
            <p className="text-[11px] font-medium text-muted-foreground">
              Thread memories
            </p>
            {renderList(threadMemories)}
          </div>
        )}
      </div>
    </section>
  );
};
