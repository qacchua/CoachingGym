import React, { useEffect, useState } from 'react';
import { db } from '../firebaseConfig';
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import Card from './Card';
import Button from './Button';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const PaymentSuccess = ({ setView, currentUser }) => {
  const [status, setStatus] = useState('processing');

  useEffect(() => {
    const activatePremium = async () => {
      if (!currentUser?.uid) return;

      try {
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', currentUser.uid);

        // --- 1. GET THE PLAN FROM URL ---
        const params = new URLSearchParams(window.location.search);
        const planType = params.get('plan'); // 'monthly' or 'yearly'

        // --- 2. CALCULATE EXPIRY ---
        const newExpiry = new Date();
        if (planType === 'yearly') {
            // Give 370 days (Year + 5 day buffer)
            newExpiry.setDate(newExpiry.getDate() + 370); 
        } else {
            // Default to Monthly: Give 45 days (Month + 15 day buffer)
            // This buffer prevents them from getting locked out immediately 
            // if their payment date shifts slightly.
            newExpiry.setDate(newExpiry.getDate() + 45); 
        }

        // --- 3. UPDATE FIRESTORE ---
        await updateDoc(userRef, {
          tier: 'Premier',
          status: 'active',
          plan: planType || 'monthly', // Save which plan they are on
          premiumExpires: newExpiry,
          lastPaymentDate: serverTimestamp()
        });

        setStatus('success');
      } catch (error) {
        console.error("Error activating premium:", error);
        setStatus('error');
      }
    };

    activatePremium();
  }, [currentUser]);

  // ... (Rest of your render code remains the same) ...
  return (
    <Card className="max-w-md mx-auto text-center mt-10">
      {status === 'processing' && (
        <div className="py-10">
          <Loader2 className="w-16 h-16 text-stone-600 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold">Finalizing your {new URLSearchParams(window.location.search).get('plan')} plan...</h2>
          <p className="text-slate-500">Please wait a moment.</p>
        </div>
      )}
      {/* ... Success and Error views ... */}
       {status === 'success' && (
        <div className="py-6">
          <div className="flex justify-center mb-6">
            <CheckCircle className="w-20 h-20 text-emerald-500" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Welcome to Premium!</h1>
          <p className="text-slate-600 mb-8">
            Your account has been successfully upgraded. You now have unlimited access to all coaching tools.
          </p>
          <Button onClick={() => setView('home')} className="w-full">
            Go to Dashboard
          </Button>
        </div>
      )}

      {status === 'error' && (
        <div className="py-6">
           <div className="flex justify-center mb-6">
            <AlertCircle className="w-20 h-20 text-rose-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Activation Issue</h1>
          <p className="text-slate-600 mb-6">
            We received your payment, but had trouble updating your profile automatically. 
            Please contact support or try refreshing this page.
          </p>
          <Button onClick={() => window.location.reload()} variant="secondary" className="w-full">
            Retry Activation
          </Button>
        </div>
      )}
    </Card>
  );
};

export default PaymentSuccess;