/**
 * Billing Page
 *
 * Comprehensive billing portal for trainers to manage subscriptions,
 * view usage, update payment methods, and access billing history.
 */

import { useState } from 'react';
import { SubscriptionOverview } from '../components/subscription/SubscriptionOverview';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { useQuery } from '@tanstack/react-query';
import { useUser } from '@/hooks/use-user';
import {
  CreditCard,
  Receipt,
  Download,
  Loader2,
  AlertCircle,
  Calendar,
  DollarSign,
} from 'lucide-react';
import { Redirect } from 'wouter';

interface BillingHistory {
  id: string;
  date: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed';
  description: string;
  invoiceUrl?: string;
}

export default function Billing() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState('overview');

  // Only trainers can access billing page
  if (user && user.role !== 'trainer') {
    return <Redirect to="/" />;
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return (
    <div className="container max-w-7xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Billing & Subscription</h1>
        <p className="text-muted-foreground">
          Manage your subscription, payment methods, and billing history
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto">
            <TabsTrigger value="overview">
              <CreditCard className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="payment">
              <DollarSign className="h-4 w-4 mr-2" />
              Payment Method
            </TabsTrigger>
            <TabsTrigger value="history">
              <Receipt className="h-4 w-4 mr-2" />
              Billing History
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <SubscriptionOverview />
          </TabsContent>

          {/* Payment Method Tab */}
          <TabsContent value="payment">
            <PaymentMethodSection />
          </TabsContent>

          {/* Billing History Tab */}
          <TabsContent value="history">
            <BillingHistorySection />
          </TabsContent>
        </Tabs>
    </div>
  );
}

function PaymentMethodSection() {
  const { data: paymentMethod, isLoading } = useQuery({
    queryKey: ['payment-method'],
    queryFn: async () => {
      const response = await fetch('/api/v1/payment-method', {
        credentials: 'include',
      });
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch payment method');
      }
      return response.json();
    },
  });

  const handleUpdatePaymentMethod = async () => {
    try {
      const response = await fetch('/api/v1/tiers/billing-portal', {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to open billing portal');
      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error opening billing portal:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Method</CardTitle>
        <CardDescription>
          Manage your payment method for subscription billing
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : paymentMethod ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-4">
                <CreditCard className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">
                    {paymentMethod.brand.toUpperCase()} •••• {paymentMethod.last4}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Expires {paymentMethod.expMonth}/{paymentMethod.expYear}
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={handleUpdatePaymentMethod}>
                Update
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No payment method on file. Add one to enable automatic billing.
              </AlertDescription>
            </Alert>
            <Button onClick={handleUpdatePaymentMethod}>
              Add Payment Method
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BillingHistorySection() {
  const { data: history, isLoading } = useQuery<BillingHistory[]>({
    queryKey: ['billing-history'],
    queryFn: async () => {
      const response = await fetch('/api/v1/billing-history', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch billing history');
      return response.json();
    },
  });

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const statusBadge = {
    paid: <Badge className="bg-green-500">Paid</Badge>,
    pending: <Badge className="bg-yellow-500">Pending</Badge>,
    failed: <Badge variant="destructive">Failed</Badge>,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing History</CardTitle>
        <CardDescription>
          View and download your past invoices
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : history && history.length > 0 ? (
          <div className="space-y-3">
            {history.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <Receipt className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{item.description}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(item.date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="font-semibold">
                    {formatAmount(item.amount, item.currency)}
                  </p>
                  {statusBadge[item.status]}
                  {item.invoiceUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(item.invoiceUrl, '_blank')}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No billing history yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
