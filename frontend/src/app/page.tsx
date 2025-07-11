'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Shield, AlertCircle, CheckCircle2, LogOut, User } from 'lucide-react';
import { isAuthenticated, getUser, logout, authFetch } from '@/lib/auth';

interface FormData {
  age: string;
  income: string;
  dependents: string;
  riskTolerance: 'low' | 'medium' | 'high';
}

interface Recommendation {
  type: string;
  coverage: number;
  term: number;
  monthlyPremium: number;
}

interface RecommendationResponse {
  recommendation: Recommendation;
  explanation: string;
  factors: {
    incomeMultiplier: number;
    dependentsFactor: number;
    riskAdjustment: number;
  };
}

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true); 
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState<FormData>({
    age: '',
    income: '',
    dependents: '',
    riskTolerance: 'medium'
  });
  const [recommendation, setRecommendation] = useState<RecommendationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = () => {
      if (!isAuthenticated()) {
        router.push('/auth');
      } else {
        const currentUser = getUser();
        setUser(currentUser);
        setIsLoading(false); 
      }
    };

    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRiskChange = (value: string) => {
    setFormData(prev => ({ ...prev, riskTolerance: value as 'low' | 'medium' | 'high' }));
  };

  const validateForm = (): boolean => {
    const age = parseInt(formData.age);
    const income = parseInt(formData.income);
    const dependents = parseInt(formData.dependents);

    if (isNaN(age) || age < 18 || age > 100) {
      setError('Please enter a valid age between 18 and 100');
      return false;
    }
    if (isNaN(income) || income < 0) {
      setError('Please enter a valid income');
      return false;
    }
    if (isNaN(dependents) || dependents < 0) {
      setError('Please enter a valid number of dependents');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await authFetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/api/recommendation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          age: parseInt(formData.age),
          income: parseInt(formData.income),
          dependents: parseInt(formData.dependents),
          riskTolerance: formData.riskTolerance
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get recommendation');
      }

      const data: RecommendationResponse = await response.json();
      setRecommendation(data);
    } catch (err) {
      setError('Failed to get recommendation. Please try again.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      {/* User Header */}
      <div className="container mx-auto max-w-6xl">
        <div className="flex justify-between items-center mb-6 bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-gray-600" />
            <span className="text-gray-800">Welcome, {user?.name || 'User'}</span>
          </div>
          <Button onClick={handleLogout} variant="outline" size="sm">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl py-8">
        <div className="text-center mb-8">
          <div className="flex justify-center items-center gap-2 mb-4">
            <Shield className="h-10 w-10 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">Life Insurance Advisor</h1>
          </div>
          <p className="text-lg text-gray-600">Get personalized life insurance recommendations in seconds</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Form Section */}
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle>Tell Us About Yourself</CardTitle>
              <CardDescription>
                We'll use this information to provide you with a personalized recommendation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    name="age"
                    type="number"
                    placeholder="Enter your age"
                    value={formData.age}
                    onChange={handleInputChange}
                    min="18"
                    max="100"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="income">Annual Income ($)</Label>
                  <Input
                    id="income"
                    name="income"
                    type="number"
                    placeholder="Enter your annual income"
                    value={formData.income}
                    onChange={handleInputChange}
                    min="0"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dependents">Number of Dependents</Label>
                  <Input
                    id="dependents"
                    name="dependents"
                    type="number"
                    placeholder="How many people depend on you?"
                    value={formData.dependents}
                    onChange={handleInputChange}
                    min="0"
                    required
                  />
                </div>

                <div className="space-y-3">
                  <Label>Risk Tolerance</Label>
                  <RadioGroup value={formData.riskTolerance} onValueChange={handleRiskChange}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="low" id="low" />
                      <Label htmlFor="low" className="font-normal cursor-pointer">
                        Low - I prefer maximum security
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="medium" id="medium" />
                      <Label htmlFor="medium" className="font-normal cursor-pointer">
                        Medium - Balanced approach
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="high" id="high" />
                      <Label htmlFor="high" className="font-normal cursor-pointer">
                        High - I'm comfortable with more risk
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Calculating...
                    </>
                  ) : (
                    'Get My Recommendation'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Recommendation Section */}
          <div className="space-y-6">
            {recommendation ? (
              <>
                <Card className="shadow-xl border-blue-200 bg-gradient-to-br from-blue-50 to-white">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                      <CardTitle>Your Personalized Recommendation</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center p-6 bg-white rounded-lg shadow-inner">
                      <h3 className="text-2xl font-bold text-blue-600 mb-2">
                        {recommendation.recommendation.type}
                      </h3>
                      <p className="text-4xl font-bold text-gray-900 mb-1">
                        {formatCurrency(recommendation.recommendation.coverage)}
                      </p>
                      <p className="text-lg text-gray-600">
                        for {recommendation.recommendation.term} years
                      </p>
                      <div className="mt-4 p-3 bg-green-50 rounded-md">
                        <p className="text-sm text-gray-600">Estimated Monthly Premium</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(recommendation.recommendation.monthlyPremium)}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900">Why this recommendation?</h4>
                      <p className="text-gray-700 leading-relaxed">{recommendation.explanation}</p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                      <h4 className="font-semibold text-gray-900 mb-3">Calculation Factors</h4>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-sm text-gray-600">Income Multiplier</p>
                          <p className="text-lg font-semibold">{recommendation.factors.incomeMultiplier}x</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Dependents Factor</p>
                          <p className="text-lg font-semibold">{recommendation.factors.dependentsFactor}x</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Risk Adjustment</p>
                          <p className="text-lg font-semibold">{recommendation.factors.riskAdjustment}x</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Alert className="border-blue-200">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Next Steps</AlertTitle>
                  <AlertDescription>
                    This is a preliminary recommendation. For a comprehensive analysis and actual quotes, 
                    please consult with a licensed insurance agent who can consider your complete financial situation.
                  </AlertDescription>
                </Alert>
              </>
            ) : (
              <Card className="shadow-xl">
                <CardHeader>
                  <CardTitle>How It Works</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                        1
                      </div>
                      <div>
                        <h4 className="font-semibold">Provide Your Information</h4>
                        <p className="text-gray-600 text-sm">Fill out the simple form with your basic details</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                        2
                      </div>
                      <div>
                        <h4 className="font-semibold">Get Instant Analysis</h4>
                        <p className="text-gray-600 text-sm">Our algorithm calculates your coverage needs</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                        3
                      </div>
                      <div>
                        <h4 className="font-semibold">Receive Your Recommendation</h4>
                        <p className="text-gray-600 text-sm">Get a personalized life insurance recommendation</p>
                      </div>
                    </div>
                  </div>

                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertDescription>
                      Your information is secure and only used to generate your recommendation. 
                      We do not share your data with third parties.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}