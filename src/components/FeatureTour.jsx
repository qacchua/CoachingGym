import React, { useState, useEffect } from 'react';
import { Joyride, STATUS } from 'react-joyride';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const FeatureTour = ({ currentUser }) => {
  const [runTour, setRunTour] = useState(false);

  const steps = [
    {
      target: 'body',
      content: (
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">Welcome to The Coaching Gym!</h2>
          <p className="text-sm text-slate-600 font-medium">Let's take a quick tour so you know exactly how to level up your coaching skills and earn XP.</p>
        </div>
      ),
      placement: 'center',
    },
    {
      target: '.tour-community',
      content: 'Community Lounge: Connect with other coaches, share insights, and discuss ICF competencies.',
      placement: 'bottom',
    },
    {
      target: '.tour-quiz',
      content: 'Knowledge Check: Test your grasp on the ICF core competencies through quizzes. Quiz yourself on individual competencies, or take a longer, in-depth competency assessment.',
      placement: 'bottom',
    },
    {
    target: '.tour-mock-exam',
    content: 'Test your readiness for the real thing with a strict 90-minute ACC Mock Exam.',
    placement: 'bottom',
    },
    {
      target: '.tour-simulation',
      content: 'Text Studio: Practice deliberate text-based coaching AI personas and receive feedback based on the ICF 2025 core competencies',
      placement: 'bottom',
    },
    {
      target: '.tour-voice-studio',
      content: 'Voice Studio: Practice real-time spoken conversations with AI personas and receive feedback based on the ICF 2025 core competencies.',
      placement: 'bottom',
    },
    {
      target: '.tour-transcript',
      content: 'Transcript Evaluator: Upload your recorded session transcripts for a deep-dive performance audit and feedback based on the ICF 2025 core competencies.',
      placement: 'bottom',
    },
    {
      target: '.tour-dilemmas',
      content: 'Ethical Dilemmas: Navigate complex scenarios based on the ICF Code of Ethics 2025.',
      placement: 'bottom',
    },
    {
      target: '.tour-dashboard',
      content: 'My Dashboard: Your Gamification Hub! Track your XP, monitor your daily streak, and watch your rank grow.',
      placement: 'top',
    },
    {
      target: '.tour-account',
      content: 'My Account: Manage your profile, adjust settings, and view your subscription tier here.',
      placement: 'bottom',
    }
  ];

  useEffect(() => {
    if (!currentUser) return;

    const localKey = `hasSeenTour_${currentUser.uid}`;

    // 1. If the database already knows they've seen it, abort.
    if (currentUser.hasSeenTour) {
      setRunTour(false);
      return;
    }

    // 2. Lightning-fast local browser check (fallback)
    if (localStorage.getItem(localKey) === 'true') {
      setRunTour(false);
      return;
    }

    // THE FIX: If they are a new user, start the tour AND instantly stamp the flags.
    // This guarantees it won't run again if they click a button and navigate away mid-tour!
    setRunTour(true);
    localStorage.setItem(localKey, 'true');

    try {
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', currentUser.uid);
      // We use fire-and-forget here so it doesn't block the UI
      setDoc(userRef, { hasSeenTour: true }, { merge: true }).catch(e => console.error(e));
    } catch (error) {
      console.error("Error setting DB tour flag:", error);
    }

  }, [currentUser.hasSeenTour, currentUser.uid]); 

  // We keep the callback just to gracefully stop the tour engine if they hit Skip/Done
  const handleJoyrideCallback = (data) => {
    const { status, action } = data;
    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];
    if (finishedStatuses.includes(status) || action === 'close') {
      setRunTour(false); 
    }
  };

  return (
    <Joyride
      steps={steps}
      run={runTour}
      continuous={true}
      showProgress={true}
      showSkipButton={true}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: '#9f1239', 
          textColor: '#1e293b',    
          zIndex: 10000,
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        buttonNext: {
          backgroundColor: '#9f1239',
          fontWeight: '900',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          fontSize: '10px',
          borderRadius: '8px',
        },
        buttonBack: {
          color: '#64748b',
          fontWeight: '700',
          textTransform: 'uppercase',
          fontSize: '10px',
        },
        buttonSkip: {
          color: '#94a3b8',
          fontWeight: '700',
          textTransform: 'uppercase',
          fontSize: '10px',
        }
      }}
    />
  );
};

export default FeatureTour;