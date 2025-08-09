import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './components/Login';
import MealPlanDashboard from './components/MealPlanDashboard';
import TrainerDashboard from './components/TrainerDashboard';
import CustomerDashboard from './components/CustomerDashboard';
import AdminPanel from './components/AdminPanel';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';

const PrivateRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({ 
  children, 
  allowedRoles 
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect based on role
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'trainer') return <Navigate to="/trainer" replace />;
    if (user.role === 'customer') return <Navigate to="/customer" replace />;
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Toaster position="top-right" />
          <Routes>
            <Route path="/" element={<Login />} />
            
            {/* Admin Routes */}
            <Route 
              path="/admin" 
              element={
                <PrivateRoute allowedRoles={['admin']}>
                  <AdminPanel />
                </PrivateRoute>
              } 
            />
            
            {/* Trainer Routes */}
            <Route 
              path="/trainer" 
              element={
                <PrivateRoute allowedRoles={['admin', 'trainer']}>
                  <TrainerDashboard />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/meal-plans" 
              element={
                <PrivateRoute allowedRoles={['admin', 'trainer']}>
                  <MealPlanDashboard />
                </PrivateRoute>
              } 
            />
            
            {/* Customer Routes */}
            <Route 
              path="/customer" 
              element={
                <PrivateRoute allowedRoles={['customer']}>
                  <CustomerDashboard />
                </PrivateRoute>
              } 
            />
            
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;