import { useAuth } from "@/hooks/useAuth";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Dumbbell, User } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function RoleSetup() {
  const { user } = useAuth();
  const { toast } = useToast();

  const updateRole = useMutation({
    mutationFn: async (role: string) => {
      const response = await apiRequest('POST', '/api/users/setup-role', { role });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Role Updated",
        description: "Redirecting to your dashboard...",
      });
      setTimeout(() => window.location.href = "/", 1500);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-full max-w-4xl p-6">
        <Card className="mb-8">
          <CardHeader className="text-center">
            <CardTitle>Role-Based Authentication Demo</CardTitle>
            <CardDescription>
              Welcome to FitMeal Pro! Current role: <Badge variant={user?.role ? "default" : "secondary"}>{user?.role || 'No role assigned'}</Badge>
              {user?.role && <span className="block mt-2 text-sm">Click below to change your role</span>}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <p className="text-slate-600">
                Welcome, {user?.firstName || user?.email || 'User'}!
              </p>
              <p className="text-sm text-slate-500">
                User ID: {user?.id}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Admin Role */}
          <Card className="border-red-200 bg-red-50">
            <CardHeader className="text-center">
              <Crown className="h-8 w-8 text-red-600 mx-auto mb-2" />
              <CardTitle className="text-red-900">Admin</CardTitle>
              <CardDescription>
                Full access to recipe management, user management, and system administration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• Manage all recipes</li>
                <li>• Approve/reject recipes</li>
                <li>• Generate new recipes</li>
                <li>• View system statistics</li>
                <li>• Manage user roles</li>
              </ul>
              <Button 
                className="w-full" 
                variant={user?.role === 'admin' ? 'default' : 'outline'}
                onClick={() => updateRole.mutate('admin')}
                disabled={updateRole.isPending}
              >
                {user?.role === 'admin' ? 'Current Role' : 'Set as Admin'}
              </Button>
            </CardContent>
          </Card>

          {/* Trainer Role */}
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="text-center">
              <Dumbbell className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <CardTitle className="text-green-900">Fitness Trainer</CardTitle>
              <CardDescription>
                Create meal plans for clients and access approved recipes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• Generate meal plans</li>
                <li>• Assign meal plans to clients</li>
                <li>• View approved recipes</li>
                <li>• Manage client profiles</li>
                <li>• Track client progress</li>
              </ul>
              <Button 
                className="w-full" 
                variant={user?.role === 'trainer' ? 'default' : 'outline'}
                onClick={() => updateRole.mutate('trainer')}
                disabled={updateRole.isPending}
              >
                {user?.role === 'trainer' ? 'Current Role' : 'Set as Trainer'}
              </Button>
            </CardContent>
          </Card>

          {/* Client Role */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="text-center">
              <User className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <CardTitle className="text-blue-900">Client</CardTitle>
              <CardDescription>
                View assigned meal plans and track nutrition goals
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• View assigned meal plans</li>
                <li>• Track nutrition progress</li>
                <li>• Access meal recipes</li>
                <li>• Update fitness goals</li>
                <li>• View meal history</li>
              </ul>
              <Button 
                className="w-full" 
                variant={user?.role === 'client' ? 'default' : 'outline'}
                onClick={() => updateRole.mutate('client')}
                disabled={updateRole.isPending}
              >
                {user?.role === 'client' ? 'Current Role' : 'Set as Client'}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-8">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <p className="text-slate-600">
                After selecting a role, you'll be redirected to the appropriate dashboard.
              </p>
              <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Refresh Page
                </Button>
                <Button variant="outline" onClick={() => window.location.href = "/api/logout"}>
                  Logout
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}