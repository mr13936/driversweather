-- Create feedback table for collecting user improvement ideas
CREATE TABLE public.feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  email TEXT,
  route_from TEXT,
  route_to TEXT,
  user_agent TEXT
);

-- Enable Row Level Security
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert feedback (anonymous submissions)
CREATE POLICY "Anyone can submit feedback"
ON public.feedback
FOR INSERT
WITH CHECK (true);

-- Restrict reading feedback (admin only via service role)
CREATE POLICY "No public read access"
ON public.feedback
FOR SELECT
USING (false);