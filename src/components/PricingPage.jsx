import React, { useState } from 'react';
import { Check, Star, ArrowLeft } from 'lucide-react';
import Button from './Button';
import Card from './Card';
import { stripeConfig } from '../firebaseConfig';

const PricingPage = ({ setView, currentUser }) => {
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'

 const handleUpgrade = () => {
    // Use the links from your central config file
    const link = billingCycle === 'monthly' 
      ? stripeConfig.monthlyLink 
      : stripeConfig.yearlyLink;
      
    if (link) {
      window.location.href = link; 
    } else {
      console.error("Stripe link not found");
      alert("Payment system is currently offline.");
    }
  };
  
  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      {/* Back Button */}
      <div className="mb-8">
        <Button 
          variant="secondary" 
          onClick={() => setView('home')} 
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
      </div>

      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-slate-800 mb-4">Upgrade to Premium</h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Unlock the full potential of your coaching practice with AI-powered feedback, 
          voice simulations, and unlimited insights.
        </p>

        {/* --- BILLING TOGGLE --- */}
        <div className="flex items-center justify-center mt-8 gap-4">
          <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-slate-900' : 'text-slate-500'}`}>
            Monthly
          </span>
          
          <button 
            onClick={() => setBillingCycle(prev => prev === 'monthly' ? 'yearly' : 'monthly')}
            className="relative w-16 h-8 bg-stone-700 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-stone-500"
          >
            <div 
              className={`absolute left-1 top-1 w-6 h-6 bg-white rounded-full transition-transform duration-200 ease-in-out ${
                billingCycle === 'yearly' ? 'translate-x-8' : 'translate-x-0'
              }`} 
            />
          </button>

          <span className={`text-sm font-medium flex items-center gap-2 ${billingCycle === 'yearly' ? 'text-slate-900' : 'text-slate-500'}`}>
            Yearly
            <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-bold">
              SAVE 17%
            </span>
          </span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        
        {/* --- FREE PLAN --- */}
        <Card className="p-8 border-2 border-slate-100 hover:border-slate-200 transition-colors">
          <h3 className="text-xl font-bold text-slate-800">Free Plan</h3>
          <div className="mt-4 mb-6">
            <span className="text-4xl font-bold text-slate-900">$0</span>
            <span className="text-slate-500">/mo</span>
          </div>
          
          <ul className="space-y-4 mb-8">
            <li className="flex items-center gap-3 text-slate-700">
              <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <span>68-Question ICF Quiz</span>
            </li>
            <li className="flex items-center gap-3 text-slate-700">
              <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <span>Community Chat Access</span>
            </li>
            <li className="flex items-center gap-3 text-slate-400">
              <Check className="w-5 h-5 text-slate-300 flex-shrink-0" />
              <span className="line-through decoration-slate-400">AI Transcript Analysis</span>
            </li>
            <li className="flex items-center gap-3 text-slate-400">
              <Check className="w-5 h-5 text-slate-300 flex-shrink-0" />
              <span className="line-through decoration-slate-400">Voice Simulations</span>
            </li>
          </ul>

          <Button 
            variant="secondary" 
            className="w-full py-6 text-lg bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-default"
          >
            Current Plan
          </Button>
        </Card>

        {/* --- PREMIUM PLAN --- */}
        <Card className="p-8 border-2 border-stone-800 relative shadow-xl transform scale-105 md:scale-105 bg-white">
          <div className="absolute top-0 right-0 bg-stone-700 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">
            RECOMMENDED
          </div>
          
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xl font-bold text-slate-800">Premium</h3>
            <Star className="w-5 h-5 text-amber-400 fill-current" />
          </div>

          <div className="mt-4 mb-6">
            {billingCycle === 'monthly' ? (
              // Monthly Price View
              <div>
                <span className="text-5xl font-bold text-slate-900">$19.99</span>
                <span className="text-slate-500">/mo</span>
              </div>
            ) : (
              // Yearly Price View
              <div>
                <div className="flex items-baseline">
                  <span className="text-5xl font-bold text-slate-900">$199.99</span>
                  <span className="text-slate-500 ml-1">/year</span>
                </div>
                <p className="text-emerald-600 text-sm font-medium mt-1">
                  Equals $16.66/mo (Save $40/year)
                </p>
              </div>
            )}
          </div>

          <ul className="space-y-4 mb-8">
            <li className="flex items-center gap-3 text-slate-900 font-medium">
              <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <span>Everything in Free</span>
            </li>
            <li className="flex items-center gap-3 text-slate-700">
              <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <span>Unlimited Transcript Reviews</span>
            </li>
            <li className="flex items-center gap-3 text-slate-700">
              <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <span>Interactive Voice Simulations</span>
            </li>
            <li className="flex items-center gap-3 text-slate-700">
              <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <span>Ethical Dilemma Simulator</span>
            </li>
            <li className="flex items-center gap-3 text-slate-700">
              <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <span>Advanced Analytics Dashboard</span>
            </li>
            <li className="flex items-center gap-3 text-slate-700">
              <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <span>And many more features in the pipeline </span>
            </li>
          </ul>

          <Button 
            onClick={handleUpgrade}
            className="w-full py-6 text-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all"
          >
            Upgrade Now
          </Button>
          <p className="text-xs text-center text-slate-400 mt-3">
            Secure payment via Stripe. Cancel anytime.
          </p>
          <p className="text-xs text-slate-400 mt-1">
              Read our <button onClick={() => setView('terms')} className="underline">Terms</button> 
              {' '}&{' '} 
              <button onClick={() => setView('privacy')} className="underline">Refund Policy</button>.
          </p>
        </Card>

      </div>
    </div>
  );
};

export default PricingPage;