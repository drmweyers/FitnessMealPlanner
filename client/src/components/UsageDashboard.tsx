/**
 * Usage Dashboard Component
 *
 * Displays current usage statistics for trainers:
 * - Current month's meal plan generation count
 * - Usage limit (if on one-time payment)
 * - Progress bar with visual warnings
 * - Reset date
 * - Upgrade CTA when approaching limit
 *
 * Payment Type Behavior:
 * - Subscription: Shows "Unlimited" with current usage count
 * - One-time: Shows usage bar with limit and upgrade CTA
 * - Grandfathered: Shows "Unlimited (Legacy)" with current usage count
 */

import React, { useEffect, useState } from 'react';
import { Activity, TrendingUp, Calendar, Zap, AlertTriangle, CheckCircle, Crown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface UsageStats {
  paymentType: 'subscription' | 'onetime' | 'grandfather';
  tier: 'starter' | 'professional' | 'enterprise';
  isUnlimited: boolean;
  currentUsage: number;
  limit: number | null;
  usagePercentage: number;
  resetDate: Date;
  subscriptionStatus?: string;
  warningLevel: 'low' | 'medium' | 'high';
}

export default function UsageDashboard() {
  const { user } = useAuth();
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsageStats();
  }, []);

  const fetchUsageStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/usage/stats', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch usage statistics');
      }

      const data = await response.json();
      setUsageStats(data);
    } catch (err) {
      console.error('Error fetching usage stats:', err);
      setError('Failed to load usage statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !usageStats) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error || 'Unable to load usage statistics'}</p>
      </div>
    );
  }

  const {
    paymentType,
    tier,
    isUnlimited,
    currentUsage,
    limit,
    usagePercentage,
    resetDate,
    warningLevel,
  } = usageStats;

  // Format tier name
  const tierName = tier.charAt(0).toUpperCase() + tier.slice(1);

  // Format reset date
  const resetDateFormatted = new Date(resetDate).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Determine progress bar color
  const getProgressBarColor = () => {
    if (isUnlimited) return 'bg-green-500';
    if (warningLevel === 'high') return 'bg-red-500';
    if (warningLevel === 'medium') return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // Determine status badge
  const getStatusBadge = () => {
    if (isUnlimited) {
      if (paymentType === 'grandfather') {
        return (
          <div className="flex items-center gap-2 bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
            <Crown className="w-4 h-4" />
            <span>Legacy Unlimited</span>
          </div>
        );
      }
      return (
        <div className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
          <Zap className="w-4 h-4" />
          <span>Unlimited</span>
        </div>
      );
    }

    if (warningLevel === 'high') {
      return (
        <div className="flex items-center gap-2 bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
          <AlertTriangle className="w-4 h-4" />
          <span>Approaching Limit</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
        <CheckCircle className="w-4 h-4" />
        <span>Good Standing</span>
      </div>
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Monthly Usage
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {tierName} {paymentType === 'subscription' ? 'Pro' : ''} Plan
            </p>
          </div>
          {getStatusBadge()}
        </div>
      </div>

      {/* Usage Stats */}
      <div className="p-6">
        {/* Usage Counter */}
        <div className="mb-6">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-3xl font-bold text-gray-900">{currentUsage}</span>
            <span className="text-sm text-gray-500">
              {isUnlimited ? 'plans generated' : `of ${limit} plans`}
            </span>
          </div>

          {/* Progress Bar */}
          {!isUnlimited && limit && (
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full ${getProgressBarColor()} transition-all duration-500 ease-out`}
                style={{ width: `${Math.min(usagePercentage, 100)}%` }}
              />
            </div>
          )}

          {/* Unlimited Badge */}
          {isUnlimited && (
            <div className="flex items-center gap-2 text-sm text-green-600 mt-2">
              <Zap className="w-4 h-4" />
              <span>Unlimited meal plan generation</span>
            </div>
          )}
        </div>

        {/* Reset Date */}
        {!isUnlimited && (
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <Calendar className="w-4 h-4" />
            <span>Resets on {resetDateFormatted}</span>
          </div>
        )}

        {/* Warning Message */}
        {!isUnlimited && warningLevel === 'high' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-900">
                  You're approaching your monthly limit
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  You've used {usagePercentage}% of your monthly meal plan generation limit.
                  Consider upgrading for unlimited access.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Limit Exceeded Message */}
        {!isUnlimited && limit && currentUsage >= limit && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900">
                  Monthly limit reached
                </p>
                <p className="text-sm text-red-700 mt-1">
                  You've reached your monthly limit of {limit} meal plans.
                  Your limit will reset on {resetDateFormatted}.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Upgrade CTA */}
        {!isUnlimited && warningLevel !== 'low' && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-purple-900">
                  Upgrade to unlimited
                </p>
                <p className="text-sm text-purple-700 mt-1">
                  Switch to a Pro subscription for unlimited meal plan generation, starting at just $14.99/month.
                </p>
                <a
                  href="/pricing?upgrade=true"
                  className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Zap className="w-4 h-4" />
                  View Plans
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Subscription Active Message */}
        {isUnlimited && paymentType === 'subscription' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-900">
                  Active subscription
                </p>
                <p className="text-sm text-green-700 mt-1">
                  Your {tierName} Pro subscription includes unlimited meal plan generation.
                  <a href="/pricing" className="underline ml-1">
                    Manage subscription
                  </a>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
