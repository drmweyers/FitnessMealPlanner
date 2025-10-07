import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import MealPlanGenerator from './MealPlanGenerator';
import RecipeManager from './RecipeManager';
import CustomerMealPlans from './CustomerMealPlans';
import { LogOut, ChefHat, FileText, Users, Home } from 'lucide-react';

const MealPlanDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('generator');

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navigateToRole = () => {
    if (user?.role === 'admin') navigate('/admin');
    if (user?.role === 'trainer') navigate('/trainer');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <ChefHat className="h-8 w-8 text-green-600 mr-3" />
              <h1 className="text-xl font-bold text-gray-900">
                Fitness Meal Planner
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {user?.username || user?.email}
              </span>
              <button
                onClick={navigateToRole}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition"
              >
                <Home className="h-4 w-4 mr-1" />
                Dashboard
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-8 bg-gray-100 p-1 rounded-lg max-w-2xl">
          <button
            onClick={() => setActiveTab('generator')}
            className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition ${
              activeTab === 'generator'
                ? 'bg-white text-green-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ChefHat className="h-4 w-4 mr-2" />
            Meal Plan Generator
          </button>
          <button
            onClick={() => setActiveTab('recipes')}
            className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition ${
              activeTab === 'recipes'
                ? 'bg-white text-green-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText className="h-4 w-4 mr-2" />
            Recipe Manager
          </button>
          <button
            onClick={() => setActiveTab('customer-plans')}
            className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition ${
              activeTab === 'customer-plans'
                ? 'bg-white text-green-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users className="h-4 w-4 mr-2" />
            Customer Plans
          </button>
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-lg shadow min-h-[600px]">
          {activeTab === 'generator' && <MealPlanGenerator />}
          {activeTab === 'recipes' && <RecipeManager />}
          {activeTab === 'customer-plans' && <CustomerMealPlans />}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>Fitness Meal Planner v1.0</p>
          <p className="mt-1">© 2025 EvoFit Meal Solutions</p>
        </div>
      </div>
    </div>
  );
};

export default MealPlanDashboard;