import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function FallbackUI() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <i className="fas fa-utensils text-primary text-2xl"></i>
              <span className="text-xl font-bold text-slate-800">FitMeal Pro</span>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = '/api/login'}
              >
                <i className="fas fa-sign-in-alt mr-2"></i>
                Login
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="recipes" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="recipes">
              <i className="fas fa-book-open mr-2"></i>
              Browse Recipes
            </TabsTrigger>
            <TabsTrigger value="meal-plan">
              <i className="fas fa-utensils mr-2"></i>
              Meal Plan Generator
            </TabsTrigger>
            <TabsTrigger value="admin">
              <i className="fas fa-cog mr-2"></i>
              Admin
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recipes">
            <Card className="text-center py-12">
              <CardContent>
                <i className="fas fa-database text-4xl text-slate-300 mb-4"></i>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Database Connection Issue</h3>
                <p className="text-slate-600 mb-4">Unable to connect to database. Please try again in a moment.</p>
                <Button onClick={() => window.location.reload()}>
                  <i className="fas fa-refresh mr-2"></i>
                  Retry
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="meal-plan">
            <Card className="text-center py-12">
              <CardContent>
                <i className="fas fa-utensils text-4xl text-slate-300 mb-4"></i>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Meal Plan Generator</h3>
                <p className="text-slate-600 mb-4">Database connection required to generate meal plans.</p>
                <Button onClick={() => window.location.reload()}>
                  <i className="fas fa-refresh mr-2"></i>
                  Retry Connection
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="admin">
            <Card className="text-center py-12">
              <CardContent>
                <i className="fas fa-cog text-4xl text-slate-300 mb-4"></i>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Admin Panel</h3>
                <p className="text-slate-600 mb-4">Admin features require database connectivity.</p>
                <Button onClick={() => window.location.reload()}>
                  <i className="fas fa-refresh mr-2"></i>
                  Retry Connection
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}