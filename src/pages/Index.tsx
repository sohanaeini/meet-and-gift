import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, DollarSign, Shield, Users, Calendar, Clock, Star } from 'lucide-react';

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--gradient-trust)' }}>
              <span className="text-white font-bold">P</span>
            </div>
            <span className="font-bold text-xl">Pay-to-Meet</span>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Button variant="outline" asChild>
                  <Link to="/dashboard">Dashboard</Link>
                </Button>
                <Button asChild>
                  <Link to="/create-invite">Create Request</Link>
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" asChild>
                  <Link to="/auth">Sign In</Link>
                </Button>
                <Button asChild>
                  <Link to="/auth">Get Started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4" style={{ background: 'var(--gradient-secondary)' }}>
        <div className="container mx-auto text-center max-w-4xl">
          <Badge className="mb-6 px-4 py-1" style={{ background: 'var(--gradient-trust)' }}>
            💰 Secure Escrow Payments
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Pay For Someone's Time
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Connect with experts by offering payment for their time. Secure escrow ensures 
            fair payment and builds trust between you and the expert.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="h-12 px-8 text-lg" asChild>
              <Link to={user ? "/create-invite" : "/auth"}>
                Find Someone to Pay
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 text-lg">
              See How It Works
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-muted-foreground">Simple, secure, and transparent</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--gradient-trust)' }}>
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
                <CardTitle>1. Offer & Pay</CardTitle>
                <CardDescription>
                  Create a meeting request with payment. We securely hold your payment in escrow until the meeting happens.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--gradient-trust)' }}>
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <CardTitle>2. Share & Connect</CardTitle>
                <CardDescription>
                  Share your meeting request. Experts can see your offer and book time slots if interested.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--gradient-trust)' }}>
                  <CheckCircle2 className="h-6 w-6 text-white" />
                </div>
                <CardTitle>3. Meet & Pay</CardTitle>
                <CardDescription>
                  After the meeting, confirm completion. Payment is instantly released to the expert who helped you.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-muted/20">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose Pay-to-Meet?</h2>
            <p className="text-xl text-muted-foreground">Built for people who need expert help</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="space-y-8">
                <div className="flex items-start space-x-4">
                  <Shield className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Secure Escrow System</h3>
                    <p className="text-muted-foreground">
                      Payments are held securely until meetings are confirmed, ensuring experts get paid fairly.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <Clock className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Flexible Scheduling</h3>
                    <p className="text-muted-foreground">
                      Experts can book time slots that work for both of you with built-in calendar integration.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <Users className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Easy Requesting</h3>
                    <p className="text-muted-foreground">
                      Generate unique meeting requests that can be shared anywhere - social media, email, or messaging.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <Star className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Professional Dashboard</h3>
                    <p className="text-muted-foreground">
                      Track all your meeting requests, payments, and connections in one beautiful, intuitive dashboard.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <Card className="p-6 shadow-lg" style={{ boxShadow: 'var(--shadow-elegant)' }}>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Strategy Call</span>
                    <Badge>$150</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    60-minute discussion about product roadmap and market strategy
                  </p>
                  <div className="flex items-center space-x-2 text-sm">
                    <Calendar className="h-4 w-4" />
                    <span>Available slots this week</span>
                  </div>
                  <Button className="w-full">Book Meeting</Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Connect with Experts?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join people who are getting valuable time with experts by offering fair payment.
          </p>
          <Button size="lg" className="h-12 px-8 text-lg" asChild>
            <Link to={user ? "/create-invite" : "/auth"}>
              Create Your First Request
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: 'var(--gradient-trust)' }}>
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <span className="font-bold">Pay-to-Meet</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2024 Pay-to-Meet. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
