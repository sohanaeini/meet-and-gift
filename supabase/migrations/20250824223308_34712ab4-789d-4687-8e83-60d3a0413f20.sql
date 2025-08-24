-- Fix meeting state synchronization between users
-- This migration adds triggers to automatically sync booking status with invite status
-- and ensures both participants see meetings in the correct tabs

-- Function to sync booking status when invite status changes
CREATE OR REPLACE FUNCTION sync_booking_status()
RETURNS TRIGGER AS $$
BEGIN
  -- When invite becomes 'booked', set booking status to 'scheduled'
  IF NEW.status = 'booked' AND (OLD.status IS NULL OR OLD.status != 'booked') THEN
    UPDATE public.bookings 
    SET status = 'scheduled'
    WHERE invite_id = NEW.id AND status != 'scheduled';
  END IF;
  
  -- When invite becomes 'completed', set all related bookings to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    UPDATE public.bookings 
    SET status = 'completed'
    WHERE invite_id = NEW.id AND status != 'completed';
  END IF;
  
  -- When invite becomes 'cancelled', set all related bookings to 'cancelled'
  IF NEW.status = 'cancelled' AND (OLD.status IS NULL OR OLD.status != 'cancelled') THEN
    UPDATE public.bookings 
    SET status = 'cancelled'
    WHERE invite_id = NEW.id AND status != 'cancelled';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on invites table to sync booking status
DROP TRIGGER IF EXISTS sync_booking_status_trigger ON public.invites;
CREATE TRIGGER sync_booking_status_trigger
  AFTER UPDATE OF status ON public.invites
  FOR EACH ROW
  EXECUTE FUNCTION sync_booking_status();

-- Fix existing data consistency
-- Update any bookings that should be 'scheduled' based on invite status
UPDATE public.bookings 
SET status = 'scheduled'
FROM public.invites
WHERE bookings.invite_id = invites.id 
  AND invites.status = 'booked' 
  AND bookings.status != 'scheduled';

-- Update any bookings that should be 'completed' based on invite status
UPDATE public.bookings 
SET status = 'completed'
FROM public.invites
WHERE bookings.invite_id = invites.id 
  AND invites.status = 'completed' 
  AND bookings.status != 'completed';

-- Update any bookings that should be 'cancelled' based on invite status
UPDATE public.bookings 
SET status = 'cancelled'
FROM public.invites
WHERE bookings.invite_id = invites.id 
  AND invites.status = 'cancelled' 
  AND bookings.status != 'cancelled';

-- Add performance indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_invites_creator_status ON public.invites(creator_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_invitee_status ON public.bookings(invitee_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_invite_id_status ON public.bookings(invite_id, status);