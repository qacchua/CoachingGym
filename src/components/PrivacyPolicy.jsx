import React from 'react';
import Card from './Card';
import Button from './Button';

const PrivacyPolicy = ({ setView }) => {
  return (
    <Card className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Privacy Policy</h1>
        <Button onClick={() => setView('home')} variant="secondary">Back</Button>
      </div>

      <div className="prose prose-slate max-w-none text-slate-600 space-y-4">
        <p className="font-semibold text-red-600 bg-red-50 p-4 rounded-lg border border-red-200">
          Placeholder: Replace this text with your generated policy before going live.
        </p>

        <p><strong>Last Updated:</strong> [Date]</p>

        <h2 className="text-xl font-bold text-slate-800 mt-6">1. Information We Collect</h2>
        <p>
          We collect information you provide directly to us, such as your email address when you create an account, and the transcripts you upload for evaluation.
        </p>

        <h2 className="text-xl font-bold text-slate-800 mt-6">2. How We Use Your Information</h2>
        <p>
          We use the information we collect to provide, maintain, and improve our services, such as generating AI feedback on your coaching sessions.
        </p>

        <h2 className="text-xl font-bold text-slate-800 mt-6">3. Data Security</h2>
        <p>
          We take reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access.
        </p>
        
        {/* Add more sections as needed from your generator */}
      </div>
    </Card>
  );
};

export default PrivacyPolicy;