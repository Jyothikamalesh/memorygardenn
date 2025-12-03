-- Add title column for naming threads based on first prompt
ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS title text;

-- Allow users to delete their own sessions (threads)
CREATE POLICY "Users can delete their own sessions"
ON public.sessions
FOR DELETE
USING ((auth.uid() IS NOT NULL) AND (user_id = auth.uid()));