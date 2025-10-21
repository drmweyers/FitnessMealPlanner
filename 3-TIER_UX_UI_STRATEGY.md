# 3-Tier Trainer Profile System - UX/UI Strategy & Design Specifications

**Document Version:** 1.0
**Last Updated:** September 21, 2025
**UX/UI Strategy Agent:** Claude Code
**Project:** FitnessMealPlanner 3-Tier Enhancement

---

## Executive Summary

This document provides comprehensive UX/UI design specifications for implementing the 3-tier trainer profile system in FitnessMealPlanner. The strategy focuses on seamless tier discovery, intuitive feature gating, and progressive enhancement that grows with trainers' business needs.

### Key Design Principles
1. **Progressive Disclosure:** Show features gradually based on tier capabilities
2. **Clear Value Communication:** Each tier's benefits are immediately apparent
3. **Seamless Upgrades:** Frictionless tier progression with contextual prompts
4. **Mobile-First:** Responsive design optimized for all devices
5. **Accessibility:** WCAG 2.1 AA compliant throughout

---

## 1. Tier Selection Interface Design

### 1.1 Main Tier Selection Page

#### Layout Structure
```
┌─────────────────────────────────────────────────────────────────┐
│                     Choose Your Growth Path                     │
│              Find the perfect fit for your business             │
├─────────────────────────────────────────────────────────────────┤
│  [New Trainer]    [Growing Professional]   [Established Business] │
│     $199              $299                      $399           │
│                                                                 │
│ • 9 customers     • 20 customers           • Unlimited customers│
│ • 1,000 plans     • 2,500 plans            • 5,000+ plans     │
│ • Email support   • Priority support       • Dedicated manager │
│ • PDF exports     • Analytics dashboard    • Full analytics   │
│                   • Customer groups        • API access       │
│                   • Bulk operations        • White-label      │
│                                                                 │
│   [Start Trial]     [Start Trial]           [Start Trial]     │
│   [Learn More]      [Learn More]            [Learn More]      │
└─────────────────────────────────────────────────────────────────┘
```

#### Interactive Tier Cards Component
```typescript
export const TierSelectionCards: React.FC = () => {
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Choose Your Growth Path
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Select the plan that matches your current business stage.
          You can upgrade anytime as your practice grows.
        </p>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center mt-8 space-x-4">
          <span className={`text-sm ${billingCycle === 'monthly' ? 'text-gray-900' : 'text-gray-500'}`}>
            Monthly
          </span>
          <Switch
            checked={billingCycle === 'annual'}
            onCheckedChange={(checked) => setBillingCycle(checked ? 'annual' : 'monthly')}
          />
          <span className={`text-sm ${billingCycle === 'annual' ? 'text-gray-900' : 'text-gray-500'}`}>
            Annual <Badge variant="secondary" className="ml-1">Save 15%</Badge>
          </span>
        </div>
      </div>

      {/* Tier Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
        {TIER_CONFIGS.map((tier) => (
          <TierCard
            key={tier.id}
            tier={tier}
            isSelected={selectedTier === tier.id}
            billingCycle={billingCycle}
            onSelect={setSelectedTier}
            onChoose={() => handleTierSelection(tier.id)}
          />
        ))}
      </div>

      {/* Comparison Table Link */}
      <div className="text-center mt-12">
        <Button variant="outline" onClick={() => setShowComparison(true)}>
          <Table className="w-4 h-4 mr-2" />
          Compare All Features
        </Button>
      </div>
    </div>
  );
};
```

#### Individual Tier Card Design
```typescript
interface TierCardProps {
  tier: TierConfig;
  isSelected: boolean;
  billingCycle: 'monthly' | 'annual';
  onSelect: (id: number) => void;
  onChoose: () => void;
}

export const TierCard: React.FC<TierCardProps> = ({
  tier, isSelected, billingCycle, onSelect, onChoose
}) => {
  const price = billingCycle === 'annual' ? tier.annualPrice : tier.monthlyPrice;
  const savings = tier.monthlyPrice * 12 - tier.annualPrice;

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-300 cursor-pointer",
        "hover:shadow-xl hover:scale-105",
        isSelected && "ring-2 ring-blue-500 shadow-xl scale-105",
        tier.popular && "border-blue-500 shadow-lg"
      )}
      onClick={() => onSelect(tier.id)}
    >
      {/* Popular Badge */}
      {tier.popular && (
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <Badge className="bg-blue-500 text-white px-3 py-1">
            Most Popular
          </Badge>
        </div>
      )}

      <CardHeader className="text-center pb-4">
        {/* Tier Icon */}
        <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 rounded-full">
          <tier.icon className="w-8 h-8 text-blue-600" />
        </div>

        {/* Tier Name */}
        <CardTitle className="text-2xl font-bold text-gray-900">
          {tier.name}
        </CardTitle>

        {/* Target Audience */}
        <CardDescription className="text-gray-600 mt-2">
          {tier.targetAudience}
        </CardDescription>

        {/* Pricing */}
        <div className="mt-6">
          <div className="flex items-baseline justify-center">
            <span className="text-4xl font-bold text-gray-900">
              ${price}
            </span>
            <span className="text-gray-500 ml-1">
              {billingCycle === 'monthly' ? '/month' : '/year'}
            </span>
          </div>

          {billingCycle === 'annual' && savings > 0 && (
            <div className="text-sm text-green-600 mt-1">
              Save ${savings} yearly
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Key Features */}
        <div className="space-y-3">
          {tier.keyFeatures.map((feature, index) => (
            <div key={index} className="flex items-start space-x-3">
              <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-gray-700">{feature}</span>
            </div>
          ))}
        </div>

        {/* Usage Limits Display */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Customers:</span>
            <span className="font-medium">
              {tier.customerLimit === -1 ? 'Unlimited' : tier.customerLimit}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Meal Plans:</span>
            <span className="font-medium">{tier.mealPlanAccess.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Analytics:</span>
            <span className="font-medium">
              {tier.analyticsLevel === 0 ? 'None' :
               tier.analyticsLevel === 1 ? 'Basic' : 'Advanced'}
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-0 space-y-3">
        {/* Primary CTA */}
        <Button
          className="w-full"
          size="lg"
          variant={tier.popular ? "default" : "outline"}
          onClick={(e) => {
            e.stopPropagation();
            onChoose();
          }}
        >
          Start 14-Day Trial
        </Button>

        {/* Secondary CTA */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={(e) => {
            e.stopPropagation();
            // Open detailed feature modal
          }}
        >
          Learn More
        </Button>
      </CardFooter>
    </Card>
  );
};
```

### 1.2 Detailed Feature Comparison Modal

```typescript
export const FeatureComparisonModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Complete Feature Comparison</DialogTitle>
          <DialogDescription>
            Compare all features across our three tier options
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium">Feature</th>
                  <th className="text-center p-4 font-medium">New Trainer</th>
                  <th className="text-center p-4 font-medium">Growing Professional</th>
                  <th className="text-center p-4 font-medium">Established Business</th>
                </tr>
              </thead>
              <tbody>
                {FEATURE_COMPARISON_DATA.map((category) => (
                  <React.Fragment key={category.name}>
                    <tr className="bg-gray-50">
                      <td colSpan={4} className="p-4 font-semibold text-gray-900">
                        {category.name}
                      </td>
                    </tr>
                    {category.features.map((feature) => (
                      <tr key={feature.name} className="border-b">
                        <td className="p-4 text-gray-700">{feature.name}</td>
                        <td className="p-4 text-center">
                          <FeatureCell value={feature.tier1} />
                        </td>
                        <td className="p-4 text-center">
                          <FeatureCell value={feature.tier2} />
                        </td>
                        <td className="p-4 text-center">
                          <FeatureCell value={feature.tier3} />
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

---

## 2. Feature Gating System & Upgrade Prompts

### 2.1 Tier-Gated Component Wrapper

```typescript
interface TierGateProps {
  requiredTier: number;
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
}

export const TierGate: React.FC<TierGateProps> = ({
  requiredTier,
  feature,
  children,
  fallback,
  showUpgradePrompt = true
}) => {
  const { tierInfo } = useTrainerTier();
  const { trackFeatureAttempt } = useAnalytics();

  if (tierInfo.loading) {
    return <Skeleton className="h-20 w-full" />;
  }

  if (tierInfo.current >= requiredTier) {
    return <>{children}</>;
  }

  // Track feature access attempt for upgrade targeting
  useEffect(() => {
    trackFeatureAttempt(feature, tierInfo.current, requiredTier);
  }, []);

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showUpgradePrompt) {
    return (
      <UpgradePromptCard
        currentTier={tierInfo.current}
        requiredTier={requiredTier}
        feature={feature}
      />
    );
  }

  return null;
};
```

### 2.2 Contextual Upgrade Prompts

#### Customer Limit Reached Prompt
```typescript
export const CustomerLimitPrompt: React.FC = () => {
  const { tierInfo, customerCount } = useTrainerData();

  if (customerCount < tierInfo.customerLimit) return null;

  return (
    <Alert className="border-orange-200 bg-orange-50">
      <AlertTriangle className="h-4 w-4 text-orange-600" />
      <AlertTitle className="text-orange-800">
        Customer Limit Reached ({customerCount}/{tierInfo.customerLimit})
      </AlertTitle>
      <AlertDescription className="text-orange-700 mt-2">
        <p className="mb-3">
          You've reached your customer limit. Upgrade to continue growing your business.
        </p>

        <div className="bg-white rounded-lg p-4 mb-4">
          <h4 className="font-semibold text-gray-900 mb-2">
            Upgrade to {getNextTierName(tierInfo.current)} and get:
          </h4>
          <ul className="space-y-1 text-sm">
            {getUpgradeBenefits(tierInfo.current).map((benefit, index) => (
              <li key={index} className="flex items-center space-x-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex space-x-3">
          <Button size="sm" onClick={() => handleUpgrade(tierInfo.current + 1)}>
            Upgrade Now - ${getUpgradePrice(tierInfo.current)}
          </Button>
          <Button variant="outline" size="sm" onClick={() => openUpgradeModal()}>
            Learn More
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};
```

#### Feature Discovery Prompt
```typescript
export const FeatureDiscoveryPrompt: React.FC<{
  feature: string;
  requiredTier: number;
  currentTier: number;
}> = ({ feature, requiredTier, currentTier }) => {
  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader className="pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Zap className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <CardTitle className="text-lg text-blue-900">
              Unlock {feature}
            </CardTitle>
            <CardDescription className="text-blue-700">
              Available in {getTierName(requiredTier)} tier
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <p className="text-blue-800 mb-4">
          {getFeatureDescription(feature)}
        </p>

        {/* Preview/Demo */}
        <div className="bg-white rounded-lg p-4 mb-4 opacity-75">
          <FeaturePreview feature={feature} />
          <div className="absolute inset-0 bg-blue-500 bg-opacity-10 rounded-lg flex items-center justify-center">
            <Lock className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-blue-700">
            Upgrade from ${getTierPrice(currentTier)} to ${getTierPrice(requiredTier)}
          </div>
          <Button size="sm" onClick={() => handleUpgrade(requiredTier)}>
            Upgrade to Unlock
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
```

### 2.3 Smart Upgrade Timing

```typescript
export const useUpgradePromptTiming = () => {
  const { tierInfo, usage, engagement } = useTrainerData();

  const shouldShowUpgradePrompt = useMemo(() => {
    const triggers = {
      customerLimit: usage.customerCount >= tierInfo.customerLimit * 0.8,
      highEngagement: engagement.weeklyLogins >= 5,
      featureAttempts: engagement.blockedFeatureAttempts >= 3,
      businessGrowth: usage.revenueGrowth > 0.2,
      timeOnTier: daysSince(tierInfo.purchaseDate) >= 30
    };

    // Smart timing: Don't overwhelm users
    const recentPrompts = getRecentUpgradePrompts(tierInfo.trainerId);
    if (recentPrompts.length >= 2 && daysSince(recentPrompts[0].date) < 7) {
      return false;
    }

    // Score-based approach
    const score = Object.values(triggers).filter(Boolean).length;
    return score >= 2; // Require at least 2 triggers
  }, [tierInfo, usage, engagement]);

  return { shouldShowUpgradePrompt };
};
```

---

## 3. Dashboard Layouts Per Tier

### 3.1 Tier 1 Dashboard (New Trainer)

```typescript
export const Tier1Dashboard: React.FC = () => {
  const { customerCount, tierInfo } = useTrainerData();

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <WelcomeCard
        tier={1}
        message="Welcome to your fitness business journey!"
        subtitle="Everything you need to get started with your first clients"
      />

      {/* Customer Management */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>My Customers</span>
              <UsageBadge current={customerCount} limit={9} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CustomerList limit={3} />
            <div className="mt-4">
              {customerCount < 9 ? (
                <Button size="sm" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Invite Customer
                </Button>
              ) : (
                <CustomerLimitPrompt />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" size="sm" className="w-full justify-start">
              <BookOpen className="w-4 h-4 mr-2" />
              Browse Meal Plans (1,000 available)
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start">
              <Users className="w-4 h-4 mr-2" />
              Generate Meal Plan
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start">
              <FileText className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Upgrade Teaser */}
      <TierGate requiredTier={2} feature="analytics">
        <AnalyticsDashboard />
        <AnalyticsUpgradeTeaser />
      </TierGate>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <RecentActivityList />
        </CardContent>
      </Card>
    </div>
  );
};
```

### 3.2 Tier 2 Dashboard (Growing Professional)

```typescript
export const Tier2Dashboard: React.FC = () => {
  const { analytics, customerGroups } = useTrainerData();

  return (
    <div className="space-y-6">
      {/* Business Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          title="Total Customers"
          value={analytics.totalCustomers}
          change={analytics.customerGrowth}
          icon={Users}
        />
        <MetricCard
          title="Active Plans"
          value={analytics.activePlans}
          change={analytics.planGrowth}
          icon={Calendar}
        />
        <MetricCard
          title="Engagement Rate"
          value={`${analytics.engagementRate}%`}
          change={analytics.engagementChange}
          icon={TrendingUp}
        />
        <MetricCard
          title="Revenue"
          value={`$${analytics.revenue}`}
          change={analytics.revenueGrowth}
          icon={DollarSign}
        />
      </div>

      {/* Customer Management with Groups */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Customer Groups</span>
                <Button size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  New Group
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CustomerGroupsList groups={customerGroups} />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Quick Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Goal Achievement</span>
                  <span>{analytics.goalAchievement}%</span>
                </div>
                <Progress value={analytics.goalAchievement} />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Customer Engagement</span>
                  <span>{analytics.engagementRate}%</span>
                </div>
                <Progress value={analytics.engagementRate} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Features Teaser */}
      <TierGate requiredTier={3} feature="advanced_analytics">
        <AdvancedAnalyticsDashboard />
        <AdvancedFeaturesTeaser />
      </TierGate>

      {/* Performance Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Plans</CardTitle>
          </CardHeader>
          <CardContent>
            <TopPerformingPlans />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <CustomerProgressSummary />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
```

### 3.3 Tier 3 Dashboard (Established Business)

```typescript
export const Tier3Dashboard: React.FC = () => {
  const { businessIntelligence, team, integrations } = useTrainerData();

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <CardContent className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Monthly Revenue</h3>
              <p className="text-3xl font-bold">${businessIntelligence.monthlyRevenue}</p>
              <p className="text-blue-100">+{businessIntelligence.revenueGrowth}% vs last month</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Total Customers</h3>
              <p className="text-3xl font-bold">{businessIntelligence.totalCustomers}</p>
              <p className="text-blue-100">Unlimited capacity</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Business Health</h3>
              <p className="text-3xl font-bold">{businessIntelligence.healthScore}/100</p>
              <p className="text-blue-100">Excellent performance</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Insights & Predictions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Brain className="w-5 h-5 mr-2 text-purple-600" />
              AI Business Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AIInsightsList insights={businessIntelligence.aiInsights} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
              Predictive Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PredictiveChart data={businessIntelligence.predictions} />
          </CardContent>
        </Card>
      </div>

      {/* Team Management */}
      {team.hasTeam && (
        <Card>
          <CardHeader>
            <CardTitle>Team Management</CardTitle>
          </CardHeader>
          <CardContent>
            <TeamManagementGrid team={team} />
          </CardContent>
        </Card>
      )}

      {/* Integration Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Active Integrations</CardTitle>
          </CardHeader>
          <CardContent>
            <IntegrationsList integrations={integrations.active} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Custom Branding</CardTitle>
          </CardHeader>
          <CardContent>
            <BrandingPreview />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <APIUsageMetrics />
          </CardContent>
        </Card>
      </div>

      {/* Advanced Analytics */}
      <Card>
        <CardHeader>
          <CardTitle>Advanced Business Analytics</CardTitle>
          <div className="flex space-x-2">
            <Button size="sm" variant="outline">Export Report</Button>
            <Button size="sm" variant="outline">Schedule Report</Button>
          </div>
        </CardHeader>
        <CardContent>
          <AdvancedAnalyticsGrid analytics={businessIntelligence.advanced} />
        </CardContent>
      </Card>
    </div>
  );
};
```

---

## 4. Mobile Experience Optimization

### 4.1 Mobile-First Tier Selection

```typescript
export const MobileTierSelection: React.FC = () => {
  const [selectedTier, setSelectedTier] = useState<number>(2); // Default to middle tier

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      {/* Mobile Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Choose Your Plan
        </h1>
        <p className="text-gray-600 text-sm">
          Select the plan that fits your business
        </p>
      </div>

      {/* Tier Selector Carousel */}
      <div className="mb-6">
        <Carousel className="w-full">
          <CarouselContent>
            {TIER_CONFIGS.map((tier) => (
              <CarouselItem key={tier.id}>
                <MobileTierCard
                  tier={tier}
                  isSelected={selectedTier === tier.id}
                  onSelect={() => setSelectedTier(tier.id)}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </div>

      {/* Tier Dots Indicator */}
      <div className="flex justify-center space-x-2 mb-8">
        {TIER_CONFIGS.map((tier) => (
          <button
            key={tier.id}
            className={cn(
              "w-3 h-3 rounded-full transition-colors",
              selectedTier === tier.id ? "bg-blue-600" : "bg-gray-300"
            )}
            onClick={() => setSelectedTier(tier.id)}
          />
        ))}
      </div>

      {/* Feature Highlights for Selected Tier */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">
            {TIER_CONFIGS.find(t => t.id === selectedTier)?.name} Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MobileFeatureList tierId={selectedTier} />
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button
          size="lg"
          className="w-full"
          onClick={() => handleTierSelection(selectedTier)}
        >
          Start Free Trial
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="w-full"
          onClick={() => openFeatureComparison()}
        >
          Compare All Plans
        </Button>
      </div>
    </div>
  );
};
```

### 4.2 Mobile Dashboard Layouts

```typescript
export const MobileDashboard: React.FC = () => {
  const { tierInfo } = useTrainerData();
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-semibold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-600">
              {getTierName(tierInfo.current)} Plan
            </p>
          </div>
          <TierBadge tier={tierInfo.current} />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b overflow-x-auto">
        <div className="flex space-x-1 px-4 py-2">
          {MOBILE_TABS.map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "ghost"}
              size="sm"
              className="whitespace-nowrap"
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-4 py-6">
        {activeTab === 'overview' && <MobileOverviewTab />}
        {activeTab === 'customers' && <MobileCustomersTab />}
        {activeTab === 'analytics' && (
          <TierGate requiredTier={2} feature="analytics">
            <MobileAnalyticsTab />
          </TierGate>
        )}
        {activeTab === 'plans' && <MobilePlansTab />}
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="grid grid-cols-4 py-2">
          {BOTTOM_NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className="flex flex-col items-center py-2 text-xs"
              onClick={() => navigate(item.path)}
            >
              <item.icon className="w-5 h-5 mb-1" />
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
```

### 4.3 Mobile Upgrade Flow

```typescript
export const MobileUpgradeFlow: React.FC = () => {
  const [step, setStep] = useState<'comparison' | 'payment' | 'confirmation'>('comparison');
  const [selectedTier, setSelectedTier] = useState<number>(2);

  return (
    <div className="min-h-screen bg-white">
      {/* Progress Header */}
      <div className="border-b px-4 py-3">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="ml-4">
            <h1 className="font-semibold">Upgrade Plan</h1>
            <div className="flex space-x-2 mt-1">
              {['comparison', 'payment', 'confirmation'].map((s, index) => (
                <div
                  key={s}
                  className={cn(
                    "w-2 h-2 rounded-full",
                    step === s ? "bg-blue-600" :
                    ['comparison', 'payment', 'confirmation'].indexOf(step) > index ? "bg-green-500" : "bg-gray-300"
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="px-4 py-6">
        {step === 'comparison' && (
          <MobileTierComparison
            selectedTier={selectedTier}
            onSelect={setSelectedTier}
            onNext={() => setStep('payment')}
          />
        )}
        {step === 'payment' && (
          <MobilePaymentStep
            tier={selectedTier}
            onBack={() => setStep('comparison')}
            onNext={() => setStep('confirmation')}
          />
        )}
        {step === 'confirmation' && (
          <MobileConfirmationStep tier={selectedTier} />
        )}
      </div>
    </div>
  );
};
```

---

## 5. User Journey Flows & Wireframes

### 5.1 New User Journey Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     NEW USER JOURNEY FLOW                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Landing Page → "Start Free Trial"                          │
│  2. Business Assessment Quiz                                    │
│     • How many clients do you have?                           │
│     • What's your main goal?                                  │
│     • Do you need analytics?                                  │
│  3. Recommended Tier Presentation                             │
│  4. Trial Account Creation                                     │
│  5. Guided Onboarding (Tier-Specific)                        │
│  6. First Customer Invitation                                 │
│  7. First Meal Plan Assignment                                │
│  8. Progress Review (Day 7)                                   │
│  9. Conversion Prompt (Day 14)                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Upgrade Journey Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    UPGRADE JOURNEY FLOW                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Trigger → Limit Warning → Feature Preview → Upgrade Modal     │
│     ↓            ↓             ↓               ↓              │
│  • Customer    • Soft       • Locked        • Benefits       │
│    limit         warning      feature         comparison     │
│  • Feature     • Usage       • Demo          • Pricing       │
│    attempt       meter        experience      • One-click    │
│  • Success     • Upgrade     • Value            upgrade      │
│    milestone     suggestion    proposition                   │
│                                                                 │
│  Payment → Confirmation → Feature Unlock → Onboarding         │
│     ↓            ↓             ↓               ↓              │
│  • Secure     • Success      • Immediate     • New feature   │
│    checkout     message        access          tutorials     │
│  • Prorated   • Receipt      • Welcome       • Advanced     │
│    billing     • Next steps    experience      setup        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Feature Discovery Wireframes

#### Desktop Feature Gate
```
┌─────────────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │                    Customer Analytics                       │ │
│ │                 [Tier 2 Feature - Locked]                  │ │
│ ├─────────────────────────────────────────────────────────────┤ │
│ │  📊  Get insights into your customers' progress and        │ │
│ │      engagement with detailed analytics dashboard.         │ │
│ │                                                             │ │
│ │  ┌─────────────────────────────────────────────────────┐   │ │
│ │  │ [Blurred Preview of Analytics Dashboard]            │   │ │
│ │  │ Charts, metrics, customer data visualization        │   │ │
│ │  │                   🔒                                │   │ │
│ │  └─────────────────────────────────────────────────────┘   │ │
│ │                                                             │ │
│ │  What you'll get with Professional:                        │ │
│ │  ✓ Customer engagement metrics                             │ │
│ │  ✓ Progress tracking analytics                             │ │
│ │  ✓ Business performance insights                           │ │
│ │  ✓ Monthly automated reports                               │ │
│ │                                                             │ │
│ │  Current: New Trainer ($199)                               │ │
│ │  Upgrade to: Professional ($299)                           │ │
│ │                                                             │ │
│ │     [Upgrade for $100]    [Learn More]                    │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

#### Mobile Feature Gate
```
┌─────────────────────┐
│ 🔒 Analytics Locked │
├─────────────────────┤
│                     │
│ Unlock detailed     │
│ business insights   │
│ with Professional   │
│                     │
│ ┌─────────────────┐ │
│ │ [Preview Image] │ │
│ │      🔒         │ │
│ └─────────────────┘ │
│                     │
│ ✓ Customer metrics  │
│ ✓ Progress tracking │
│ ✓ Growth insights   │
│                     │
│ Professional: $299  │
│ (Upgrade: +$100)    │
│                     │
│ [Upgrade Now]       │
│ [Learn More]        │
└─────────────────────┘
```

---

## 6. Implementation Roadmap

### 6.1 Phase 1: Foundation (Weeks 1-4)

#### Week 1-2: Core Infrastructure
- [ ] Database schema for tier management
- [ ] Tier configuration system
- [ ] Basic authentication middleware
- [ ] Tier checking utilities

#### Week 3-4: Basic Components
- [ ] TierGate wrapper component
- [ ] Usage limit indicators
- [ ] Basic upgrade prompts
- [ ] Tier badge components

### 6.2 Phase 2: Tier Selection (Weeks 5-8)

#### Week 5-6: Tier Selection Interface
- [ ] Main tier selection page
- [ ] Interactive tier cards
- [ ] Feature comparison modal
- [ ] Mobile tier selection carousel

#### Week 7-8: Upgrade Flow
- [ ] Upgrade prompt components
- [ ] Payment integration
- [ ] Confirmation flow
- [ ] Email notifications

### 6.3 Phase 3: Dashboard Implementation (Weeks 9-14)

#### Week 9-10: Tier 1 Dashboard
- [ ] Basic customer management
- [ ] Simple meal plan browser
- [ ] Analytics upgrade teasers
- [ ] Mobile optimization

#### Week 11-12: Tier 2 Dashboard
- [ ] Analytics dashboard
- [ ] Customer grouping
- [ ] Advanced meal plan features
- [ ] Business metrics

#### Week 13-14: Tier 3 Dashboard
- [ ] Advanced analytics
- [ ] Team management
- [ ] Integration hub
- [ ] Custom branding

### 6.4 Phase 4: Mobile Experience (Weeks 15-16)

#### Week 15: Mobile Optimization
- [ ] Mobile-first tier selection
- [ ] Responsive dashboard layouts
- [ ] Touch-optimized interactions
- [ ] Mobile upgrade flow

#### Week 16: Performance & Polish
- [ ] Performance optimization
- [ ] Accessibility improvements
- [ ] Cross-browser testing
- [ ] User experience refinements

### 6.5 Phase 5: Testing & Launch (Weeks 17-18)

#### Week 17: Testing
- [ ] Comprehensive testing across all tiers
- [ ] Payment flow testing
- [ ] Mobile device testing
- [ ] Accessibility audit

#### Week 18: Launch Preparation
- [ ] Documentation completion
- [ ] Support team training
- [ ] Marketing material preparation
- [ ] Gradual rollout planning

---

## 7. Technical Specifications

Note: API versioning and exports
- All HTTP endpoints are versioned under /api/v1.
- Export rules: Tier 2 supports CSV export only; Tier 3 supports CSV, Excel, PDF and API-based exports.

### 7.1 Component Architecture

```typescript
// Tier Management Context
interface TierContextValue {
  tierInfo: {
    current: number;
    customerLimit: number;
    mealPlanAccess: number;
    analyticsLevel: number;
    loading: boolean;
  };
  usage: {
    customerCount: number;
    mealPlanUsage: number;
    featureAttempts: number;
  };
  upgrade: (targetTier: number) => Promise<void>;
  checkAccess: (feature: string) => boolean;
}

// Feature Access Hook
export const useFeatureAccess = (feature: string, requiredTier: number) => {
  const { tierInfo, usage } = useTierContext();

  return {
    hasAccess: tierInfo.current >= requiredTier,
    isLoading: tierInfo.loading,
    currentTier: tierInfo.current,
    requiredTier,
    usage: usage[feature] || 0,
    canUpgrade: tierInfo.current < 3
  };
};
```

### 7.2 Styling System

```css
/* Tier-specific color schemes */
.tier-1 {
  --tier-primary: #10b981; /* Green */
  --tier-secondary: #d1fae5;
  --tier-accent: #047857;
}

.tier-2 {
  --tier-primary: #3b82f6; /* Blue */
  --tier-secondary: #dbeafe;
  --tier-accent: #1d4ed8;
}

.tier-3 {
  --tier-primary: #8b5cf6; /* Purple */
  --tier-secondary: #ede9fe;
  --tier-accent: #7c3aed;
}

/* Responsive utilities */
.mobile-only { display: block; }
.desktop-only { display: none; }

@media (min-width: 768px) {
  .mobile-only { display: none; }
  .desktop-only { display: block; }
}
```

### 7.3 Performance Considerations

```typescript
// Lazy loading for tier-specific components
const Tier2Analytics = lazy(() => import('./components/Tier2Analytics'));
const Tier3BusinessIntelligence = lazy(() => import('./components/Tier3BI'));

// Efficient tier checking with memoization
export const useTierMemo = () => {
  const { tierInfo } = useTierContext();

  return useMemo(() => ({
    isTier1: tierInfo.current === 1,
    isTier2Plus: tierInfo.current >= 2,
    isTier3: tierInfo.current === 3,
    hasAnalytics: tierInfo.current >= 2,
    hasAdvancedFeatures: tierInfo.current === 3
  }), [tierInfo.current]);
};
```

---

## 8. Success Metrics & Analytics

### 8.1 User Experience Metrics

#### Tier Selection Metrics
- Time to tier selection: < 2 minutes
- Tier selection completion rate: > 85%
- Feature comparison modal usage: Track engagement
- Mobile vs desktop selection patterns

#### Upgrade Flow Metrics
- Upgrade prompt click-through rate: > 15%
- Upgrade completion rate: > 75%
- Time from prompt to upgrade: < 5 minutes
- Upgrade abandonment points: Track drop-offs

### 8.2 Feature Adoption Tracking

```typescript
export const trackFeatureInteraction = async (
  feature: string,
  action: 'attempt' | 'use' | 'upgrade_prompt',
  tierLevel: number
) => {
  await analytics.track('feature_interaction', {
    feature,
    action,
    tierLevel,
    timestamp: new Date(),
    userId: getCurrentUser().id
  });
};
```

### 8.3 Business Intelligence Dashboard

Track tier system performance:
- Revenue per tier
- Customer lifetime value by tier
- Feature usage patterns
- Upgrade conversion rates
- Customer satisfaction scores

---

## Conclusion

This comprehensive UX/UI strategy provides a complete framework for implementing the 3-tier trainer profile system. The design prioritizes user experience while maximizing conversion opportunities through strategic feature gating and contextual upgrade prompts.

### Key Success Factors

1. **Progressive Enhancement**: Each tier builds naturally on the previous one
2. **Clear Value Proposition**: Users understand exactly what they get with each tier
3. **Frictionless Upgrades**: Minimal barriers to tier advancement
4. **Mobile Optimization**: Excellent experience across all devices
5. **Intelligent Timing**: Upgrade prompts appear at optimal moments

### Expected Outcomes

- **User Satisfaction**: Clear tier benefits improve overall user experience
- **Conversion Rates**: Strategic prompts increase upgrade conversions
- **Revenue Growth**: Tiered pricing maximizes revenue per user
- **Customer Retention**: Tier progression creates platform stickiness
- **Market Expansion**: Multiple price points attract broader audience

This UX/UI strategy transforms FitnessMealPlanner into a growth-oriented platform that scales with trainer success while providing exceptional user experience at every tier level.