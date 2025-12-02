import React, { useEffect, useState } from 'react';
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from '../firebaseConfig';
import Card from './Card';
import Button from './Button';
import LoadingSpinner from './LoadingSpinner';
import { CheckCircle, ArrowRight } from 'lucide-react';

const PaymentSuccess = ({ setView, currentUser }) => {
  const [status, setStatus] = useState('processing'); // 'processing', 'success', 'error'

  useEffect(() => {
    const activatePremium = async () => {
      if (!currentUser) return;

      try {
        // 1. Calculate new expiration (e.g., 30 days from now)
        // Ideally, this matches your billing cycle (monthly/yearly)
        const now = new Date();
        const newExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); 

        // 2. Update Firestore
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
          tier: 'Premium',
          premiumExpires: newExpiry, // Extends their access
          updatedAt: serverTimestamp()
        });

        setStatus('success');
      } catch (error) {
        console.error("Error updating premium status:", error);
        setStatus('error');
      }
    };

    activatePremium();
  }, [currentUser]);

  if (status === 'processing') {
    return <LoadingSpinner text="Confirming your subscription..." />;
  }

  if (status === 'error') {
    return (
      <Card className="text-center max-w-md mx-auto">
        <h2 className="text-red-600 text-xl font-bold">Something went wrong</h2>
        <p className="text-slate-600 my-4">
          We received your payment but couldn't update your profile automatically. 
          Please contact support.
        </p>
        <Button onClick={() => setView('home')}>Return Home</Button>
      </Card>
    );
  }

  return (
    <Card className="text-center max-w-md mx-auto p-8">
      <div className="flex justify-center mb-4">
        <CheckCircle className="w-16 h-16 text-green-500" />
      </div>
      <h1 className="text-3xl font-bold text-slate-800 mb-2">You're Premium!</h1>
      <p className="text-slate-600 mb-8">
        Thank you for upgrading. You now have full access to all AI features, simulations, and analytics.
      </p>
      <Button onClick={() => setView('home')} className="w-full py-3 text-lg flex items-center justify-center">
        Start Coaching <ArrowRight className="ml-2 w-5 h-5" />
      </Button>
    </Card>
  );
};

export default PaymentSuccess;