-- Fix existing invites that have bookings but are still marked as 'active'
-- This happens when the status update failed during the booking process
UPDATE public.invites 
SET status = 'booked', updated_at = now()
WHERE status = 'active' 
  AND id IN (
    SELECT DISTINCT invite_id 
    FROM public.bookings 
    WHERE status = 'scheduled'
  );

-- Add realtime support for better dashboard updates
ALTER TABLE public.invites REPLICA IDENTITY FULL;
ALTER TABLE public.bookings REPLICA IDENTITY FULL;