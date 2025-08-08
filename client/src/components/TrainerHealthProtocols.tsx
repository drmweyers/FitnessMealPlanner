/**
 * Trainer Health Protocols Component
 * 
 * This component allows trainers to create, manage, and assign specialized health protocols
 * (Longevity and Parasite Cleanse) to their clients. It extends the admin functionality
 * with client assignment capabilities.
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible';
import {
  Sparkles,
  Shield,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Settings,
  Activity,
  Clock,
  Bug,
  Leaf,
  Info,
  RefreshCw,
  Users,
  Send,
  Eye,
  Edit,
  Trash2,
  Plus,
  BookOpen,
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../contexts/AuthContext';

// Import specialized protocol components
import SpecializedProtocolsPanel from './SpecializedProtocolsPanel';

interface TrainerProtocol {
  id: string;
  name: string;
  type: 'longevity' | 'parasite_cleanse';
  description: string;
  duration: number;
  intensity: 'gentle' | 'moderate' | 'intensive';
  config: any; // Protocol configuration
  assignedClients: Array<{
    id: string;
    name: string;
    email: string;
    assignedAt: Date;
    status: 'active' | 'completed' | 'paused';
  }>;
  createdAt: Date;
  updatedAt: Date;
}

interface Client {
  id: string;
  name: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export default function TrainerHealthProtocols() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('create');
  const [selectedProtocol, setSelectedProtocol] = useState<TrainerProtocol | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [protocolName, setProtocolName] = useState('');
  const [protocolDescription, setProtocolDescription] = useState('');

  // Fetch trainer's protocols
  const { data: trainerProtocols, isLoading: protocolsLoading } = useQuery<TrainerProtocol[]>({
    queryKey: ['/api/trainer/health-protocols'],
    enabled: !!user,
  });

  // Fetch trainer's clients
  const { data: clients, isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ['/api/trainer/customers'],
    enabled: !!user,
  });

  // Assign protocol to clients mutation
  const assignProtocolMutation = useMutation({
    mutationFn: async (data: { protocolId: string; clientIds: string[]; notes?: string }) => {
      const response = await fetch('/api/trainer/health-protocols/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to assign protocol');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trainer/health-protocols'] });
      toast({
        title: 'Protocol Assigned',
        description: 'The health protocol has been assigned to selected clients.',
      });
      setShowAssignDialog(false);
      setSelectedClients([]);
    },
    onError: (error) => {
      toast({
        title: 'Assignment Failed',
        description: error instanceof Error ? error.message : 'Failed to assign protocol',
        variant: 'destructive',
      });
    },
  });

  // Save protocol mutation
  const saveProtocolMutation = useMutation({
    mutationFn: async (protocolData: any) => {
      const response = await fetch('/api/trainer/health-protocols', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(protocolData),
      });
      if (!response.ok) throw new Error('Failed to save protocol');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trainer/health-protocols'] });
      toast({
        title: 'Protocol Saved',
        description: 'Your health protocol has been saved successfully.',
      });
      setProtocolName('');
      setProtocolDescription('');
    },
    onError: (error) => {
      toast({
        title: 'Save Failed',
        description: error instanceof Error ? error.message : 'Failed to save protocol',
        variant: 'destructive',
      });
    },
  });

  const handleAssignProtocol = (protocol: TrainerProtocol) => {
    setSelectedProtocol(protocol);
    setShowAssignDialog(true);
  };

  const handleSaveProtocol = (protocolConfig: any, type: 'longevity' | 'parasite_cleanse') => {
    if (!protocolName.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please enter a name for your protocol.',
        variant: 'destructive',
      });
      return;
    }

    const protocolData = {
      name: protocolName,
      description: protocolDescription,
      type,
      config: protocolConfig,
    };

    saveProtocolMutation.mutate(protocolData);
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="create">Create Protocols</TabsTrigger>
          <TabsTrigger value="manage">Manage Protocols</TabsTrigger>
          <TabsTrigger value="assignments">Client Assignments</TabsTrigger>
        </TabsList>

        {/* Create Protocols Tab */}
        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create New Health Protocol
              </CardTitle>
              <CardDescription>
                Design specialized health protocols for your clients using longevity and detox strategies.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="protocol-name">Protocol Name</Label>
                  <Input
                    id="protocol-name"
                    placeholder="e.g., 30-Day Longevity Protocol"
                    value={protocolName}
                    onChange={(e) => setProtocolName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="protocol-description">Description</Label>
                  <Textarea
                    id="protocol-description"
                    placeholder="Brief description of the protocol's goals and benefits"
                    value={protocolDescription}
                    onChange={(e) => setProtocolDescription(e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Specialized Protocols Panel */}
          <div className="relative">
            <SpecializedProtocolsPanel 
              onConfigChange={(config) => {
                console.log('Protocol config updated:', config);
              }}
              showDashboard={true}
            />
          </div>
        </TabsContent>

        {/* Manage Protocols Tab */}
        <TabsContent value="manage" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Your Health Protocols</h3>
              <p className="text-sm text-muted-foreground">
                Manage and assign your saved health protocols.
              </p>
            </div>
          </div>

          {protocolsLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading protocols...</span>
            </div>
          ) : !trainerProtocols?.length ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Protocols Yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create your first health protocol to get started with specialized client programs.
                </p>
                <Button onClick={() => setActiveTab('create')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Protocol
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {trainerProtocols?.map((protocol) => (
                <Card key={protocol.id}>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <div className="space-y-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        {protocol.type === 'longevity' ? (
                          <Sparkles className="h-4 w-4 text-yellow-500" />
                        ) : (
                          <Shield className="h-4 w-4 text-green-500" />
                        )}
                        {protocol.name}
                        <Badge variant={protocol.type === 'longevity' ? 'default' : 'secondary'}>
                          {protocol.type === 'longevity' ? 'Longevity' : 'Parasite Cleanse'}
                        </Badge>
                      </CardTitle>
                      <CardDescription>{protocol.description}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAssignProtocol(protocol)}
                      >
                        <Users className="h-4 w-4 mr-1" />
                        Assign
                      </Button>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Duration:</span>
                        <p className="text-muted-foreground">{protocol.duration} days</p>
                      </div>
                      <div>
                        <span className="font-medium">Intensity:</span>
                        <p className="text-muted-foreground capitalize">{protocol.intensity}</p>
                      </div>
                      <div>
                        <span className="font-medium">Assigned:</span>
                        <p className="text-muted-foreground">
                          {protocol.assignedClients?.length || 0} clients
                        </p>
                      </div>
                      <div>
                        <span className="font-medium">Created:</span>
                        <p className="text-muted-foreground">
                          {new Date(protocol.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Client Assignments Tab */}
        <TabsContent value="assignments" className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold">Protocol Assignments</h3>
            <p className="text-sm text-muted-foreground">
              View and manage protocol assignments for your clients.
            </p>
          </div>

          {/* Assignment overview cards would go here */}
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Activity className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Assignment Overview</h3>
              <p className="text-muted-foreground text-center">
                Track your clients' progress on assigned health protocols.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Assign Protocol Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Assign Protocol to Clients</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedProtocol && (
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium">{selectedProtocol.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedProtocol.description}
                </p>
              </div>
            )}

            <div>
              <Label>Select Clients</Label>
              <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                {clientsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    Loading clients...
                  </div>
                ) : !clients?.length ? (
                  <p className="text-muted-foreground text-sm py-4">
                    No clients available. Invite clients to start assigning protocols.
                  </p>
                ) : (
                  clients.map((client) => (
                    <div key={client.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={client.id}
                        checked={selectedClients.includes(client.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedClients([...selectedClients, client.id]);
                          } else {
                            setSelectedClients(selectedClients.filter(id => id !== client.id));
                          }
                        }}
                      />
                      <Label htmlFor={client.id} className="flex-1">
                        {client.name || `${client.firstName} ${client.lastName}`} ({client.email})
                      </Label>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedProtocol && selectedClients.length > 0) {
                    assignProtocolMutation.mutate({
                      protocolId: selectedProtocol.id,
                      clientIds: selectedClients,
                    });
                  }
                }}
                disabled={assignProtocolMutation.isPending || selectedClients.length === 0}
              >
                {assignProtocolMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Assign Protocol
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}