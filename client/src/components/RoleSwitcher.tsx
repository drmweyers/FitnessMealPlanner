/**
 * Role Switcher Component
 * 
 * Development tool to test different user roles without needing multiple accounts.
 * This allows testing the role-based authorization system by temporarily switching
 * the user's role in the database.
 */

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, User, Shield, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function RoleSwitcher() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<string>(role || "client");

  const switchRole = useMutation({
    mutationFn: async (newRole: string) => {
      return apiRequest("POST", "/api/dev/switch-role", { role: newRole });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Role Updated",
        description: `Successfully switched to ${selectedRole} role`,
      });
      // Refresh the page to update navigation
      setTimeout(() => window.location.reload(), 1000);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to switch role",
        variant: "destructive",
      });
    },
  });

  const handleRoleSwitch = () => {
    if (selectedRole !== role) {
      switchRole.mutate(selectedRole);
    }
  };

  const getRoleIcon = (roleType: string) => {
    switch (roleType) {
      case "admin": return <Shield className="w-4 h-4" />;
      case "trainer": return <Users className="w-4 h-4" />;
      case "client": return <User className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  const getRoleColor = (roleType: string) => {
    switch (roleType) {
      case "admin": return "bg-red-100 text-red-800 border-red-200";
      case "trainer": return "bg-blue-100 text-blue-800 border-blue-200";
      case "client": return "bg-green-100 text-green-800 border-green-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Role Testing
        </CardTitle>
        <CardDescription>
          Switch between user roles to test the authorization system
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Current Role:</span>
          <Badge className={getRoleColor(role || "client")}>
            {getRoleIcon(role || "client")}
            <span className="ml-1 capitalize">{role || "client"}</span>
          </Badge>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Switch to:</label>
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-red-600" />
                  <span>Admin</span>
                </div>
              </SelectItem>
              <SelectItem value="trainer">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>Trainer</span>
                </div>
              </SelectItem>
              <SelectItem value="client">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-green-600" />
                  <span>Client</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleRoleSwitch}
          disabled={selectedRole === role || switchRole.isPending}
          className="w-full"
        >
          {switchRole.isPending ? "Switching..." : `Switch to ${selectedRole}`}
        </Button>

        <div className="text-xs text-slate-500 space-y-1">
          <p><strong>Admin:</strong> Recipe management, user stats, bulk operations</p>
          <p><strong>Trainer:</strong> Client management, meal plan creation</p>
          <p><strong>Client:</strong> View assigned meal plans and nutrition</p>
        </div>
      </CardContent>
    </Card>
  );
}