import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { Separator } from '@/components/ui/separator';
import { Calendar, DollarSign, Clock, User, CheckCircle2, XCircle, Copy, Share2 } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { toast } from '@/hooks/use-toast';

interface Invite {
  id: string;
  title: string;
  description: string;
  amount: number;
  duration_minutes: number;
  status: string;
  creator_id: string;
  payment_held: boolean;
  meeting_confirmed: boolean;
  meeting_link?: string;
  available_time_slots?: string[];
  bookings?: Booking[];
}

interface Booking {
  id: string;
  scheduled_at: string;
  status: string;
  invitee_id: string;
}

const InvitePage = () => {
  const { inviteId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [isConfirming, setIsConfirming] = useState(false);
  const [userHasBooked, setUserHasBooked] = useState(false);

  useEffect(() => {
    fetchInvite();
  }, [inviteId]);

  const fetchInvite = async () => {
    try {
      const { data, error } = await supabase
        .from('invites')
        .select(`
          *,
          bookings(
            id,
            scheduled_at,
            status,
            invitee_id
          )
        `)
        .eq('id', inviteId)
        .single();

      if (error) throw error;
      setInvite(data as any);
      
      // Check if current user has already booked this invite
      if (user && data.bookings) {
        setUserHasBooked(data.bookings.some((booking: any) => booking.invitee_id === user.id));
      }
    } catch (error) {
      console.error('Error fetching invite:', error);
      toast({
        title: 'Error',
        description: 'Failed to load invite',
        variant: 'destructive',
      });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleBookMeeting = async () => {
    if (!selectedDate || !user) return;

    setIsBooking(true);
    try {
      // Create booking with 'scheduled' status
      const { error: bookingError } = await supabase
        .from('bookings')
        .insert([
          {
            invite_id: inviteId,
            invitee_id: user.id,
            scheduled_at: selectedDate.toISOString(),
            status: 'scheduled' // Explicitly set booking status
          }
        ]);

      if (bookingError) {
        if (bookingError.code === '23505') {
          // Unique constraint violation - user already booked
          toast({
            title: 'Already Booked',
            description: 'You have already booked this meeting.',
            variant: 'destructive',
          });
          setUserHasBooked(true);
          fetchInvite();
          return;
        }
        throw bookingError;
      }

      console.log('🔄 ATTEMPTING TO UPDATE INVITE STATUS...', {
        inviteId,
        newStatus: 'booked',
        currentUser: user?.id
      });

      // Update invite status to 'booked' (triggers database sync for both users)
      const { error: updateError } = await supabase
        .from('invites')
        .update({ status: 'booked' })
        .eq('id', inviteId);

      if (updateError) {
        console.error('❌ ERROR updating invite status:', updateError);
        throw updateError;
      }

      console.log('✅ SUCCESS: Updated invite status to BOOKED for invite:', inviteId);
      console.log('✅ This invite should now appear in UPCOMING MEETINGS for both creator and invitee');
      console.log('🔄 Refreshing invite data to confirm status update...');

      toast({
        title: 'Success!',
        description: 'Meeting booked successfully!',
      });

      fetchInvite(); // Refresh data
    } catch (error) {
      console.error('Error booking meeting:', error);
      toast({
        title: 'Error',
        description: 'Failed to book meeting',
        variant: 'destructive',
      });
    } finally {
      setIsBooking(false);
    }
  };

  const handleConfirmMeeting = async () => {
    if (!invite || !user) return;

    setIsConfirming(true);
    try {
      // Update invite as confirmed and booking as completed
      const { error: updateError } = await supabase
        .from('invites')
        .update({ 
          meeting_confirmed: true,
          status: 'completed'
        })
        .eq('id', inviteId);

      if (updateError) throw updateError;

      // Update booking status to completed
      const { error: bookingUpdateError } = await supabase
        .from('bookings')
        .update({ status: 'completed' })
        .eq('invite_id', inviteId);

      if (bookingUpdateError) throw bookingUpdateError;

      // Mock payment release
      console.log('Mock Stripe Payment Release:', {
        amount: invite.amount * 100,
        recipient: invite.bookings?.[0]?.invitee_id
      });

      // Update payment status
      const { error: paymentError } = await supabase
        .from('mock_payments')
        .update({ status: 'captured' })
        .eq('invite_id', inviteId);

      if (paymentError) throw paymentError;

      toast({
        title: 'Meeting Confirmed!',
        description: `Payment of $${invite.amount} has been released to the invitee.`,
      });

      fetchInvite();
    } catch (error) {
      console.error('Error confirming meeting:', error);
      toast({
        title: 'Error',
        description: 'Failed to confirm meeting',
        variant: 'destructive',
      });
    } finally {
      setIsConfirming(false);
    }
  };

  const copyInviteLink = () => {
    const link = window.location.href;
    navigator.clipboard.writeText(link);
    toast({
      title: 'Link Copied!',
      description: 'Invite link copied to clipboard',
    });
  };

  const shareInvite = async () => {
    const link = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: invite?.title,
          text: `Book a paid meeting: ${invite?.title}`,
          url: link,
        });
      } catch (err) {
        copyInviteLink();
      }
    } else {
      copyInviteLink();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Invite Not Found</h1>
          <p className="text-muted-foreground mb-4">This invite may have been removed or is invalid.</p>
          <Button asChild>
            <Link to="/">Go Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isCreator = user?.id === invite.creator_id;
  const hasBooking = invite.bookings && invite.bookings.length > 0;
  const booking = hasBooking ? invite.bookings[0] : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" asChild>
            <Link to={user ? '/dashboard' : '/'}>
              ← {user ? 'Back to Dashboard' : 'Back to Home'}
            </Link>
          </Button>
          {isCreator && (
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={copyInviteLink}>
                <Copy className="mr-2 h-4 w-4" />
                Copy Link
              </Button>
              <Button variant="outline" size="sm" onClick={shareInvite}>
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
            </div>
          )}
        </div>

        {/* Invite Details */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">{invite.title}</CardTitle>
              <CardDescription className="text-base mt-2">
                💰 Someone wants to pay ${invite.amount} for your time!
              </CardDescription>
              </div>
              <Badge variant={invite.status === 'completed' ? 'default' : 'secondary'}>
                {invite.status.charAt(0).toUpperCase() + invite.status.slice(1)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-trust/5 p-4 rounded-lg border border-trust/20 mb-4">
              <p className="text-sm text-muted-foreground mb-2">
                Hi! I'd love to meet with you to discuss: <strong>{invite.title}</strong>
              </p>
              {invite.description && (
                <p className="text-sm text-muted-foreground">{invite.description}</p>
              )}
              <p className="text-sm font-medium text-trust mt-2">
                I've reserved ${invite.amount} as payment for your time.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">${invite.amount}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{invite.duration_minutes} minutes</span>
              </div>
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>Payment will be sent after meeting</span>
              </div>
            </div>
            
            {invite.meeting_link && hasBooking && (
              <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-sm font-medium mb-2">Meeting Link:</p>
                <a 
                  href={invite.meeting_link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-sm break-all"
                >
                  {invite.meeting_link}
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Booking Information */}
        {hasBooking && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                Scheduled Meeting
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {format(new Date(booking.scheduled_at), 'EEEE, MMMM d, yyyy')}
                  </p>
                  <p className="text-muted-foreground">
                    {format(new Date(booking.scheduled_at), 'h:mm a')}
                  </p>
                </div>
                <Badge variant={booking.status === 'completed' ? 'default' : 'secondary'}>
                  {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        {!user && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">Sign up to book this meeting</p>
                <Button asChild className="w-full">
                  <Link to="/auth">Sign Up to Book</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {user && !isCreator && invite.status === 'active' && !userHasBooked && !hasBooking && (
          <Card>
            <CardHeader>
              <CardTitle>Accept This Paid Meeting</CardTitle>
              <CardDescription>
                Choose when you're available - you'll be paid ${invite.amount} after the meeting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {invite.available_time_slots && invite.available_time_slots.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Choose from available time slots:</p>
                  <div className="grid gap-2">
                    {invite.available_time_slots.map((slot, index) => {
                      const slotDate = new Date(slot);
                      const isSelected = selectedDate?.toISOString() === slot;
                      return (
                        <Button
                          key={index}
                          variant={isSelected ? "default" : "outline"}
                          onClick={() => setSelectedDate(slotDate)}
                          className="justify-start"
                        >
                          {format(slotDate, 'MMM d, yyyy \'at\' h:mm a')}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <DateTimePicker
                  date={selectedDate}
                  setDate={setSelectedDate}
                  placeholder="Choose date and time"
                />
              )}
              <Button 
                onClick={handleBookMeeting}
                disabled={!selectedDate || isBooking}
                className="w-full"
              >
                {isBooking ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Booking...
                  </>
                ) : (
                  `Accept Meeting - Earn $${invite.amount}`
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {user && !isCreator && (userHasBooked || hasBooking) && (
          <Card className="border-success">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center text-success">
                <CheckCircle2 className="mr-2 h-5 w-5" />
                <span className="font-medium">You have already booked this meeting!</span>
              </div>
            </CardContent>
          </Card>
        )}

        {isCreator && hasBooking && !invite.meeting_confirmed && (
          <Card>
            <CardHeader>
              <CardTitle>Confirm Meeting Completion</CardTitle>
              <CardDescription>
                Did the meeting happen successfully?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-4">
                <Button
                  onClick={handleConfirmMeeting}
                  disabled={isConfirming}
                  className="flex-1"
                >
                  {isConfirming ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Confirming...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Yes, Release Payment
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    // Cancel the meeting and update both invite and booking status
                    Promise.all([
                      supabase
                        .from('invites')
                        .update({ status: 'cancelled' })
                        .eq('id', inviteId),
                      supabase
                        .from('bookings')
                        .update({ status: 'cancelled' })
                        .eq('invite_id', inviteId)
                    ]).then(() => {
                      toast({
                        title: 'Meeting Cancelled',
                        description: 'Payment hold has been released.',
                      });
                      fetchInvite();
                    });
                  }}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  No, Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {invite.meeting_confirmed && (
          <Card className="border-success">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center text-success">
                <CheckCircle2 className="mr-2 h-5 w-5" />
                <span className="font-medium">Meeting completed and payment released!</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default InvitePage;