import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast, toastRememberGlobally } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MemoryFlashcards } from "@/components/MemoryFlashcards";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Database, LogOut, Trash2 } from "lucide-react";
import { ThreadSidebar } from "@/components/ThreadSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

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
 
 interface MemorySummary {
   id: string;
   memory_type: MemoryType;
   short_summary: string;
   scope: "global" | "session";
   confidence: number | null;
 }

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
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [threadTitle, setThreadTitle] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: "assistant",
      content: "Hi! Tell me about yourself and I can remember things about you globally.",
    },
  ]);
  const [threadMemories, setThreadMemories] = useState<MemorySummary[]>([]);
  const [globalMemories, setGlobalMemories] = useState<MemorySummary[]>([]);
  
  const [input, setInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const [isClassifying, setIsClassifying] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [memoriesDialogOpen, setMemoriesDialogOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;

    const loadLatestSession = async () => {
      const { data, error } = await (supabase
        .from("sessions") as any)
        .select("id, title")
        .eq("user_id", user.id)
        .order("last_active_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Failed to load existing session", error);
        toast({
          title: "Session load failed",
          description: "Could not load your last conversation.",
          variant: "destructive",
        });
        return;
      }

      if (data) {
        const existingSessionId = (data as any).id as string;
        setSessionId(existingSessionId);
        setThreadTitle(((data as any).title as string | null) ?? null);
        await loadMessagesForSession(existingSessionId, user);
      } else {
        setSessionId(null);
        setThreadTitle(null);
      }
    };

    void loadLatestSession();
  }, [user]);

  const handleNewThread = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("sessions")
      .insert({ user_id: user.id })
      .select()
      .single();
    
    if (error) {
      toast({
        title: "Failed to create new thread",
        description: error.message,
        variant: "destructive",
      });
    } else {
      const greetingMessage =
        "Hi! Tell me about yourself and I can remember things about you globally.";
      
      setSessionId(data.id);
      setThreadTitle(null);
      setMessages([
        {
          id: 1,
          role: "assistant",
          content: greetingMessage,
        },
      ]);
      setThreadMemories([]);

      try {
        await supabase.from("messages").insert({
          user_id: user.id,
          session_id: data.id,
          role: "assistant",
          content: greetingMessage,
        });
      } catch (error) {
        console.error("Failed to store initial assistant message", error);
      }

      toast({
        title: "New thread created",
        description: "Starting fresh conversation",
      });
    }
  };

  const deleteThreadById = async (threadId: string) => {
    if (!user) return;

    const { error: memoriesError } = await supabase
      .from("memories")
      .delete()
      .eq("session_id", threadId)
      .eq("user_id", user.id);

    if (memoriesError) {
      console.error("Failed to delete thread memories", memoriesError);
      toast({
        title: "Failed to delete thread",
        description: memoriesError.message,
        variant: "destructive",
      });
      return;
    }

    const { error: sessionError } = await supabase
      .from("sessions")
      .delete()
      .eq("id", threadId)
      .eq("user_id", user.id);

    if (sessionError) {
      console.error("Failed to delete thread", sessionError);
      toast({
        title: "Failed to delete thread",
        description: sessionError.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Thread deleted",
      description: "The thread and its memories have been removed.",
    });

    if (threadId === sessionId) {
      setSessionId(null);
      setThreadTitle(null);
      setMessages([
        {
          id: 1,
          role: "assistant",
          content: "Hi! Tell me about yourself and I can remember things about you globally.",
        },
      ]);
      setThreadMemories([]);
    }
  };

  const handleDeleteCurrentThread = async () => {
    if (!sessionId) return;
    await deleteThreadById(sessionId);
  };

  const handleThreadDelete = async (threadId: string) => {
    await deleteThreadById(threadId);
  };

  const loadMessagesForSession = async (threadId: string, currentUser: User | null) => {
    if (!currentUser) return;

    const { data, error } = await supabase
      .from("messages")
      .select("role, content, created_at")
      .eq("session_id", threadId)
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to load messages for session", error);
      toast({
        title: "Failed to load conversation",
        description: "Could not load messages for this thread.",
        variant: "destructive",
      });
      return;
    }

    if (!data || data.length === 0) {
      setMessages([
        {
          id: 1,
          role: "assistant",
          content: "Hi! Tell me about yourself and I can remember things about you globally.",
        },
      ]);
      return;
    }

    const mapped: ChatMessage[] = (data as any[]).map((row, index) => ({
      id: index + 1,
      role: row.role,
      content: row.content,
    }));

    setMessages(mapped);
  };

  const handleThreadSelect = async (threadId: string) => {
    if (threadId === sessionId) return;

    setSessionId(threadId);

    // Fetch memories and messages for selected thread
    if (user) {
      const { data: sessionRow } = await (supabase
        .from("sessions") as any)
        .select("title")
        .eq("id", threadId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (sessionRow && (sessionRow as any).title) {
        setThreadTitle((sessionRow as any).title as string);
      } else {
        setThreadTitle(null);
      }

      const { data: sessionMem } = await supabase
        .from("memories")
        .select("*")
        .eq("scope", "session")
        .eq("session_id", threadId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (sessionMem) {
        setThreadMemories(
          sessionMem.map((m) => ({
            id: m.id,
            memory_type: m.memory_type,
            short_summary: m.short_summary,
            scope: m.scope,
            confidence: m.confidence || 0,
          })),
        );
      }

      await loadMessagesForSession(threadId, user);
    }

    toast({
      title: "Thread switched",
      description: `Now viewing thread ${threadId.slice(0, 8)}`,
    });
  };

  useEffect(() => {
    if (!sessionId || !user) return;

    const fetchMemories = async () => {
      const { data: global, error: globalError } = await supabase
        .from("memories")
        .select("id, memory_type, short_summary, scope, confidence")
        .eq("scope", "global")
        .eq("user_id", user.id);

      if (globalError) {
        console.error("Failed to fetch global memories", globalError);
      } else if (global) {
        setGlobalMemories(
          (global as any[]).map((memory) => ({
            id: memory.id,
            memory_type: memory.memory_type as MemoryType,
            short_summary: memory.short_summary,
            scope: memory.scope,
            confidence: memory.confidence,
          })),
        );
      }

      const { data: sessionMemories, error: sessionError } = await supabase
        .from("memories")
        .select("id, memory_type, short_summary, scope, confidence")
        .eq("scope", "session")
        .eq("session_id", sessionId)
        .eq("user_id", user.id);

      if (sessionError) {
        console.error("Failed to fetch session memories", sessionError);
      } else if (sessionMemories) {
        setThreadMemories(
          (sessionMemories as any[]).map((memory) => ({
            id: memory.id,
            memory_type: memory.memory_type as MemoryType,
            short_summary: memory.short_summary,
            scope: memory.scope,
            confidence: memory.confidence,
          })),
        );
      }
    };

    void fetchMemories();
  }, [sessionId, user]);

  const persistMemory = async (
    classification: PreferenceClassification,
    verification: VerificationResult,
    userMessage: string
  ) => {
    if (!sessionId || !user) {
      toast({
        title: "Cannot save memory",
        description: "No active session or user",
        variant: "destructive",
      });
      return;
    }

    // Use adjusted type if provided, otherwise use original (but only if it's a valid memory type)
    const finalType: MemoryType = 
      verification.adjusted_memory_type ?? 
      (classification.memory_type as MemoryType);
    
    const finalSummary = verification.adjusted_summary;

    const { data, error } = await supabase
      .from("memories")
      .insert({
        session_id: sessionId,
        user_id: user.id,
        memory_type: finalType,
        scope: "global",
        content: userMessage,
        short_summary: finalSummary,
        confidence: classification.confidence,
        verified: verification.verified,
        verification_prompt: `Type: ${classification.memory_type}, Summary: ${classification.short_summary}`,
        verification_response: verification.verification_explanation,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to persist memory", error);
      toast({
        title: "Failed to save memory",
        description: error.message,
        variant: "destructive",
      });
    } else if (data) {
      setGlobalMemories((prev) => [
        ...prev,
        {
          id: data.id,
          memory_type: data.memory_type as MemoryType,
          short_summary: data.short_summary,
          scope: data.scope,
          confidence: data.confidence,
        },
      ]);

      toast({
        title: "Memory saved",
        description: `Remembered: ${finalSummary}`,
      });
    }
  };

  const handleDeleteMemory = async (
    id: string,
    scope: "global" | "session",
  ) => {
    if (!user) {
      toast({
        title: "Cannot modify memories",
        description: "You must be logged in to update memories.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("memories")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Failed to delete memory", error);
      toast({
        title: "Failed to delete memory",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    if (scope === "global") {
      setGlobalMemories((prev) => prev.filter((m) => m.id !== id));
    } else {
      setThreadMemories((prev) => prev.filter((m) => m.id !== id));
    }

    toast({
      title: "Memory deleted",
      description: "The memory has been removed.",
    });
  };

  const handleEditMemory = async (
    id: string,
    scope: "global" | "session",
    shortSummary: string,
  ) => {
    if (!user) {
      toast({
        title: "Cannot modify memories",
        description: "You must be logged in to update memories.",
        variant: "destructive",
      });
      return;
    }

    const trimmed = shortSummary.trim();
    if (!trimmed) {
      toast({
        title: "Summary is required",
        description: "Please provide a short summary for the memory.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("memories")
      .update({ short_summary: trimmed })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Failed to update memory", error);
      toast({
        title: "Failed to update memory",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    if (scope === "global") {
      setGlobalMemories((prev) =>
        prev.map((m) => (m.id === id ? { ...m, short_summary: trimmed } : m)),
      );
    } else {
      setThreadMemories((prev) =>
        prev.map((m) => (m.id === id ? { ...m, short_summary: trimmed } : m)),
      );
    }

    toast({
      title: "Memory updated",
      description: "The memory summary has been updated.",
    });
  };

  const handleAddMemory = async (scope: "global" | "session", shortSummary: string) => {
    if (!user || !sessionId) {
      toast({
        title: "Cannot add memory",
        description: "No active session or user.",
        variant: "destructive",
      });
      return;
    }

    const trimmed = shortSummary.trim();
    if (!trimmed) {
      toast({
        title: "Summary is required",
        description: "Please provide a short summary for the memory.",
        variant: "destructive",
      });
      return;
    }

    const { data, error } = await supabase
      .from("memories")
      .insert({
        session_id: sessionId,
        user_id: user.id,
        memory_type: "preference" as MemoryType,
        scope,
        content: trimmed,
        short_summary: trimmed,
        confidence: null,
        verified: false,
        verification_prompt: null,
        verification_response: null,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to add memory", error);
      toast({
        title: "Failed to add memory",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    const newMemory: MemorySummary = {
      id: data.id,
      memory_type: data.memory_type as MemoryType,
      short_summary: data.short_summary,
      scope: data.scope,
      confidence: data.confidence,
    };

    if (scope === "global") {
      setGlobalMemories((prev) => [...prev, newMemory]);
    } else {
      setThreadMemories((prev) => [...prev, newMemory]);
    }

    toast({
      title: "Memory added",
      description: "The memory has been created.",
    });
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

      const message =
        error instanceof Error && error.message.includes("timed out")
          ? "Verifier took too long. Classification is still attached, but conflicts were not checked."
          : "Something went wrong while verifying the memory. Classification is still attached.";

      toast({
        title: "Verification skipped",
        description: message,
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

    // Always attach basic classification so hover works even if
    // verification or persistence fail later.
    attachMeta({
      classification,
      verification: null,
      memoryScope: "none",
    });

    if (
      classification.is_global_candidate &&
      classification.memory_type !== "ephemeral" &&
      classification.memory_type !== "irrelevant"
    ) {
      console.log("This is a global candidate, fetching existing memories...");

      const { data: existingMemories, error: fetchError } = await supabase
        .from("memories")
        .select("memory_type, short_summary")
        .eq("scope", "global")
        .eq("user_id", user?.id);

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

      // Automatically store memories instead of asking via an interactive toast
      if (verification) {
        // Verified global candidate: store as a global memory using the verified summary/type
        attachMeta({
          classification,
          verification,
          memoryScope: "global",
        });

        await persistMemory(classification, verification, userText);

        const conflictWarning =
          verification.conflicts_detected.length > 0
            ? `Conflicts: ${verification.conflicts_detected.join(", ")}`
            : "";

        toast({
          title: "Global memory saved",
          description:
            `[${classification.memory_type}] ${verification.adjusted_summary}` +
            (conflictWarning ? ` — ${conflictWarning}` : ""),
        });
      } else {
        // Verifier skipped or failed: still store as a global memory based on the raw classification
        if (!sessionId || !user) {
          toast({
            title: "Cannot save memory",
            description: "No active session or user",
            variant: "destructive",
          });
          return;
        }

        const { data, error } = await supabase
          .from("memories")
          .insert({
            session_id: sessionId,
            user_id: user.id,
            memory_type: classification.memory_type as MemoryType,
            scope: "global",
            content: userText,
            short_summary: classification.short_summary,
            confidence: classification.confidence,
            verified: false,
            verification_prompt: null,
            verification_response: null,
          })
          .select()
          .single();

        if (error) {
          console.error("Failed to save global memory (unverified)", error);
          toast({
            title: "Failed to save memory",
            description: error.message,
            variant: "destructive",
          });
        } else if (data) {
          attachMeta({
            classification,
            verification: null,
            memoryScope: "global",
          });

          setGlobalMemories((prev) => [
            ...prev,
            {
              id: data.id,
              memory_type: data.memory_type as MemoryType,
              short_summary: data.short_summary,
              scope: data.scope,
              confidence: data.confidence,
            },
          ]);

          toast({
            title: "Global memory saved",
            description: `Remembered: ${classification.short_summary}`,
          });
        }
      }
    } else if (
      !classification.is_global_candidate &&
      classification.memory_type !== "ephemeral" &&
      classification.memory_type !== "irrelevant"
    ) {
      console.log("This is a session-specific memory, storing without verification...");

      const { data, error } = await supabase
        .from("memories")
        .insert({
          session_id: sessionId,
          user_id: user?.id,
          memory_type: classification.memory_type as MemoryType,
          scope: "session",
          content: userText,
          short_summary: classification.short_summary,
          confidence: classification.confidence,
          verified: false,
          verification_prompt: null,
          verification_response: null,
        })
        .select()
        .single();

      if (error) {
        console.error("Failed to store session memory", error);
        toast({
          title: "Failed to store session memory",
          description: error.message,
          variant: "destructive",
        });
      } else if (data) {
        attachMeta({
          classification,
          verification: null,
          memoryScope: "session",
        });

        setThreadMemories((prev) => [
          ...prev,
          {
            id: data.id,
            memory_type: data.memory_type as MemoryType,
            short_summary: data.short_summary,
            scope: data.scope,
            confidence: data.confidence,
          },
        ]);

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
        body: {
          messages: conversation,
          globalMemories,
          threadMemories,
        },
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

      try {
        if (user && sessionId) {
          await supabase.from("messages").insert({
            user_id: user.id,
            session_id: sessionId,
            role: "assistant",
            content: data.content,
          });
        }
      } catch (dbError) {
        console.error("Failed to store assistant message", dbError);
      }
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

    const isFirstUserMessage = !messages.some((m) => m.role === "user");

    const nextId = messages.length ? messages[messages.length - 1]!.id + 1 : 1;

    const userMessage: ChatMessage = {
      id: nextId,
      role: "user",
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      if (user && sessionId) {
        await supabase.from("messages").insert({
          user_id: user.id,
          session_id: sessionId,
          role: "user",
          content: trimmed,
        });
      }
    } catch (error) {
      console.error("Failed to store user message", error);
    }

    if (isFirstUserMessage && user && sessionId) {
      setThreadTitle(trimmed);
      try {
        await (supabase.from("sessions") as any)
          .update({ title: trimmed })
          .eq("id", sessionId)
          .eq("user_id", user.id);
      } catch (error) {
        console.error("Failed to update thread title", error);
      }
    }

    void runClassificationFlow(trimmed, nextId);

    const conversation = [...messages, userMessage].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    await askAssistant(conversation, nextId + 1);
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <ThreadSidebar
          user={user}
          currentThreadId={sessionId}
          onThreadSelect={handleThreadSelect}
          onThreadDelete={handleThreadDelete}
        />
        
        <div className="flex flex-1 flex-col">
          <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-10">
            <div className="flex items-center justify-between px-6 py-4">
              <div>
                <h1 className="text-xl font-semibold">Memory Chat</h1>
                {sessionId && (
                  <p className="text-xs text-muted-foreground">
                    Thread: {threadTitle ? threadTitle : sessionId.slice(0, 8)}
                  </p>
                )}
              </div>
              
              <nav className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNewThread}
                  disabled={!user}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Thread
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeleteCurrentThread}
                  disabled={!user || !sessionId}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Thread
                </Button>
                
                <Dialog open={memoriesDialogOpen} onOpenChange={setMemoriesDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Database className="h-4 w-4 mr-2" />
                      Memories
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Stored Memories</DialogTitle>
                    </DialogHeader>
                    <MemoryFlashcards
                      threadMemories={threadMemories}
                      globalMemories={globalMemories}
                      onDeleteMemory={handleDeleteMemory}
                      onEditMemory={handleEditMemory}
                      onAddMemory={handleAddMemory}
                    />
                  </DialogContent>
                </Dialog>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    navigate("/auth");
                  }}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </nav>
            </div>
          </header>

      <main className="flex flex-1 justify-center px-4 py-6">
        <section
          aria-label="Chat with AI assistant"
          className="flex h-full w-full max-w-4xl flex-col gap-4"
        >
          {(isClassifying || isVerifying) && (
            <div className="text-center">
              <span className="text-sm text-muted-foreground">
                {isClassifying && "Classifying memory..."}
                {isVerifying && "Verifying memory..."}
              </span>
            </div>
          )}

          <div className="flex-1 space-y-3 overflow-y-auto rounded-md border border-border bg-card p-4">
            {messages.map((message) => {
              const hasClassification = message.role === "user" && !!message.classification;

              const messageContent = (
                <article
                  key={message.id}
                  className={`flex max-w-[80%] flex-col gap-1 rounded-lg px-4 py-3 ${
                    message.role === "assistant"
                      ? "bg-muted"
                      : "bg-primary text-primary-foreground ml-auto"
                  }`}
                >
                  <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wide opacity-70">
                    <span>
                      {message.role === "assistant" ? "Assistant" : "You"}
                    </span>

                    {hasClassification && message.classification && (
                      <span className="rounded-full border border-current px-2 py-0.5 text-[9px] lowercase opacity-60">
                        {message.memoryScope === "global"
                          ? `global · ${message.classification.memory_type}`
                          : message.memoryScope === "session"
                          ? `session · ${message.classification.memory_type}`
                          : message.classification.memory_type}
                      </span>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                </article>
              );

              if (hasClassification && message.classification) {
                return (
                  <Tooltip key={message.id}>
                    <TooltipTrigger asChild>{messageContent}</TooltipTrigger>
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
                );
              }

              return messageContent;
            })}

          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3 border-t border-border pt-4">
            <div className="flex gap-2">
              <Textarea
                id="chat-input"
                placeholder="Type your message..."
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                className="min-h-[80px] resize-none"
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Press Enter to send, Shift+Enter for new line
              </p>
              <Button type="submit" disabled={!input.trim() || isChatting || !sessionId}>
                {isChatting ? "Sending..." : "Send"}
              </Button>
            </div>
          </form>
        </section>
      </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;
