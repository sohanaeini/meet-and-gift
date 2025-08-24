-- Clean up duplicate bookings (keep the earliest one for each invite_id + invitee_id combination)
DELETE FROM public.bookings 
WHERE id NOT IN (
    SELECT DISTINCT ON (invite_id, invitee_id) id
    FROM public.bookings 
    ORDER BY invite_id, invitee_id, created_at ASC
);

-- Add unique constraint to prevent duplicate bookings
ALTER TABLE public.bookings 
ADD CONSTRAINT unique_invite_invitee UNIQUE (invite_id, invitee_id);

-- Add meeting_link column to invites table
ALTER TABLE public.invites 
ADD COLUMN meeting_link TEXT;