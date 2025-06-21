import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary to-primary/80 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-6">
              <i className="fas fa-utensils text-4xl"></i>
              <h1 className="text-4xl md:text-6xl font-bold">FitMeal Pro</h1>
            </div>
            <p className="text-xl md:text-2xl mb-8 text-primary-foreground/90">
              AI-Powered Fitness Meal Plan Generator
            </p>
            <p className="text-lg mb-12 text-primary-foreground/80 max-w-2xl mx-auto">
              Discover thousands of healthy, delicious recipes tailored to your fitness goals. 
              Powered by advanced AI to create personalized meal plans that fuel your success.
            </p>
            <Button 
              size="lg" 
              className="bg-white text-primary hover:bg-white/90 text-lg px-8 py-3"
              onClick={() => window.location.href = '/api/login'}
            >
              <i className="fas fa-sign-in-alt mr-2"></i>
              Get Started
            </Button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Why Choose FitMeal Pro?
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Everything you need to plan, prepare, and enjoy healthy meals that support your fitness journey.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center p-8 hover:shadow-lg transition-shadow">
              <CardContent>
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <i className="fas fa-robot text-primary text-2xl"></i>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-4">AI-Generated Recipes</h3>
                <p className="text-slate-600">
                  Thousands of unique, healthy recipes created by advanced AI technology and reviewed by nutrition experts.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center p-8 hover:shadow-lg transition-shadow">
              <CardContent>
                <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <i className="fas fa-filter text-secondary text-2xl"></i>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-4">Smart Filtering</h3>
                <p className="text-slate-600">
                  Find perfect recipes with advanced filters for dietary restrictions, prep time, calories, and macros.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center p-8 hover:shadow-lg transition-shadow">
              <CardContent>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <i className="fas fa-chart-line text-green-600 text-2xl"></i>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-4">Nutrition Tracking</h3>
                <p className="text-slate-600">
                  Detailed nutrition information for every recipe to help you meet your fitness and health goals.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">2,000+</div>
              <div className="text-slate-600">Healthy Recipes</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-secondary mb-2">50+</div>
              <div className="text-slate-600">Dietary Options</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-purple-600 mb-2">24/7</div>
              <div className="text-slate-600">AI Generation</div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-slate-900 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Transform Your Nutrition?
          </h2>
          <p className="text-xl mb-8 text-slate-300">
            Join thousands of fitness enthusiasts who trust FitMeal Pro for their meal planning needs.
          </p>
          <Button 
            size="lg" 
            className="bg-primary hover:bg-primary/90 text-white text-lg px-8 py-3"
            onClick={() => window.location.href = '/api/login'}
          >
            <i className="fas fa-rocket mr-2"></i>
            Start Your Journey
          </Button>
        </div>
      </div>
    </div>
  );
}
