import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, CreditCard, Shield, Clock, Calendar, Plus, X } from 'lucide-react';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';

const CreateInvite = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    recipientName: '',
    title: '',
    description: '',
    amount: '',
    duration: '60',
    meetingLink: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: ''
  });
  const [availableTimeSlots, setAvailableTimeSlots] = useState<Date[]>([]);
  const [newTimeSlot, setNewTimeSlot] = useState<Date>();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const formatCardNumber = (value: string) => {
    return value
      .replace(/\s/g, '')
      .replace(/(.{4})/g, '$1 ')
      .trim()
      .slice(0, 19);
  };

  const formatExpiryDate = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d{0,2})/, '$1/$2')
      .slice(0, 5);
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    setFormData(prev => ({
      ...prev,
      cardNumber: formatted
    }));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatExpiryDate(e.target.value);
    setFormData(prev => ({
      ...prev,
      expiryDate: formatted
    }));
  };

  const addTimeSlot = () => {
    if (newTimeSlot && !availableTimeSlots.find(slot => slot.getTime() === newTimeSlot.getTime())) {
      setAvailableTimeSlots(prev => [...prev, newTimeSlot].sort((a, b) => a.getTime() - b.getTime()));
      setNewTimeSlot(undefined);
    }
  };

  const removeTimeSlot = (index: number) => {
    setAvailableTimeSlots(prev => prev.filter((_, i) => i !== index));
  };

  const mockStripePayment = async () => {
    // Simulate Stripe API call
    console.log('Mock Stripe Payment Hold:', {
      amount: parseFloat(formData.amount) * 100, // Convert to cents
      card: {
        number: formData.cardNumber.replace(/\s/g, ''),
        expiry: formData.expiryDate,
        cvv: formData.cvv,
        name: formData.cardholderName
      }
    });

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Generate mock payment intent ID
    const paymentIntentId = `pi_mock_${Math.random().toString(36).substr(2, 9)}`;
    const cardLastFour = formData.cardNumber.replace(/\s/g, '').slice(-4);

    return {
      paymentIntentId,
      cardLastFour,
      status: 'held'
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Mock Stripe payment hold
      const paymentResult = await mockStripePayment();

      // Create invite in database
      const { data: inviteData, error: inviteError } = await supabase
        .from('invites')
        .insert([
          {
            creator_id: user?.id,
            title: formData.title,
            description: formData.description || null,
            amount: parseFloat(formData.amount),
            duration_minutes: parseInt(formData.duration),
            meeting_link: formData.meetingLink,
            payment_held: true,
            available_time_slots: availableTimeSlots.map(slot => slot.toISOString())
          }
        ])
        .select()
        .single();

      if (inviteError) throw inviteError;

      // Store mock payment record
      const { error: paymentError } = await supabase
        .from('mock_payments')
        .insert([
          {
            invite_id: inviteData.id,
            stripe_payment_intent_id: paymentResult.paymentIntentId,
            amount: parseFloat(formData.amount),
            card_last_four: paymentResult.cardLastFour,
            status: 'held'
          }
        ]);

      if (paymentError) throw paymentError;

      toast({
        title: 'Invite Created!',
        description: 'Your meeting request is ready to share. Payment is held until meeting completion.',
      });

      navigate(`/invite/${inviteData.id}`);
    } catch (error) {
      console.error('Error creating invite:', error);
      toast({
        title: 'Error',
        description: 'Failed to create invite. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate('/')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
          <h1 className="text-3xl font-bold">Create Meeting Request</h1>
          <p className="text-muted-foreground">Offer payment to get time with someone you want to meet</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Meeting Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="mr-2 h-5 w-5" />
                Meeting Details
              </CardTitle>
              <CardDescription>
                Describe the meeting you want to have and what you hope to discuss
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="recipientName">Recipient Name</Label>
                <Input
                  id="recipientName"
                  name="recipientName"
                  placeholder="e.g., Sarah Johnson (optional - leave blank for 'anyone with link')"
                  value={formData.recipientName}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="title">Reason for Meeting *</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="e.g., Want to discuss product strategy, Get career advice"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Additional Details</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Any additional context about what you'd like to discuss..."
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amount">Gift/Payment Amount ($) *</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    placeholder="100"
                    min="1"
                    step="0.01"
                    value={formData.amount}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    name="duration"
                    type="number"
                    placeholder="60"
                    min="15"
                    step="15"
                    value={formData.duration}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="meetingLink">Meeting Link *</Label>
                <Input
                  id="meetingLink"
                  name="meetingLink"
                  placeholder="https://zoom.us/j/123456789 or https://meet.google.com/abc-def-ghi"
                  value={formData.meetingLink}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div>
                <Label>Available Time Slots *</Label>
                <div className="space-y-4">
                  <div className="flex space-x-2">
                    <div className="flex-1">
                      <DateTimePicker
                        date={newTimeSlot}
                        setDate={setNewTimeSlot}
                        placeholder="Select datse and time"
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={addTimeSlot}
                      disabled={!newTimeSlot}
                      variant="outline"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {availableTimeSlots.length > 0 && (
                    <div className="border rounded-lg p-3 bg-muted/30">
                      <p className="text-sm font-medium mb-2">Selected Time Slots:</p>
                      <div className="space-y-1">
                        {availableTimeSlots.map((slot, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <span>{format(slot, 'MMM d, yyyy \'at\' h:mm a')}</span>
                            <Button 
                              type="button"
                              variant="ghost" 
                              size="sm"
                              onClick={() => removeTimeSlot(index)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {availableTimeSlots.length === 0 && (
                    <p className="text-sm text-muted-foreground">Add at least one time slot for people to book</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Payment Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="mr-2 h-5 w-5" />
                Payment Information
              </CardTitle>
              <CardDescription>
                Payment is held in escrow and released when the meeting is completed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="cardholderName">Cardholder Name *</Label>
                <Input
                  id="cardholderName"
                  name="cardholderName"
                  placeholder="John Doe"
                  value={formData.cardholderName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="cardNumber">Card Number *</Label>
                <Input
                  id="cardNumber"
                  name="cardNumber"
                  placeholder="1234 5678 9012 3456"
                  value={formData.cardNumber}
                  onChange={handleCardNumberChange}
                  maxLength={19}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="expiryDate">Expiry Date *</Label>
                  <Input
                    id="expiryDate"
                    name="expiryDate"
                    placeholder="MM/YY"
                    value={formData.expiryDate}
                    onChange={handleExpiryChange}
                    maxLength={5}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="cvv">CVV *</Label>
                  <Input
                    id="cvv"
                    name="cvv"
                    placeholder="123"
                    maxLength={4}
                    value={formData.cvv}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                <Shield className="h-4 w-4" />
                <span>Payment is held securely and only released after the meeting is completed</span>
              </div>
            </CardContent>
          </Card>

          <Button 
            type="submit" 
            className="w-full h-12 text-lg"
            disabled={isSubmitting || availableTimeSlots.length === 0}
            style={{ background: 'var(--gradient-trust)' }}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating Invite...
              </>
            ) : (
              'Create Request & Hold Payment'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default CreateInvite;