-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Memory types enum
CREATE TYPE memory_type AS ENUM (
  'preference',
  'goal',
  'health',
  'biographical_fact',
  'routine',
  'procedural_memory',
  'relationship'
);

-- Memory scope: global vs session
CREATE TYPE memory_scope AS ENUM ('global', 'session');

-- Table: sessions
-- Tracks user chat sessions for temporal memory management
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can create sessions" ON public.sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can read their sessions" ON public.sessions
  FOR SELECT USING (true);

CREATE POLICY "Public can update sessions" ON public.sessions
  FOR UPDATE USING (true);

-- Table: memories
-- Stores all memory fragments with temporal tracking
CREATE TABLE public.memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  memory_type memory_type NOT NULL,
  scope memory_scope NOT NULL DEFAULT 'session',
  content TEXT NOT NULL,
  short_summary TEXT NOT NULL,
  confidence NUMERIC(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  verified BOOLEAN NOT NULL DEFAULT false,
  verification_prompt TEXT,
  verification_response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  superseded_by UUID REFERENCES public.memories(id) ON DELETE SET NULL
);

ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can insert memories" ON public.memories
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can read memories" ON public.memories
  FOR SELECT USING (true);

CREATE POLICY "Public can update memories" ON public.memories
  FOR UPDATE USING (true);

CREATE POLICY "Public can delete memories" ON public.memories
  FOR DELETE USING (true);

-- Index for faster session lookups
CREATE INDEX idx_memories_session ON public.memories(session_id);
CREATE INDEX idx_memories_scope ON public.memories(scope);
CREATE INDEX idx_memories_type ON public.memories(memory_type);

-- Table: memory_conflicts
-- Temporal graph for tracking conflicting memories
CREATE TABLE public.memory_conflicts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  memory_a_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
  memory_b_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
  conflict_type TEXT NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolution_strategy TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.memory_conflicts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can insert conflicts" ON public.memory_conflicts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can read conflicts" ON public.memory_conflicts
  FOR SELECT USING (true);

CREATE POLICY "Public can update conflicts" ON public.memory_conflicts
  FOR UPDATE USING (true);

-- Index for conflict resolution queries
CREATE INDEX idx_conflicts_unresolved ON public.memory_conflicts(resolved) WHERE NOT resolved;

-- Function: update_updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: auto-update updated_at on memories
CREATE TRIGGER memories_updated_at
  BEFORE UPDATE ON public.memories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Function: update_session_last_active
CREATE OR REPLACE FUNCTION public.update_session_last_active()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.sessions
  SET last_active_at = now()
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: auto-update session last_active when memory is created
CREATE TRIGGER memories_update_session_activity
  AFTER INSERT ON public.memories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_session_last_active();