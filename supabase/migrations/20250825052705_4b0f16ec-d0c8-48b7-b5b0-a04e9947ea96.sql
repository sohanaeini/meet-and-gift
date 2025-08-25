-- Drop the existing restrictive policy
DROP POLICY "Creators can update their invites" ON public.invites;

-- Create a new policy that allows both creators and invitees to update invites
CREATE POLICY "Creators and invitees can update invites" ON public.invites
    FOR UPDATE 
    USING (
        auth.uid() = creator_id 
        OR 
        auth.uid() IN (
            SELECT invitee_id FROM bookings WHERE invite_id = invites.id
        )
    );