import React from 'react';
import Card from './Card';
import Button from './Button';
import { Check, Star, ArrowLeft } from 'lucide-react';

const PricingPage = ({ setView }) => {
  
  // REPLACE THIS with your actual Stripe Payment Link
  const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/test_..."; 

  return (
    <Card className="max-w-4xl mx-auto text-center">
      <div className="flex justify-start mb-4">
        <Button onClick={() => setView('home')} variant="secondary">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
      </div>

      <h1 className="text-3xl font-bold text-slate-800 mb-4">Upgrade to Premium</h1>
      <p className="text-slate-600 mb-8 text-lg">
        Unlock the full potential of your coaching practice with AI-powered feedback.
      </p>

      <div className="grid md:grid-cols-2 gap-8 text-left">
        
        {/* Free Tier */}
        <div className="p-6 border border-slate-200 rounded-2xl bg-slate-50">
          <h2 className="text-xl font-bold text-slate-700">Free Plan</h2>
          <p className="text-3xl font-bold mt-2 mb-6">$0<span className="text-sm font-normal text-slate-500">/mo</span></p>
          <ul className="space-y-3 mb-8">
            <li className="flex items-center"><Check className="w-5 h-5 text-green-500 mr-2" /> 68-Question ICF Quiz</li>
            <li className="flex items-center"><Check className="w-5 h-5 text-green-500 mr-2" /> Community Chat Access</li>
            <li className="flex items-center text-slate-400"><Check className="w-5 h-5 mr-2" /> AI Transcript Analysis</li>
            <li className="flex items-center text-slate-400"><Check className="w-5 h-5 mr-2" /> Voice Simulations</li>
          </ul>
          <Button onClick={() => setView('home')} variant="secondary" className="w-full">
            Current Plan
          </Button>
        </div>

        {/* Premium Tier */}
        <div className="p-6 border-2 border-stone-700 rounded-2xl bg-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-stone-700 text-white text-xs px-3 py-1 rounded-bl-lg">
            RECOMMENDED
          </div>
          <h2 className="text-xl font-bold text-stone-800 flex items-center">
            Premium <Star className="w-5 h-5 ml-2 text-yellow-500 fill-yellow-500" />
          </h2>
          <p className="text-3xl font-bold mt-2 mb-6">$29<span className="text-sm font-normal text-slate-500">/mo</span></p>
          <ul className="space-y-3 mb-8">
            <li className="flex items-center"><Check className="w-5 h-5 text-green-500 mr-2" /> <strong>Everything in Free</strong></li>
            <li className="flex items-center"><Check className="w-5 h-5 text-green-500 mr-2" /> Unlimited Transcript Reviews</li>
            <li className="flex items-center"><Check className="w-5 h-5 text-green-500 mr-2" /> Interactive Voice Simulations</li>
            <li className="flex items-center"><Check className="w-5 h-5 text-green-500 mr-2" /> Ethical Dilemma Simulator</li>
            <li className="flex items-center"><Check className="w-5 h-5 text-green-500 mr-2" /> Advanced Analytics Dashboard</li>
          </ul>
          
          <a href={STRIPE_PAYMENT_LINK} target="_blank" rel="noopener noreferrer">
            <Button className="w-full py-3 text-lg">
              Upgrade Now
            </Button>
          </a>
          <p className="text-xs text-center text-slate-400 mt-3">
            Secure payment via Stripe. Cancel anytime.
          </p>
        </div>
      </div>
    </Card>
  );
};

export default PricingPage;