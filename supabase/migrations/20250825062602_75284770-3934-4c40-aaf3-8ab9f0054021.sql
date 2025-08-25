-- Fix the trigger to prevent conflicts when status is already 'booked'
CREATE OR REPLACE FUNCTION public.update_invite_status_on_booking()
RETURNS TRIGGER AS $$
BEGIN
  -- When a booking is inserted, update the invite status to 'booked' ONLY if it's currently 'active'
  IF TG_OP = 'INSERT' THEN
    UPDATE public.invites 
    SET status = 'booked', updated_at = now()
    WHERE id = NEW.invite_id 
    AND status = 'active';  -- Only update if status is currently 'active'
    RETURN NEW;
  END IF;
  
  -- When a booking is deleted, check if we should revert invite to 'active'
  IF TG_OP = 'DELETE' THEN
    -- Only revert if there are no other bookings for this invite
    UPDATE public.invites 
    SET status = 'active', updated_at = now()
    WHERE id = OLD.invite_id 
    AND status = 'booked'
    AND NOT EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE invite_id = OLD.invite_id AND id != OLD.id
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;