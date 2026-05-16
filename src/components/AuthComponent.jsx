import React, { useState } from 'react';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup,
  sendPasswordResetEmail // <-- Added this import
} from "firebase/auth";
import Card from './Card';
import Button from './Button';
import myLogo from '../assets/SiteLogo.png'; 

const AuthComponent = ({ setView }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [resetMessage, setResetMessage] = useState(''); // <-- Added state for reset success
  const auth = getAuth();

  const handleAuthAction = async (e) => {
    e.preventDefault();
    setError('');
    setResetMessage('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      // Note: We do NOT create the user profile here. 
      // App.jsx listens for the auth change and creates the profile 
      // with the 7-day trial logic automatically.
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setResetMessage('');
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      setError(err.message);
    }
  };

  // --- NEW: Forgot Password Function ---
  const handleResetPassword = async () => {
    if (!email) {
      setError("Please enter your email address in the box above first.");
      setResetMessage('');
      return;
    }
    try {
      setError('');
      await sendPasswordResetEmail(auth, email);
      setResetMessage("Password reset email sent! Please check your inbox.");
    } catch (err) {
      setError(err.message);
      setResetMessage('');
    }
  };

  return (
    <Card className="max-w-md mx-auto fade-in">
      <img src={myLogo} alt="CoachQ Logo" className="w-20 h-20 mx-auto mb-4" />
      <h1 className="text-2xl font-bold text-center mb-6 text-slate-900">
        {isLogin ? 'Welcome Back' : 'Create Account'}
      </h1>
      
      <form onSubmit={handleAuthAction} className="space-y-4">
        <div>
            <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            placeholder="Email" 
            className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-800 outline-none transition-all" 
            required 
            />
        </div>
        
        <div>
            <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            placeholder="Password" 
            className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-800 outline-none transition-all" 
            required={!isLogin} // Only strictly require password if we aren't just typing an email for a reset
            />
            
            {/* --- NEW: Forgot Password Link --- */}
            {isLogin && (
                <div className="text-right mt-2">
                    <button 
                        type="button" 
                        onClick={handleResetPassword}
                        className="text-[10px] font-bold uppercase tracking-widest text-rose-800 hover:text-rose-900 transition-colors"
                    >
                        Forgot Password?
                    </button>
                </div>
            )}
        </div>

        <Button type="submit" className="w-full py-4 text-xs font-black uppercase tracking-widest bg-rose-800 hover:bg-rose-900 text-white shadow-xl shadow-rose-200 transition-all">
            {isLogin ? 'Log In' : 'Sign Up'}
        </Button>
      </form>

      <div className="my-6 flex items-center justify-center gap-4">
          <div className="h-px bg-slate-100 flex-1" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">or</span>
          <div className="h-px bg-slate-100 flex-1" />
      </div>
      
      <Button onClick={handleGoogleSignIn} variant="secondary" className="w-full py-4 text-xs font-bold text-slate-700 border-slate-200">
        <svg className="w-4 h-4 mr-2 inline-block" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Sign in with Google
      </Button>

      <p className="mt-8 text-center text-sm font-medium text-slate-600">
        {isLogin ? "Don't have an account? " : "Already have an account? "}
        <button onClick={() => {setIsLogin(!isLogin); setError(''); setResetMessage('');}} className="font-bold text-rose-800 hover:text-rose-900 transition-colors">
          {isLogin ? 'Sign Up' : 'Log In'}
        </button>
      </p>

      {/* --- Feedback Messages --- */}
      {error && (
          <div className="mt-6 p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-[10px] font-bold uppercase tracking-widest text-center animate-fade-in-up">
              {error}
          </div>
      )}
      {resetMessage && (
          <div className="mt-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-[10px] font-bold uppercase tracking-widest text-center animate-fade-in-up">
              {resetMessage}
          </div>
      )}

      {/* --- Terms and Privacy Footer --- */}
      <div className="mt-8 pt-6 border-t border-slate-100 text-center">
       <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          By continuing, you agree to our{' '}
          <button onClick={() => setView('terms')} className="text-slate-500 hover:text-rose-800 transition-colors">Terms</button>
          {' '}&{' '}
          <button onClick={() => setView('privacy')} className="text-slate-500 hover:text-rose-800 transition-colors">Privacy Policy</button>.
        </p>
      </div>
    </Card>
  );
};

export default AuthComponent;