-- Add unique constraint to prevent duplicate bookings
ALTER TABLE public.bookings 
ADD CONSTRAINT unique_invite_invitee UNIQUE (invite_id, invitee_id);

-- Add meeting_link column to invites table
ALTER TABLE public.invites 
ADD COLUMN meeting_link TEXT;