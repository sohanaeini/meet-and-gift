-- First, let's fix the specific invite that's stuck
UPDATE public.invites 
SET status = 'booked', updated_at = now()
WHERE id = '5f9a2796-d96a-4b9e-8a90-80711c5373f7' 
AND status = 'active' 
AND EXISTS (
  SELECT 1 FROM public.bookings 
  WHERE invite_id = '5f9a2796-d96a-4b9e-8a90-80711c5373f7'
);

-- Also fix any other invites that have bookings but are still 'active'
UPDATE public.invites 
SET status = 'booked', updated_at = now()
WHERE status = 'active' 
AND EXISTS (
  SELECT 1 FROM public.bookings 
  WHERE bookings.invite_id = invites.id
);

-- Now let's create the missing trigger to prevent this from happening again
-- This trigger will automatically update invite status when bookings are created
CREATE OR REPLACE FUNCTION public.update_invite_status_on_booking()
RETURNS TRIGGER AS $$
BEGIN
  -- When a booking is inserted, update the invite status to 'booked'
  IF TG_OP = 'INSERT' THEN
    UPDATE public.invites 
    SET status = 'booked', updated_at = now()
    WHERE id = NEW.invite_id AND status = 'active';
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
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_update_invite_status_on_booking ON public.bookings;
CREATE TRIGGER trigger_update_invite_status_on_booking
  AFTER INSERT OR DELETE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_invite_status_on_booking();