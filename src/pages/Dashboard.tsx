import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Calendar, DollarSign, Clock, Users } from 'lucide-react';
import { format } from 'date-fns';

interface Invite {
  id: string;
  title: string;
  description: string;
  amount: number;
  status: string;
  created_at: string;
  bookings?: Booking[];
}

interface Booking {
  id: string;
  scheduled_at: string;
  status: string;
  invites?: {
    title: string;
    amount: number;
  };
}

const Dashboard = () => {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
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
            status
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
          <Button asChild className="bg-primary hover:bg-primary/90">
            <Link to="/create-invite">
              <Plus className="mr-2 h-4 w-4" />
              Create Invite
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Requests</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{invites.filter(i => i.status === 'active').length}</div>
              <p className="text-xs text-muted-foreground">Awaiting acceptance</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${invites.filter(i => i.status === 'completed').reduce((acc, i) => acc + i.amount, 0)}
              </div>
              <p className="text-xs text-muted-foreground">On completed meetings</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${bookings.filter(b => b.status === 'completed').reduce((acc, b) => acc + (b.invites?.amount || 0), 0)}
              </div>
              <p className="text-xs text-muted-foreground">From accepted meetings</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Meetings</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {[...invites.filter(i => i.bookings?.some(b => new Date(b.scheduled_at) > new Date())), 
                  ...bookings.filter(b => new Date(b.scheduled_at) > new Date())].length}
              </div>
              <p className="text-xs text-muted-foreground">Scheduled meetings</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="invites" className="w-full">
          <TabsList>
            <TabsTrigger value="invites">My Requests</TabsTrigger>
            <TabsTrigger value="bookings">Meetings I'm Paid For</TabsTrigger>
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
                    {invites.map((invite) => {
                      const hasBooking = invite.bookings && invite.bookings.length > 0;
                      const statusText = invite.status === 'active' ? 'Pending Acceptance' :
                                       invite.status === 'booked' ? 'Scheduled' :
                                       invite.status === 'completed' ? 'Completed' : 
                                       invite.status.charAt(0).toUpperCase() + invite.status.slice(1);
                      
                      return (
                        <div key={invite.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <h3 className="font-medium">{invite.title}</h3>
                            <p className="text-sm text-muted-foreground">{invite.description}</p>
                            <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                              <span>${invite.amount} offered</span>
                              <span>Created {format(new Date(invite.created_at), 'MMM d, yyyy')}</span>
                              {hasBooking && (
                                <span>Meeting scheduled</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant={invite.status === 'completed' ? 'default' : 'secondary'}>
                              {statusText}
                            </Badge>
                            <Button variant="outline" size="sm" asChild>
                              <Link to={`/invite/${invite.id}`}>View</Link>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bookings" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Paid Meetings</CardTitle>
                <CardDescription>Meetings where you're being paid for your time</CardDescription>
              </CardHeader>
              <CardContent>
                {bookings.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No paid meetings yet</p>
                    <p className="text-xs text-muted-foreground mt-2">When someone sends you a paid meeting link, it will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bookings.map((booking) => {
                      const statusText = booking.status === 'scheduled' ? 'Upcoming' :
                                       booking.status === 'completed' ? 'Completed - Paid' :
                                       booking.status.charAt(0).toUpperCase() + booking.status.slice(1);
                      
                      return (
                        <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <h3 className="font-medium">{booking.invites?.title}</h3>
                            <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                              <span>Earning ${booking.invites?.amount}</span>
                              <span>{format(new Date(booking.scheduled_at), 'MMM d, yyyy \'at\' h:mm a')}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant={booking.status === 'completed' ? 'default' : 'secondary'}>
                              {statusText}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;