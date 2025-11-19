import React from 'react';
import Card from './Card';
import Button from './Button';

const TermsOfService = ({ setView }) => {
  return (
    <Card className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Terms of Service</h1>
        <Button onClick={() => setView('home')} variant="secondary">Back</Button>
      </div>
      
      <div className="prose prose-slate max-w-none text-slate-600 space-y-4">
        <p className="font-semibold text-red-600 bg-red-50 p-4 rounded-lg border border-red-200">
          Placeholder: Replace this text with your generated terms before going live.
        </p>
        
        <p><strong>Last Updated:</strong> [Date]</p>

        <h2 className="text-xl font-bold text-slate-800 mt-6">1. Acceptance of Terms</h2>
        <p>
          By accessing and using "The Coaching Gym" (the "Service"), you accept and agree to be bound by the terms and provision of this agreement.
        </p>

        <h2 className="text-xl font-bold text-slate-800 mt-6">2. Description of Service</h2>
        <p>
          The Service provides AI-driven coaching simulations, evaluations, and quizzes for educational purposes. The feedback provided by the AI is for training only and does not constitute professional supervision.
        </p>

        <h2 className="text-xl font-bold text-slate-800 mt-6">3. User Accounts</h2>
        <p>
          You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.
        </p>

        {/* Add more sections as needed from your generator */}
      </div>
    </Card>
  );
};

export default TermsOfService;