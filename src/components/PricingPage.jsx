import React, { useState } from 'react';
import { Check, Star, ArrowLeft } from 'lucide-react';
import Button from './Button';
import Card from './Card';
import { startStripeCheckout } from '../utils/api'; 

const PricingPage = ({ setView, currentUser }) => {
  const [billingCycle, setBillingCycle] = useState('monthly'); 
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false); 

  const MONTHLY_PRICE_ID = "price_1SS4i5LeECyDRlwVprrLMef2";
  const YEARLY_PRICE_ID = "price_1SS4i5LeECyDRlwVr0D9zHfn";

  const handleUpgrade = async () => {
    setIsCheckoutLoading(true);
    
    try {
      const priceId = billingCycle === 'monthly' ? MONTHLY_PRICE_ID : YEARLY_PRICE_ID;
      await startStripeCheckout(priceId);
    } catch (error) {
      console.error("Failed to start checkout", error);
      alert("Unable to reach the payment system. Please try again later.");
    } finally {
      setIsCheckoutLoading(false); 
    }
  };
  
  return (
    <div className="max-w-5xl mx-auto py-8 px-4 fade-in">
      {/* Back Button */}
      <div className="mb-8 border-b border-rose-50 pb-6">
        <Button 
          variant="secondary" 
          onClick={() => setView('home')} 
          className="flex items-center gap-2 border-rose-100 text-rose-800 font-bold uppercase tracking-widest text-[10px]"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Button>
      </div>

      <div className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter mb-4">Upgrade to Premium</h1>
        <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto">
          Unlock the full potential of your coaching practice with AI-powered feedback, 
          voice simulations, and unlimited insights.
        </p>

        {/* --- BILLING TOGGLE --- */}
        <div className="flex items-center justify-center mt-10 gap-4">
          <span className={`text-sm font-black uppercase tracking-widest ${billingCycle === 'monthly' ? 'text-slate-900' : 'text-slate-400'}`}>
            Monthly
          </span>
          
          <button 
            onClick={() => setBillingCycle(prev => prev === 'monthly' ? 'yearly' : 'monthly')}
            className="relative w-16 h-8 bg-rose-800 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-800 shadow-inner"
          >
            <div 
              className={`absolute left-1 top-1 w-6 h-6 bg-white rounded-full shadow-sm transition-transform duration-200 ease-in-out ${
                billingCycle === 'yearly' ? 'translate-x-8' : 'translate-x-0'
              }`} 
            />
          </button>

          <span className={`text-sm font-black uppercase tracking-widest flex items-center gap-2 ${billingCycle === 'yearly' ? 'text-slate-900' : 'text-slate-400'}`}>
            Yearly
            <span className="bg-rose-100 text-rose-800 text-[10px] px-2.5 py-1 rounded-full font-black tracking-widest">
              SAVE 17%
            </span>
          </span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto items-center mt-12">
        
        {/* --- FREE PLAN --- */}
        <Card className="p-8 border-2 border-slate-100 shadow-none bg-slate-50 opacity-80 hover:opacity-100 transition-opacity">
          <h3 className="text-xl font-black uppercase tracking-widest text-slate-400">Free Plan</h3>
          <div className="mt-4 mb-6">
            <span className="text-4xl font-black text-slate-900">$0</span>
            <span className="text-slate-400 font-bold uppercase tracking-widest text-xs ml-1">/mo</span>
          </div>
          
          <ul className="space-y-4 mb-8">
            <li className="flex items-center gap-3 text-slate-600 font-medium">
              <Check className="w-5 h-5 text-slate-400 flex-shrink-0" />
              <span>68-Question ICF Quiz</span>
            </li>
            <li className="flex items-center gap-3 text-slate-600 font-medium">
              <Check className="w-5 h-5 text-slate-400 flex-shrink-0" />
              <span>Community Chat Access</span>
            </li>
            <li className="flex items-center gap-3 text-slate-400 font-medium">
              <Check className="w-5 h-5 text-slate-300 flex-shrink-0" />
              <span className="line-through decoration-slate-300">AI Transcript Analysis</span>
            </li>
            <li className="flex items-center gap-3 text-slate-400 font-medium">
              <Check className="w-5 h-5 text-slate-300 flex-shrink-0" />
              <span className="line-through decoration-slate-300">Voice Simulations</span>
            </li>
          </ul>

          <Button 
            variant="secondary" 
            className="w-full py-5 text-[10px] font-black uppercase tracking-widest border-slate-200 text-slate-400 bg-transparent cursor-default"
          >
            Current Plan
          </Button>
        </Card>

        {/* --- PREMIUM PLAN --- */}
        <Card className="p-8 border-2 border-rose-800 relative shadow-2xl shadow-rose-900/10 bg-white transform scale-100 md:scale-105 z-10">
          <div className="absolute top-0 right-0 bg-rose-800 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-bl-xl rounded-tr-xl shadow-sm">
            RECOMMENDED
          </div>
          
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-2xl font-black uppercase tracking-widest text-rose-800">Premium</h3>
            <Star className="w-5 h-5 text-rose-800 fill-current" />
          </div>

          <div className="mt-4 mb-6">
            {billingCycle === 'monthly' ? (
              // Monthly Price View
              <div>
                <span className="text-5xl font-black text-slate-900">$19.99</span>
                <span className="text-slate-400 font-bold uppercase tracking-widest text-xs ml-1">/mo</span>
              </div>
            ) : (
              // Yearly Price View
              <div>
                <div className="flex items-baseline">
                  <span className="text-5xl font-black text-slate-900">$199.99</span>
                  <span className="text-slate-400 font-bold uppercase tracking-widest text-xs ml-1">/year</span>
                </div>
                <p className="text-rose-800 text-[10px] uppercase tracking-widest font-black mt-2">
                  Equals $16.66/mo (Save $40/year)
                </p>
              </div>
            )}
          </div>

          <div className="w-full h-px bg-rose-50 mb-6" />

          <ul className="space-y-4 mb-8">
            <li className="flex items-center gap-3 text-slate-900 font-bold">
              <Check className="w-5 h-5 text-rose-800 flex-shrink-0" />
              <span>Everything in Free</span>
            </li>
            <li className="flex items-center gap-3 text-slate-700 font-medium">
              <Check className="w-5 h-5 text-rose-800 flex-shrink-0" />
              <span>Unlimited Transcript Reviews</span>
            </li>
            <li className="flex items-center gap-3 text-slate-700 font-medium">
              <Check className="w-5 h-5 text-rose-800 flex-shrink-0" />
              <span>Interactive Voice Simulations</span>
            </li>
            <li className="flex items-center gap-3 text-slate-700 font-medium">
              <Check className="w-5 h-5 text-rose-800 flex-shrink-0" />
              <span>Ethical Dilemma Simulator</span>
            </li>
            <li className="flex items-center gap-3 text-slate-700 font-medium">
              <Check className="w-5 h-5 text-rose-800 flex-shrink-0" />
              <span>Advanced Analytics Dashboard</span>
            </li>
            <li className="flex items-center gap-3 text-slate-700 font-medium">
              <Check className="w-5 h-5 text-rose-800 flex-shrink-0" />
              <span>And many more features in the pipeline</span>
            </li>
          </ul>

          <Button 
            onClick={handleUpgrade}
            disabled={isCheckoutLoading}
            className="w-full py-5 bg-rose-800 hover:bg-rose-900 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-rose-200 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCheckoutLoading ? "Loading Secure Checkout..." : "Upgrade Now"}
          </Button>
          
          <div className="mt-5 text-center">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
              Secure payment via Stripe. Cancel anytime.
            </p>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-2">
                Read our <button onClick={() => setView('terms')} className="underline hover:text-rose-800 transition-colors">Terms</button> 
                {' '}&{' '} 
                <button onClick={() => setView('privacy')} className="underline hover:text-rose-800 transition-colors">Refund Policy</button>.
            </p>
          </div>
        </Card>

      </div>
    </div>
  );
};

export default PricingPage;