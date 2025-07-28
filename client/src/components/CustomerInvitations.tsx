import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Textarea } from "./ui/textarea";
import { Alert, AlertDescription } from "./ui/alert";
import { useToast } from "../hooks/use-toast";
import { useAuth } from "../contexts/AuthContext";

interface Invitation {
  id: string;
  customerEmail: string;
  token: string;
  expiresAt: string;
  usedAt?: string;
  createdAt: string;
  status: 'pending' | 'accepted' | 'expired';
}

export default function CustomerInvitations() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [customerEmail, setCustomerEmail] = useState("");
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);

  // Fetch invitations
  const { data: invitations, isLoading } = useQuery<Invitation[]>({
    queryKey: ['/api/invitations'],
    queryFn: async () => {
      const response = await fetch('/api/invitations', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch invitations');
      }
      
      const data = await response.json();
      return data.data.invitations;
    },
    enabled: !!user,
  });

  // Send invitation mutation
  const sendInvitationMutation = useMutation({
    mutationFn: async (data: { customerEmail: string; message?: string }) => {
      const response = await fetch('/api/invitations/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send invitation');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Invitation Sent",
        description: `Invitation sent to ${customerEmail} successfully.`,
      });
      setCustomerEmail("");
      setMessage("");
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ['/api/invitations'] });
      
      // In development, show the invitation link
      if (process.env.NODE_ENV === 'development' && data.data.invitation.invitationLink) {
        console.log('Invitation Link:', data.data.invitation.invitationLink);
        toast({
          title: "Development Mode",
          description: `Invitation link: ${data.data.invitation.invitationLink}`,
          duration: 10000,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSendInvitation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerEmail.trim()) {
      toast({
        title: "Error",
        description: "Please enter a customer email address.",
        variant: "destructive",
      });
      return;
    }

    sendInvitationMutation.mutate({
      customerEmail: customerEmail.trim(),
      message: message.trim() || undefined,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      case 'accepted':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Accepted</Badge>;
      case 'expired':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Expired</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!user || user.role !== 'trainer') {
    return (
      <Alert>
        <AlertDescription>
          You must be logged in as a trainer to access customer invitations.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Customer Invitations</h2>
          <p className="text-slate-600">Send invitations to customers so they can access meal plans you create.</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="sm:self-start"
        >
          <i className="fas fa-plus mr-2"></i>
          Send Invitation
        </Button>
      </div>

      {/* Invitation Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Send Customer Invitation</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendInvitation} className="space-y-4">
              <div>
                <Label htmlFor="customerEmail">Customer Email Address</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  placeholder="customer@example.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="message">Personal Message (Optional)</Label>
                <Textarea
                  id="message"
                  placeholder="Add a personal message to your invitation..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={sendInvitationMutation.isPending}
                >
                  {sendInvitationMutation.isPending ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Sending...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane mr-2"></i>
                      Send Invitation
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Invitations List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">Sent Invitations</h3>
        
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-slate-200 rounded w-48"></div>
                      <div className="h-3 bg-slate-200 rounded w-32"></div>
                    </div>
                    <div className="h-6 bg-slate-200 rounded w-16"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : invitations && invitations.length > 0 ? (
          <div className="space-y-3">
            {invitations.map((invitation) => (
              <Card key={invitation.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">
                          {invitation.customerEmail}
                        </span>
                        {getStatusBadge(invitation.status)}
                      </div>
                      
                      <div className="text-sm text-slate-600 space-y-1">
                        <div>
                          <i className="fas fa-calendar mr-1"></i>
                          Sent: {formatDate(invitation.createdAt)}
                        </div>
                        <div>
                          <i className="fas fa-clock mr-1"></i>
                          Expires: {formatDate(invitation.expiresAt)}
                        </div>
                        {invitation.usedAt && (
                          <div>
                            <i className="fas fa-check mr-1"></i>
                            Accepted: {formatDate(invitation.usedAt)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {invitation.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const link = `${window.location.origin}/register?invitation=${invitation.token}`;
                            navigator.clipboard.writeText(link);
                            toast({
                              title: "Link Copied",
                              description: "Invitation link copied to clipboard.",
                            });
                          }}
                        >
                          <i className="fas fa-copy mr-1"></i>
                          Copy Link
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <i className="fas fa-envelope text-4xl text-slate-300 mb-4"></i>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Invitations Sent</h3>
              <p className="text-slate-600 mb-4">
                You haven't sent any customer invitations yet.
              </p>
              <Button onClick={() => setShowForm(true)}>
                <i className="fas fa-plus mr-2"></i>
                Send Your First Invitation
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}