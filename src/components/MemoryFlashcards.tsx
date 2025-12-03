import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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
  onDeleteMemory: (id: string, scope: "global" | "session") => void;
  onEditMemory: (
    id: string,
    scope: "global" | "session",
    shortSummary: string,
  ) => void;
  onAddMemory: (scope: "global" | "session", shortSummary: string) => void;
}

export const MemoryFlashcards = ({
  threadMemories,
  globalMemories,
  onDeleteMemory,
  onEditMemory,
  onAddMemory,
}: MemoryFlashcardsProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSummary, setEditSummary] = useState("");
  const [newGlobalSummary, setNewGlobalSummary] = useState("");
  const [newThreadSummary, setNewThreadSummary] = useState("");

  const renderList = (memories: MemorySummary[], scope: "global" | "session") => (
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
          {editingId === memory.id ? (
            <>
              <Textarea
                value={editSummary}
                onChange={(event) => setEditSummary(event.target.value)}
                className="mt-1 text-[11px] leading-snug"
                rows={3}
              />
              <div className="mt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingId(null);
                    setEditSummary("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    onEditMemory(memory.id, scope, editSummary);
                    setEditingId(null);
                    setEditSummary("");
                  }}
                >
                  Save
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-[11px] leading-snug text-foreground">
                {memory.short_summary}
              </p>
              <div className="mt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingId(memory.id);
                    setEditSummary(memory.short_summary);
                  }}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onDeleteMemory(memory.id, scope)}
                >
                  Delete
                </Button>
              </div>
            </>
          )}
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
        <div className="space-y-2">
          <p className="text-[11px] font-medium text-muted-foreground">
            Global memories
          </p>
          {globalMemories.length > 0 ? (
            renderList(globalMemories, "global")
          ) : (
            <p className="text-[11px] text-muted-foreground">
              No global memories yet.
            </p>
          )}
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground">
              Add global memory
            </p>
            <Textarea
              value={newGlobalSummary}
              onChange={(event) => setNewGlobalSummary(event.target.value)}
              placeholder="Short description of what should be remembered globally..."
              className="text-[11px]"
              rows={3}
            />
            <div className="flex justify-end">
              <Button
                type="button"
                disabled={!newGlobalSummary.trim()}
                onClick={() => {
                  onAddMemory("global", newGlobalSummary);
                  setNewGlobalSummary("");
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-medium text-muted-foreground">
            Thread memories
          </p>
          {threadMemories.length > 0 ? (
            renderList(threadMemories, "session")
          ) : (
            <p className="text-[11px] text-muted-foreground">
              No thread memories yet.
            </p>
          )}
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground">
              Add thread memory
            </p>
            <Textarea
              value={newThreadSummary}
              onChange={(event) => setNewThreadSummary(event.target.value)}
              placeholder="Short description of what should be remembered in this thread..."
              className="text-[11px]"
              rows={3}
            />
            <div className="flex justify-end">
              <Button
                type="button"
                disabled={!newThreadSummary.trim()}
                onClick={() => {
                  onAddMemory("session", newThreadSummary);
                  setNewThreadSummary("");
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
