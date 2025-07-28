import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary to-primary/80 text-white">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-12 sm:py-16 md:py-20 lg:py-24">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4 sm:mb-6">
              <i className="fas fa-utensils text-2xl sm:text-3xl lg:text-4xl"></i>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold">
                FitMeal Pro
              </h1>
            </div>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl mb-4 sm:mb-6 lg:mb-8 text-primary-foreground/90">
              AI-Powered Fitness Meal Plan Generator
            </p>
            <p className="text-sm sm:text-base lg:text-lg mb-8 sm:mb-10 lg:mb-12 text-primary-foreground/80 max-w-xs sm:max-w-lg lg:max-w-2xl mx-auto leading-relaxed">
              Discover thousands of healthy, delicious recipes tailored to your fitness goals. 
              Powered by advanced AI to create personalized meal plans that fuel your success.
            </p>
            <Button 
              size="lg" 
              className="bg-white text-primary hover:bg-white/90 text-sm sm:text-base lg:text-lg px-6 sm:px-8 py-3 sm:py-4 h-auto font-medium shadow-lg hover:shadow-xl transition-all duration-200"
              onClick={() => window.location.href = '/api/login'}
            >
              <i className="fas fa-sign-in-alt mr-2"></i>
              <span className="hidden sm:inline">Get Started Today</span>
              <span className="sm:hidden">Get Started</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-12 sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-12 lg:mb-16">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 mb-3 sm:mb-4">
              Why Choose FitMeal Pro?
            </h2>
            <p className="text-sm sm:text-base lg:text-lg text-slate-600 max-w-xs sm:max-w-lg lg:max-w-2xl mx-auto leading-relaxed">
              Everything you need to plan, prepare, and enjoy healthy meals that support your fitness journey.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <Card className="text-center p-4 sm:p-6 lg:p-8 hover:shadow-lg transition-all duration-200 border-0 shadow-md">
              <CardContent className="p-0">
                <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  <i className="fas fa-robot text-primary text-lg sm:text-xl lg:text-2xl"></i>
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-3 sm:mb-4">
                  AI-Generated Recipes
                </h3>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  Thousands of unique, healthy recipes created by advanced AI technology and reviewed by nutrition experts.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center p-4 sm:p-6 lg:p-8 hover:shadow-lg transition-all duration-200 border-0 shadow-md">
              <CardContent className="p-0">
                <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  <i className="fas fa-filter text-secondary text-lg sm:text-xl lg:text-2xl"></i>
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-3 sm:mb-4">
                  Smart Filtering
                </h3>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  Find perfect recipes with advanced filters for dietary restrictions, prep time, calories, and macros.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center p-4 sm:p-6 lg:p-8 hover:shadow-lg transition-all duration-200 border-0 shadow-md md:col-span-3 lg:col-span-1">
              <CardContent className="p-0">
                <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  <i className="fas fa-chart-line text-green-600 text-lg sm:text-xl lg:text-2xl"></i>
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-3 sm:mb-4">
                  Nutrition Tracking
                </h3>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  Detailed nutrition information for every recipe to help you meet your fitness and health goals.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-white py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 text-center">
            <div className="p-4 sm:p-6">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary mb-2">
                2,000+
              </div>
              <div className="text-sm sm:text-base text-slate-600 font-medium">
                Healthy Recipes
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-secondary mb-2">
                50+
              </div>
              <div className="text-sm sm:text-base text-slate-600 font-medium">
                Dietary Options
              </div>
            </div>
            <div className="p-4 sm:p-6 sm:col-span-3 lg:col-span-1">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-purple-600 mb-2">
                24/7
              </div>
              <div className="text-sm sm:text-base text-slate-600 font-medium">
                AI Generation
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-slate-900 text-white py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 text-center">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">
            Ready to Transform Your Nutrition?
          </h2>
          <p className="text-sm sm:text-base lg:text-xl mb-6 sm:mb-8 text-slate-300 max-w-xs sm:max-w-lg lg:max-w-2xl mx-auto leading-relaxed">
            Join thousands of fitness enthusiasts who trust FitMeal Pro for their meal planning needs.
          </p>
          <Button 
            size="lg" 
            className="bg-primary hover:bg-primary/90 text-white text-sm sm:text-base lg:text-lg px-6 sm:px-8 py-3 sm:py-4 h-auto font-medium shadow-lg hover:shadow-xl transition-all duration-200"
            onClick={() => window.location.href = '/api/login'}
          >
            <i className="fas fa-rocket mr-2"></i>
            <span className="hidden sm:inline">Start Your Journey Today</span>
            <span className="sm:hidden">Start Journey</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
