import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Calendar, DollarSign, Clock, Users, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

interface Invite {
  id: string;
  title: string;
  description: string;
  amount: number;
  currency: string;
  duration_minutes: number;
  status: string;
  created_at: string;
  creator_id: string;
  meeting_confirmed: boolean;
  bookings?: Booking[];
}

interface Booking {
  id: string;
  scheduled_at: string;
  status: string;
  invitee_id: string;
  invites?: {
    id: string;
    title: string;
    description: string;
    amount: number;
    currency: string;
    duration_minutes: number;
    status: string;
    creator_id: string;
    meeting_confirmed: boolean;
  };
}

const Dashboard = () => {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  // Refetch data when component comes into focus (user returns from other pages)
  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        console.log('🔄 Dashboard focused, refreshing data...');
        fetchData();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user]);

  // Refetch data when returning to dashboard route
  useEffect(() => {
    if (user && location.pathname === '/dashboard') {
      console.log('🔄 Dashboard route accessed, refreshing data...');
      fetchData();
    }
  }, [location.pathname, user]);

  // Add visibility change listener for better real-time updates
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        console.log('🔄 Page became visible, refreshing data...');
        fetchData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

  // Enhanced real-time listeners for instant dashboard updates
  useEffect(() => {
    if (!user) return;

    console.log('🔌 Setting up comprehensive real-time listeners for user:', user.id);

    const channel = supabase
      .channel('dashboard-updates')
      // Listen to ALL invite changes - refresh if user created the invite OR if invite affects user's bookings
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invites'
        },
        async (payload) => {
          console.log('📡 Invite change detected:', payload);
          const invite = payload.new || payload.old;
          
          if (invite) {
            // Refresh if user created this invite
            if ((invite as any).creator_id === user.id) {
              console.log('📡 Invite change affects current user as creator, refreshing...');
              fetchData();
              return;
            }
            
            // Also refresh if this invite has bookings by the current user
            // (This handles cases where invite status changes affect user's bookings)
            try {
              const { data: userBookings } = await supabase
                .from('bookings')
                .select('invite_id')
                .eq('invitee_id', user.id)
                .eq('invite_id', (invite as any).id);
                
              if (userBookings && userBookings.length > 0) {
                console.log('📡 Invite change affects current user as invitee, refreshing...');
                fetchData();
              }
            } catch (error) {
              console.error('Error checking user bookings:', error);
            }
          }
        }
      )
      // Listen to ALL booking changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings'
        },
        async (payload) => {
          console.log('📡 Booking change detected:', payload);
          const booking = payload.new || payload.old;
          
          if (booking) {
            // Refresh if user is the invitee
            if ((booking as any).invitee_id === user.id) {
              console.log('📡 Booking change affects current user as invitee, refreshing...');
              fetchData();
              return;
            }
            
            // Also refresh if this booking is for an invite created by current user
            try {
              const { data: userInvite } = await supabase
                .from('invites')
                .select('creator_id')
                .eq('id', (booking as any).invite_id)
                .eq('creator_id', user.id)
                .single();
                
              if (userInvite) {
                console.log('📡 Booking change affects current user as invite creator, refreshing...');
                fetchData();
              }
            } catch (error) {
              console.error('Error checking invite creator:', error);
            }
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 Cleaning up real-time listeners');
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    
    setLoadingData(true);
    console.log('🔄 Fetching dashboard data for user:', user.id);
    
    try {
      // Fetch user's created invites
      const { data: invitesData, error: invitesError } = await supabase
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
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });

      if (invitesError) throw invitesError;

      // Fetch user's bookings with full invite details
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          invites(
            id,
            title,
            description,
            amount,
            currency,
            duration_minutes,
            status,
            creator_id,
            meeting_confirmed
          )
        `)
        .eq('invitee_id', user.id)
        .order('created_at', { ascending: false });

      if (bookingsError) throw bookingsError;

      console.log('✅ Dashboard data fetched successfully:', {
        timestamp: new Date().toISOString(),
        user: user.id,
        invites: invitesData?.length || 0,
        bookings: bookingsData?.length || 0,
        inviteStatuses: invitesData?.map(i => ({ 
          id: i.id, 
          status: i.status, 
          title: i.title, 
          creator_id: i.creator_id,
          bookings: i.bookings?.length || 0
        })),
        bookingStatuses: bookingsData?.map(b => ({ 
          id: b.id, 
          status: b.status, 
          invitee_id: b.invitee_id 
        }))
      });

      setInvites(invitesData || []);
      setBookings(bookingsData || []);
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      active: 'default',
      booked: 'secondary',
      completed: 'success' as any,
      cancelled: 'destructive',
      scheduled: 'default'
    };
    return <Badge variant={variants[status] || 'default'}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--gradient-trust)' }}>
              <span className="text-white font-bold">P</span>
            </div>
            <span className="font-bold text-xl">Pay-to-Meet</span>
          </Link>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {user?.user_metadata?.full_name || user?.email}
            </span>
            <Button variant="outline" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Manage your meeting invites and bookings</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={fetchData}
              disabled={loadingData}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loadingData ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button asChild className="bg-primary hover:bg-primary/90">
              <Link to="/create-invite">
                <Plus className="mr-2 h-4 w-4" />
                Create Invite
              </Link>
            </Button>
          </div>
        </div>

        <Tabs defaultValue="invites" className="w-full">
          <TabsList>
            <TabsTrigger value="invites">My Requests</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming Meetings</TabsTrigger>
            <TabsTrigger value="past">Previous Meetings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="invites" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>My Requests</CardTitle>
                <CardDescription>Meeting requests you've created that haven't been accepted yet</CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  // Show ONLY invites created by user with status 'active' (not yet accepted)
                  const myRequestsInvites = invites.filter(invite => 
                    invite.creator_id === user?.id && invite.status === 'active'
                  );
                  
                  console.log('📊 My Requests filtering:', {
                    allInvites: invites.length,
                    userCreatedInvites: invites.filter(i => i.creator_id === user?.id).length,
                    activeInvites: invites.filter(i => i.creator_id === user?.id && i.status === 'active').length,
                    myRequestsInvites: myRequestsInvites.length,
                    detailedInvites: invites.filter(i => i.creator_id === user?.id).map(i => ({ 
                      id: i.id, 
                      status: i.status, 
                      title: i.title 
                    }))
                  });
                  
                  return myRequestsInvites.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No pending requests</p>
                      <p className="text-xs text-muted-foreground mt-1">Once someone accepts your invite, it will move to Upcoming Meetings</p>
                      <Button asChild className="mt-4">
                        <Link to="/create-invite">Create Your First Request</Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {myRequestsInvites.map((invite) => (
                        <div key={invite.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <h3 className="font-medium">{invite.title}</h3>
                            <p className="text-sm text-muted-foreground">{invite.description}</p>
                            <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                              <span>${invite.amount} offered</span>
                              <span>Created {format(new Date(invite.created_at), 'MMM d, yyyy')}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary">Awaiting Response</Badge>
                            <Button variant="outline" size="sm" asChild>
                              <Link to={`/invite/${invite.id}`}>View</Link>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="upcoming" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Meetings</CardTitle>
                <CardDescription>Meetings that have been scheduled and are awaiting completion</CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const createdAndBookedInvites = invites.filter(invite => 
                    invite.creator_id === user?.id && 
                    invite.status === 'booked'
                  );
                  
                  const acceptedBookings = bookings.filter(booking => 
                    booking.invitee_id === user?.id && 
                    booking.status === 'scheduled'
                  );
                  
                  console.log('📊 UPCOMING MEETINGS ANALYSIS:', {
                    timestamp: new Date().toISOString(),
                    userId: user?.id,
                    totalInvites: invites.length,
                    totalBookings: bookings.length,
                    createdAndBookedInvites: createdAndBookedInvites.length,
                    acceptedBookings: acceptedBookings.length,
                    createdAndBookedDetails: createdAndBookedInvites.map(i => ({ 
                      id: i.id, 
                      status: i.status, 
                      title: i.title,
                      bookings: i.bookings?.length || 0,
                      note: '🎯 BOOKED invites created by current user - should show here!'
                    })),
                    acceptedBookingDetails: acceptedBookings.map(b => ({ 
                      id: b.id, 
                      status: b.status, 
                      title: b.invites?.title,
                      note: '🎯 SCHEDULED bookings by current user - should show here!'
                    })),
                    allMyInviteStatuses: invites.filter(i => i.creator_id === user?.id).map(i => ({
                      id: i.id,
                      title: i.title,
                      status: i.status,
                      bookings: i.bookings?.length || 0
                    }))
                  });
                  
                   const upcomingMeetings = [
                     // Created invites that are booked (requester view - you created the invite and someone accepted it)
                     ...createdAndBookedInvites.map(invite => ({
                       type: 'request',
                       id: invite.id,
                       title: invite.title,
                       description: invite.description,
                       amount: invite.amount,
                       currency: 'USD', // From invite data
                       duration_minutes: invite.duration_minutes || 60,
                       scheduled_at: invite.bookings?.[0]?.scheduled_at,
                       status: 'booked',
                       role: 'Requester',
                       meeting_confirmed: invite.meeting_confirmed
                     })),
                     // Accepted invites (invitee view - you accepted someone's invite)
                     ...acceptedBookings.map(booking => ({
                       type: 'booking',
                       id: booking.id,
                       title: booking.invites?.title,
                       description: booking.invites?.description,
                       amount: booking.invites?.amount,
                       currency: booking.invites?.currency || 'USD',
                       duration_minutes: booking.invites?.duration_minutes || 60,
                       scheduled_at: booking.scheduled_at,
                       status: booking.status,
                       role: 'Invitee',
                       meeting_confirmed: booking.invites?.meeting_confirmed || false
                     }))
                   ];

                  return upcomingMeetings.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No upcoming meetings scheduled</p>
                      <p className="text-xs text-muted-foreground mt-1">When someone accepts your request or you accept someone's request, it will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {upcomingMeetings.map((meeting, index) => (
                        <div key={`${meeting.type}-${meeting.id}-${index}`} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <h3 className="font-medium">{meeting.title}</h3>
                            <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                              <span>${meeting.amount} {meeting.role === 'Requester' ? 'paying' : 'earning'}</span>
                              {meeting.scheduled_at && (
                                <span>{format(new Date(meeting.scheduled_at), 'MMM d, yyyy \'at\' h:mm a')}</span>
                              )}
                              <Badge variant="secondary">{meeting.role}</Badge>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="default">
                              {meeting.role === 'Requester' ? 'Awaiting Confirmation' : 'Scheduled'}
                            </Badge>
                            {meeting.type === 'request' && (
                              <Button variant="outline" size="sm" asChild>
                                <Link to={`/invite/${meeting.id}`}>
                                  {meeting.meeting_confirmed ? 'View' : 'Confirm Meeting'}
                                </Link>
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="past" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Previous Meetings</CardTitle>
                <CardDescription>Completed and cancelled meetings</CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const pastMeetings = [
                    // Created invites that are completed or cancelled (requester view)
                    ...invites.filter(invite => 
                      invite.creator_id === user?.id && 
                      (invite.status === 'completed' || invite.status === 'cancelled')
                    ).map(invite => ({
                      type: 'request',
                      id: invite.id,
                      title: invite.title,
                      description: invite.description,
                      amount: invite.amount,
                      currency: invite.currency || 'USD',
                      duration_minutes: invite.duration_minutes || 60,
                      scheduled_at: invite.bookings?.[0]?.scheduled_at,
                      status: invite.status,
                      role: 'Requester'
                    })),
                    // Accepted invites that are completed or cancelled (invitee view)
                    ...bookings.filter(booking => 
                      booking.invitee_id === user?.id && 
                      (booking.status === 'completed' || booking.status === 'cancelled')
                    ).map(booking => ({
                      type: 'booking',
                      id: booking.id,
                      title: booking.invites?.title,
                      description: booking.invites?.description,
                      amount: booking.invites?.amount,
                      currency: booking.invites?.currency || 'USD',
                      duration_minutes: booking.invites?.duration_minutes || 60,
                      scheduled_at: booking.scheduled_at,
                      status: booking.status,
                      role: 'Invitee'
                    }))
                  ];

                  return pastMeetings.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No previous meetings yet</p>
                      <p className="text-xs text-muted-foreground mt-2">Completed and cancelled meetings will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pastMeetings.map((meeting, index) => (
                        <div key={`${meeting.type}-${meeting.id}-${index}`} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <h3 className="font-medium">{meeting.title}</h3>
                            <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                              <span>${meeting.amount} {meeting.role === 'Requester' ? 'paid' : 'earned'}</span>
                              {meeting.scheduled_at && (
                                <span>{format(new Date(meeting.scheduled_at), 'MMM d, yyyy \'at\' h:mm a')}</span>
                              )}
                              <Badge variant="secondary">{meeting.role}</Badge>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant={meeting.status === 'completed' ? 'default' : 'destructive'}>
                              {meeting.status === 'completed' ? 'Payment Released' : 'Cancelled'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;