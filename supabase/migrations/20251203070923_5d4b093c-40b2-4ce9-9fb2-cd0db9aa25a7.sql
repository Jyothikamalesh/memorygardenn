-- Add user scoping to sessions and memories and tighten RLS

-- 1) Add user_id columns (nullable to keep existing rows valid)
ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS user_id uuid;

ALTER TABLE public.memories
ADD COLUMN IF NOT EXISTS user_id uuid;

-- 2) Update RLS policies for sessions
DROP POLICY IF EXISTS "Public can create sessions" ON public.sessions;
DROP POLICY IF EXISTS "Public can read their sessions" ON public.sessions;
DROP POLICY IF EXISTS "Public can update sessions" ON public.sessions;

CREATE POLICY "Users can create their own sessions"
ON public.sessions
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users can read their own sessions"
ON public.sessions
FOR SELECT
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users can update their own sessions"
ON public.sessions
FOR UPDATE
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- 3) Update RLS policies for memories
DROP POLICY IF EXISTS "Public can delete memories" ON public.memories;
DROP POLICY IF EXISTS "Public can insert memories" ON public.memories;
DROP POLICY IF EXISTS "Public can read memories" ON public.memories;
DROP POLICY IF EXISTS "Public can update memories" ON public.memories;

CREATE POLICY "Users can insert their memories"
ON public.memories
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users can read their memories"
ON public.memories
FOR SELECT
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users can update their memories"
ON public.memories
FOR UPDATE
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users can delete their memories"
ON public.memories
FOR DELETE
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- 4) Tighten RLS for memory_conflicts so users only see conflicts involving their own memories
DROP POLICY IF EXISTS "Public can insert conflicts" ON public.memory_conflicts;
DROP POLICY IF EXISTS "Public can read conflicts" ON public.memory_conflicts;
DROP POLICY IF EXISTS "Public can update conflicts" ON public.memory_conflicts;

CREATE POLICY "Users can read their memory conflicts"
ON public.memory_conflicts
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.memories m
      WHERE m.id = memory_conflicts.memory_a_id AND m.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.memories m
      WHERE m.id = memory_conflicts.memory_b_id AND m.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can insert their memory conflicts"
ON public.memory_conflicts
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.memories m
      WHERE m.id = memory_conflicts.memory_a_id AND m.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.memories m
      WHERE m.id = memory_conflicts.memory_b_id AND m.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update their memory conflicts"
ON public.memory_conflicts
FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.memories m
      WHERE m.id = memory_conflicts.memory_a_id AND m.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.memories m
      WHERE m.id = memory_conflicts.memory_b_id AND m.user_id = auth.uid()
    )
  )
);
