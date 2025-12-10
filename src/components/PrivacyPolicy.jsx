import React, { useEffect } from 'react';
import Card from './Card';
import Button from './Button';

const PrivacyPolicy = ({ setView }) => {

  useEffect(() => {
    // Define the script ID
    const scriptId = 'termly-jssdk';

    // 1. Force Cleanup: Remove any existing instance of the script
    // This ensures it runs fresh and finds the NEW div on this page.
    const existingScript = document.getElementById(scriptId);
    if (existingScript) {
      existingScript.remove();
    }

    // 2. Insert the Script Fresh
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = "https://app.termly.io/embed-policy.min.js";
    script.async = true; // Allow page to load while script fetches
    document.body.appendChild(script);

    // 3. Cleanup on Unmount (When user leaves this page)
    return () => {
      const scriptToRemove = document.getElementById(scriptId);
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, []);

  return (
    <Card className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Privacy Policy</h1>
        <Button onClick={() => setView('home')} variant="secondary">Back</Button>
      </div>

      {/* The Embed Div */}
      <div 
        name="termly-embed" 
        data-id="e89ac2ba-db4d-4edc-81c4-3224f91fab11"
        className="min-h-[200px]" // Ensures layout doesn't jump too much
      >
        {/* Placeholder text that shows while loading */}
        <p className="text-slate-400 text-center italic py-10">
          Loading Policy...
        </p>
      </div>
      
    </Card>
  );
};

export default PrivacyPolicy;