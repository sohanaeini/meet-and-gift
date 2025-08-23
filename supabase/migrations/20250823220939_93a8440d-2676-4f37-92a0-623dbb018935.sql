-- Add available time slots to invites table
ALTER TABLE public.invites 
ADD COLUMN available_time_slots JSONB DEFAULT '[]'::jsonb;