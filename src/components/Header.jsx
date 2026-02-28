import React from 'react';
import { User, LayoutDashboard, LogOut, Home } from 'lucide-react';
import myLogo from '../assets/SiteLogo.png';

const Header = ({ currentUser, setView }) => {
  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50 py-4 px-6 mb-8">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        
        {/* LOGO & BRAND - Clicking this also goes Home */}
        <div 
          className="flex items-center gap-3 cursor-pointer group" 
          onClick={() => setView('home')}
        >
          <img src={myLogo} alt="CoachQ Logo" className="w-10 h-10 group-hover:scale-110 transition-transform" />
          <h1 className="text-2xl font-black text-slate-800 tracking-tighter hidden sm:block">
            THE COACHING GYM
          </h1>
        </div>

        {/* NAVIGATION ACTIONS */}
        <div className="flex items-center gap-1 md:gap-3">
          
          {/* Dedicated Home Button */}
          <button 
            onClick={() => setView('home')}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
          >
            <Home className="w-4 h-4" /> 
            <span className="hidden lg:inline">Home</span>
          </button>

          {/* Dashboard Button */}
          <button 
            onClick={() => setView('dashboard')}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
          >
            <LayoutDashboard className="w-4 h-4" /> 
            <span className="hidden lg:inline">My Dashboard</span>
          </button>

          {/* Account Button */}
          <button 
            onClick={() => setView('profile')}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
          >
            <User className="w-4 h-4" /> 
            <span className="hidden lg:inline">My Account</span>
          </button>

          <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block" />

          {/* Sign Out Button - Wine Red Theme */}
          <button 
            onClick={() => setView('logout')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-rose-800 bg-rose-50 hover:bg-rose-100 transition-all shadow-sm shadow-rose-100"
          >
            <LogOut className="w-4 h-4" /> 
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;