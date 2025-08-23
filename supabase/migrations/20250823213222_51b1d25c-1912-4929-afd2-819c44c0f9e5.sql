-- Create invites table for meeting requests
CREATE TABLE public.invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  duration_minutes INTEGER DEFAULT 60,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'booked', 'completed', 'cancelled')),
  payment_held BOOLEAN DEFAULT false,
  meeting_confirmed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create bookings table for scheduled meetings
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id UUID REFERENCES public.invites(id) ON DELETE CASCADE NOT NULL,
  invitee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create mock payments table for Stripe simulation
CREATE TABLE public.mock_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id UUID REFERENCES public.invites(id) ON DELETE CASCADE NOT NULL,
  stripe_payment_intent_id TEXT UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'held' CHECK (status IN ('held', 'captured', 'cancelled')),
  card_last_four TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_payments ENABLE ROW LEVEL SECURITY;

-- Create policies for invites
CREATE POLICY "Users can view their own invites" ON public.invites
  FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "Anyone can view active invites" ON public.invites
  FOR SELECT USING (status = 'active');

CREATE POLICY "Users can create invites" ON public.invites
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their invites" ON public.invites
  FOR UPDATE USING (auth.uid() = creator_id);

-- Create policies for bookings
CREATE POLICY "Users can view their bookings" ON public.bookings
  FOR SELECT USING (auth.uid() = invitee_id OR auth.uid() IN (
    SELECT creator_id FROM public.invites WHERE id = invite_id
  ));

CREATE POLICY "Users can create bookings" ON public.bookings
  FOR INSERT WITH CHECK (auth.uid() = invitee_id);

CREATE POLICY "Users can update their bookings" ON public.bookings
  FOR UPDATE USING (auth.uid() = invitee_id OR auth.uid() IN (
    SELECT creator_id FROM public.invites WHERE id = invite_id
  ));

-- Create policies for mock payments
CREATE POLICY "Users can view payments for their invites" ON public.mock_payments
  FOR SELECT USING (auth.uid() IN (
    SELECT creator_id FROM public.invites WHERE id = invite_id
  ));

CREATE POLICY "System can manage payments" ON public.mock_payments
  FOR ALL USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_invites_updated_at
  BEFORE UPDATE ON public.invites
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mock_payments_updated_at
  BEFORE UPDATE ON public.mock_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();