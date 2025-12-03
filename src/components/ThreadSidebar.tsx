import { useEffect, useState } from "react";
import { MessageSquare, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

interface Thread {
  id: string;
  created_at: string;
  last_active_at: string;
  title?: string | null;
}

interface ThreadSidebarProps {
  user: User | null;
  currentThreadId: string | null;
  onThreadSelect: (threadId: string) => void;
  onThreadDelete?: (threadId: string) => void;
}

export function ThreadSidebar({ user, currentThreadId, onThreadSelect, onThreadDelete }: ThreadSidebarProps) {
  const { open } = useSidebar();
  const [threads, setThreads] = useState<Thread[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchThreads = async () => {
      const { data, error } = await (supabase
        .from("sessions") as any)
        .select("id, created_at, last_active_at, title")
        .eq("user_id", user.id)
        .order("last_active_at", { ascending: false });

      if (error) {
        console.error("Failed to fetch threads:", error);
      } else if (data) {
        setThreads(data);
      }
    };

    fetchThreads();
  }, [user, currentThreadId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <Sidebar collapsible="icon">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className={`font-semibold ${!open ? "hidden" : ""}`}>Threads</h2>
        <SidebarTrigger />
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Your Conversations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {threads.map((thread) => (
                <SidebarMenuItem key={thread.id}>
                  <SidebarMenuButton
                    onClick={() => onThreadSelect(thread.id)}
                    isActive={thread.id === currentThreadId}
                    className="hover:bg-accent"
                  >
                    <MessageSquare className="h-4 w-4" />
                    {open && (
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="flex flex-col items-start flex-1 min-w-0">
                          <span className="text-sm truncate w-full">
                            {thread.title ? thread.title : `Thread ${thread.id.slice(0, 8)}`}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(thread.last_active_at)}
                          </span>
                        </div>
                        {onThreadDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              onThreadDelete(thread.id);
                            }}
                            aria-label="Delete thread"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              
              {threads.length === 0 && (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  No threads yet
                </div>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
