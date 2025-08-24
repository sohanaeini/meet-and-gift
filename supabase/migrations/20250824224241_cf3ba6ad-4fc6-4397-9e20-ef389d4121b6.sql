-- Create the trigger to sync booking status with invite status
CREATE TRIGGER sync_booking_status_trigger
  AFTER UPDATE ON public.invites
  FOR EACH ROW
  EXECUTE FUNCTION sync_booking_status();