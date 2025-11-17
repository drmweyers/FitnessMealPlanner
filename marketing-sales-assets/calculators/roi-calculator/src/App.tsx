import { useState } from 'react'
import { Calculator, TrendingUp, Clock, DollarSign, Users, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'

function App() {
  const [numClients, setNumClients] = useState(10)
  const [hoursPerPlan, setHoursPerPlan] = useState(2)
  const [hourlyRate, setHourlyRate] = useState(75)
  const [email, setEmail] = useState('')
  const [showResults, setShowResults] = useState(false)

  // Calculations
  const monthlyHours = numClients * hoursPerPlan * 4 // 4 weeks per month
  const currentMonthlyCost = monthlyHours * hourlyRate
  const yearlyTimeCost = monthlyHours * 12

  // EvoFitMeals savings (80% time reduction)
  const timeSaved = monthlyHours * 0.8
  const monthlySavings = timeSaved * hourlyRate
  const yearlySavings = monthlySavings * 12

  // Revenue potential
  const additionalClients = Math.floor(timeSaved / hoursPerPlan)
  const additionalRevenue = additionalClients * 200 * 4 // $200/client/month avg

  const handleCalculate = () => {
    setShowResults(true)
  }

  const handleGetReport = (e: React.FormEvent) => {
    e.preventDefault()
    // In production, this would submit to your email capture system
    alert(`Report sent to ${email}! Check your inbox.`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-lg">🍴</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                EvoFitMeals
              </span>
            </div>
            <Button variant="outline" size="sm">Sign In</Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 py-12 sm:px-6">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-2 bg-purple-100 rounded-full mb-4">
            <Calculator className="w-6 h-6 text-purple-600" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4">
            Calculate Your ROI
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Discover how much time and money you could save with AI-powered meal planning
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Calculator Card */}
          <Card className="shadow-xl border-2 border-purple-100">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50">
              <CardTitle className="flex items-center text-2xl">
                <Users className="w-6 h-6 mr-2 text-purple-600" />
                Your Current Situation
              </CardTitle>
              <CardDescription>
                Tell us about your meal planning process
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Number of Clients */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label htmlFor="clients" className="text-base font-semibold">
                    Number of Active Clients
                  </Label>
                  <span className="text-2xl font-bold text-purple-600">{numClients}</span>
                </div>
                <Slider
                  id="clients"
                  value={[numClients]}
                  onValueChange={([value]) => setNumClients(value)}
                  min={1}
                  max={100}
                  step={1}
                  className="w-full"
                />
                <p className="text-sm text-gray-500">Clients receiving meal plans</p>
              </div>

              {/* Hours Per Plan */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label htmlFor="hours" className="text-base font-semibold">
                    Hours Per Meal Plan
                  </Label>
                  <span className="text-2xl font-bold text-purple-600">{hoursPerPlan}</span>
                </div>
                <Slider
                  id="hours"
                  value={[hoursPerPlan]}
                  onValueChange={([value]) => setHoursPerPlan(value)}
                  min={0.5}
                  max={8}
                  step={0.5}
                  className="w-full"
                />
                <p className="text-sm text-gray-500">Time spent creating each weekly plan</p>
              </div>

              {/* Hourly Rate */}
              <div className="space-y-3">
                <Label htmlFor="rate" className="text-base font-semibold">
                  Your Hourly Value ($)
                </Label>
                <Input
                  id="rate"
                  type="number"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(Number(e.target.value))}
                  className="text-xl font-semibold text-center"
                />
                <p className="text-sm text-gray-500">What you charge per hour or could earn</p>
              </div>

              <Button
                onClick={handleCalculate}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-lg py-6"
              >
                Calculate My Savings
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Results Card */}
          <div className="space-y-6">
            {showResults ? (
              <>
                {/* Time Savings */}
                <Card className="shadow-lg border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
                  <CardHeader>
                    <CardTitle className="flex items-center text-xl">
                      <Clock className="w-5 h-5 mr-2 text-green-600" />
                      Time Saved Per Month
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-5xl font-extrabold text-green-600 mb-2">
                      {timeSaved.toFixed(0)} hrs
                    </div>
                    <p className="text-gray-600">
                      That's <strong>{(timeSaved / 8).toFixed(0)} full workdays</strong> back in your schedule every month!
                    </p>
                  </CardContent>
                </Card>

                {/* Money Savings */}
                <Card className="shadow-lg border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
                  <CardHeader>
                    <CardTitle className="flex items-center text-xl">
                      <DollarSign className="w-5 h-5 mr-2 text-blue-600" />
                      Cost Savings Per Year
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-5xl font-extrabold text-blue-600 mb-2">
                      ${yearlySavings.toLocaleString()}
                    </div>
                    <p className="text-gray-600">
                      Annual value of time saved vs. manual meal planning
                    </p>
                  </CardContent>
                </Card>

                {/* Revenue Potential */}
                <Card className="shadow-lg border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
                  <CardHeader>
                    <CardTitle className="flex items-center text-xl">
                      <TrendingUp className="w-5 h-5 mr-2 text-purple-600" />
                      Revenue Growth Potential
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-5xl font-extrabold text-purple-600 mb-2">
                      +{additionalClients} clients
                    </div>
                    <p className="text-gray-600 mb-3">
                      Additional clients you could serve with saved time
                    </p>
                    <div className="p-4 bg-white rounded-lg border border-purple-200">
                      <div className="text-sm text-gray-500 mb-1">Additional Monthly Revenue</div>
                      <div className="text-3xl font-bold text-purple-600">
                        ${additionalRevenue.toLocaleString()}/mo
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Email Capture */}
                <Card className="shadow-xl border-2 border-yellow-300 bg-gradient-to-r from-yellow-50 to-orange-50">
                  <CardHeader>
                    <CardTitle className="text-2xl">Get Your Detailed ROI Report</CardTitle>
                    <CardDescription>
                      We'll send you a complete analysis plus a comparison of our pricing tiers
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleGetReport} className="space-y-4">
                      <div>
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="text-base"
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white text-lg py-6"
                      >
                        Send Me My ROI Report
                      </Button>
                      <p className="text-xs text-gray-500 text-center">
                        No spam. Just your detailed savings report and pricing info.
                      </p>
                    </form>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="shadow-lg border-2 border-gray-200">
                <CardContent className="py-20 text-center">
                  <Calculator className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 text-lg">
                    Enter your details and click<br />"Calculate My Savings" to see results
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Social Proof */}
        <div className="mt-16 text-center">
          <p className="text-sm text-gray-500 mb-4">Trusted by 500+ fitness professionals</p>
          <div className="flex justify-center items-center space-x-8 opacity-60">
            <span className="text-lg font-semibold text-gray-600">⭐️⭐️⭐️⭐️⭐️</span>
            <span className="text-gray-600">4.9/5 rating</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 mt-20">
        <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 text-center text-gray-600">
          <p>&copy; 2025 EvoFitMeals. AI-Powered Meal Planning for Fitness Professionals.</p>
        </div>
      </footer>
    </div>
  )
}

export default App
