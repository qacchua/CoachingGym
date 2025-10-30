import React from 'react';
import myLogo from '../assets/SiteLogo.png'; // Correct path

const Header = () => {
  return (
    <div className="max-w-6xl mx-auto mb-8 flex items-center gap-4">
      <img src={myLogo} alt="CoachQ Logo" className="w-12 h-12" />
      <h1 className="text-3xl font-bold text-slate-800">The Coaching Gym</h1>
    </div>
  );
};

export default Header;