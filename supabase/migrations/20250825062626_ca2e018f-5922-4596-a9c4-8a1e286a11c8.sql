-- Fix the sync_booking_status function to have proper security definer setting
CREATE OR REPLACE FUNCTION public.sync_booking_status()
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;