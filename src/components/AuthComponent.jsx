import React, { useState } from 'react';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

// --- 1. IMPORT FIRESTORE FUNCTIONS & DB ---
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from '../App.jsx'; // Import db from App.jsx

import Card from './Card';
import Button from './Button';
import myLogo from '../assets/SiteLogo.png'; // Assuming path is correct

const AuthComponent = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const auth = getAuth();

  // --- 2. HELPER FUNCTION TO CREATE USER PROFILE ---
  /**
   * Creates a user profile document in Firestore if one doesn't exist.
   * Uses { merge: true } to safely create new users without
   * overwriting existing users' data (like their 'tier').
   */
  const createUserProfile = async (user) => {
    if (!user) return;
    
    // Get a reference to the user's document
    const userRef = doc(db, "users", user.uid);
    
    // Create the profile document
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      // Add a default display name from Google or their email
      displayName: user.displayName || user.email.split('@')[0] || "New User",
      tier: 'Free', // Default tier for all new users
      joined: serverTimestamp()
    }, { merge: true }); // 'merge: true' is key!
  };

  const handleAuthAction = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        // User is logging in
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        // --- 3. CALL HELPER ON LOGIN ---
        // This will create a profile *if* they don't have one
        await createUserProfile(userCredential.user);
      } else {
        // User is signing up
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // --- 3. CALL HELPER ON SIGN UP ---
        await createUserProfile(userCredential.user);
      }
      // onAuthStateChanged in App.jsx will handle view change
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      // --- 3. CALL HELPER ON GOOGLE SIGN IN ---
      await createUserProfile(userCredential.user);
      // onAuthStateChanged in App.jsx will handle view change
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <img src={myLogo} alt="CoachQ Logo" className="w-20 h-20 mx-auto mb-4" />
      <h1 className="text-2xl font-bold text-center mb-6">{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
      <form onSubmit={handleAuthAction} className="space-y-4">
        <input 
          type="email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          placeholder="Email" 
          className="w-full p-3 border rounded-lg" 
          required 
        />
        <input 
          type="password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          placeholder="Password" 
          className="w-full p-3 border rounded-lg" 
          required 
        />
        <Button type="submit" className="w-full">{isLogin ? 'Log In' : 'Sign Up'}</Button>
      </form>
      <div className="my-4 text-center text-slate-500">or</div>
      <Button onClick={handleGoogleSignIn} variant="secondary" className="w-full">
        Sign in with Google
      </Button>
      <p className="mt-6 text-center">
        {isLogin ? "Don't have an account? " : "Already have an account? "}
        <button onClick={() => setIsLogin(!isLogin)} className="font-semibold text-stone-700 hover:underline">
          {isLogin ? 'Sign Up' : 'Log In'}
        </button>
      </p>
      {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
    </Card>
  );
};

export default AuthComponent;