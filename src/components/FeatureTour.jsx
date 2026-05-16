import React, { useState, useEffect } from 'react';
// Using the named export to keep Vite happy based on your previous fix!
import { Joyride, STATUS } from 'react-joyride';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const FeatureTour = ({ currentUser }) => {
  const [runTour, setRunTour] = useState(false);

  // Expanded tour steps mapping to all core features
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
    const checkTourStatus = async () => {
      if (!currentUser) return;

      // 1. Lightning-fast local check (prevents the tour from flashing on reload)
      const localCheck = localStorage.getItem(`hasSeenTour_${currentUser.uid}`);
      if (localCheck === 'true') {
        setRunTour(false);
        return;
      }

      // 2. Database check (uses the EXACT SAME path as the Gamification Wallet)
      try {
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (!userData.hasSeenTour) {
            setRunTour(true);
          }
        } else {
          // Brand new user
          setRunTour(true);
        }
      } catch (error) {
        console.error("Error checking tour status:", error);
      }
    };

    checkTourStatus();
  }, [currentUser]);

  const handleJoyrideCallback = async (data) => {
    const { status } = data;
    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRunTour(false); 
      
      if (currentUser) {
        // 1. Save to local storage instantly
        localStorage.setItem(`hasSeenTour_${currentUser.uid}`, 'true');

        // 2. Save to the correct database path
        try {
          const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
          const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', currentUser.uid);
          await setDoc(userRef, { hasSeenTour: true }, { merge: true });
        } catch (error) {
          console.error("Error updating tour status in DB:", error);
        }
      }
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