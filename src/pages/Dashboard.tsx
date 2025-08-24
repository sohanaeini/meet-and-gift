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
    title: string;
    amount: number;
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
        fetchData();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user]);

  // Refetch data when returning to dashboard route
  useEffect(() => {
    if (user && location.pathname === '/dashboard') {
      fetchData();
    }
  }, [location.pathname, user]);

  // Add visibility change listener for better real-time updates
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        fetchData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

  const fetchData = async () => {
    setLoadingData(true);
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
        .eq('creator_id', user?.id)
        .order('created_at', { ascending: false });

      if (invitesError) throw invitesError;

      // Fetch user's bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          invites(
            title,
            amount
          )
        `)
        .eq('invitee_id', user?.id)
        .order('created_at', { ascending: false });

      if (bookingsError) throw bookingsError;

      console.log('Dashboard data fetched:', {
        invites: invitesData?.length || 0,
        bookings: bookingsData?.length || 0,
        inviteStatuses: invitesData?.map(i => ({ id: i.id, status: i.status, title: i.title }))
      });

      setInvites(invitesData || []);
      setBookings(bookingsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
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
                  const upcomingMeetings = [
                    // Created invites that are booked (requester view - you created the invite and someone accepted it)
                    ...invites.filter(invite => 
                      invite.creator_id === user?.id && 
                      invite.status === 'booked'
                    ).map(invite => ({
                      type: 'request',
                      id: invite.id,
                      title: invite.title,
                      amount: invite.amount,
                      scheduled_at: invite.bookings?.[0]?.scheduled_at,
                      status: 'booked',
                      role: 'Requester',
                      meeting_confirmed: invite.meeting_confirmed
                    })),
                    // Accepted invites (invitee view - you accepted someone's invite)
                    ...bookings.filter(booking => 
                      booking.invitee_id === user?.id && 
                      booking.status === 'scheduled'
                    ).map(booking => ({
                      type: 'booking',
                      id: booking.id,
                      title: booking.invites?.title,
                      amount: booking.invites?.amount,
                      scheduled_at: booking.scheduled_at,
                      status: booking.status,
                      role: 'Invitee',
                      meeting_confirmed: false
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
                      amount: invite.amount,
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
                      amount: booking.invites?.amount,
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