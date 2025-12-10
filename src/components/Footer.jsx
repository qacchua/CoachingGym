import React from 'react';

const Footer = ({ setView }) => {
  return (
    <footer className="w-full py-6 mt-12 border-t border-slate-200 text-center text-slate-500 text-sm">
      <div className="flex justify-center gap-6 mb-2">
        <button onClick={() => setView('terms')} className="hover:text-slate-800">Terms of Service</button>
        <button onClick={() => setView('privacy')} className="hover:text-slate-800">Privacy Policy</button>
      </div>
      <p>&copy; {new Date().getFullYear()} The Coaching Gym. All rights reserved.</p>
    </footer>
  );
};

export default Footer;