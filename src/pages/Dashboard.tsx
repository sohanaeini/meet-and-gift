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

  const fetchData = async () => {
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
            <TabsTrigger value="past">Past Meetings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="invites" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Meeting Requests</CardTitle>
                <CardDescription>People you want to meet by offering payment</CardDescription>
              </CardHeader>
              <CardContent>
                {invites.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No meeting requests yet</p>
                    <Button asChild className="mt-4">
                      <Link to="/create-invite">Create Your First Request</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                     {invites.filter(invite => 
                       invite.status === 'active' && invite.creator_id === user?.id
                     ).map((invite) => (
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
                            <Badge variant="secondary">Pending</Badge>
                            <Button variant="outline" size="sm" asChild>
                              <Link to={`/invite/${invite.id}`}>View</Link>
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="upcoming" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Meetings</CardTitle>
                <CardDescription>All your scheduled meetings (both as requester and invitee)</CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const upcomingMeetings = [
                    // Created invites that are booked (requester view)
                    ...invites.filter(invite => 
                      invite.creator_id === user?.id && invite.status === 'booked'
                    ).map(invite => ({
                      type: 'request',
                      id: invite.id,
                      title: invite.title,
                      amount: invite.amount,
                      scheduled_at: invite.bookings?.[0]?.scheduled_at,
                      status: 'booked',
                      role: 'Requester'
                    })),
                    // Accepted invites (invitee view)
                    ...bookings.filter(booking => 
                      booking.invitee_id === user?.id && 
                      booking.status !== 'completed' && 
                      booking.status !== 'cancelled'
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

                  return upcomingMeetings.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No upcoming meetings scheduled</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {upcomingMeetings.map((meeting, index) => (
                        <div key={`${meeting.type}-${meeting.id}-${index}`} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <h3 className="font-medium">{meeting.title}</h3>
                            <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                              <span>${meeting.amount} {meeting.role === 'Requester' ? 'paying' : 'earning'}</span>
                              <span>{format(new Date(meeting.scheduled_at!), 'MMM d, yyyy \'at\' h:mm a')}</span>
                              <Badge variant="secondary">{meeting.role}</Badge>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="default">Scheduled</Badge>
                            {meeting.type === 'request' && (
                              <Button variant="outline" size="sm" asChild>
                                <Link to={`/invite/${meeting.id}`}>View</Link>
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
                <CardTitle>Past Meetings</CardTitle>
                <CardDescription>All completed meetings where payment has been released</CardDescription>
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
                      <p className="text-muted-foreground">No completed meetings yet</p>
                      <p className="text-xs text-muted-foreground mt-2">When meetings are completed and confirmed, they'll appear here</p>
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
                              {meeting.status === 'completed' ? 'Completed' : 'Cancelled'}
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