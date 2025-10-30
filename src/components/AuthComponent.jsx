import React, { useState } from 'react';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import Card from './Card';
import Button from './Button';
import myLogo from '../assets/SiteLogo.png'; // Correct path

const AuthComponent = () => { // Removed setUser prop as App handles auth state
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const auth = getAuth(); // Get auth instance

  const handleAuthAction = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      // onAuthStateChanged in App will handle view change
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // onAuthStateChanged in App will handle view change
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <img src={myLogo} alt="CoachQ Logo" className="w-20 h-20 mx-auto mb-4" />
      <h1 className="text-2xl font-bold text-center mb-6">{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
      <form onSubmit={handleAuthAction} className="space-y-4">
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full p-3 border rounded-lg" required />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full p-3 border rounded-lg" required />
        <Button type="submit" className="w-full">{isLogin ? 'Log In' : 'Sign Up'}</Button>
      </form>
      <div className="my-4 text-center text-slate-500">or</div>
      <Button onClick={handleGoogleSignIn} variant="secondary" className="w-full"> Sign in with Google </Button>
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