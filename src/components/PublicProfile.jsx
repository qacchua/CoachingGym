import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig.js';
import { doc, getDoc } from "firebase/firestore"; 
import Card from './Card';
import Button from './Button';
import LoadingSpinner from './LoadingSpinner';
import { User, Phone, MapPin, Award, Link as LinkIcon, EyeOff } from 'lucide-react';

// --- 1. ADD 'currentUser' to the props ---
const PublicProfile = ({ setView, viewingProfileId, currentUser }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!viewingProfileId) {
      setView('home'); // Safety check
      return;
    }

    const fetchProfile = async () => {
      setLoading(true);
      const userRef = doc(db, "users", viewingProfileId);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        setProfile(userSnap.data());
      } else {
        console.error("No such user!");
      }
      setLoading(false);
    };

    fetchProfile();
  }, [viewingProfileId, setView]);

  // --- 2. Determine where the "Back" button should go ---
  const isViewingSelf = viewingProfileId === currentUser.uid;
  const backView = isViewingSelf ? 'profile' : 'chat';
  const backButtonText = isViewingSelf ? 'Back to My Account' : 'Back to Chat';


  if (loading) {
    return <LoadingSpinner text="Loading profile..." />;
  }

  if (!profile) {
    return (
      <Card className="max-w-2xl mx-auto text-center">
        <h1 className="text-2xl font-bold">Profile Not Found</h1>
        <p className="mt-4">This user's profile could not be loaded.</p>
        {/* --- 3. Use the dynamic 'backView' variable --- */}
        <Button onClick={() => setView(backView)} variant="secondary" className="mt-6">
          &larr; {backButtonText}
        </Button>
      </Card>
    );
  }
  
  // Helper to check visibility flags
  const isVisible = (key) => profile.publicVisibility && profile.publicVisibility[key];

  return (
    <Card className="max-w-2xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <div>
          {isVisible('showPhoto') && profile.profilePhotoUrl && (
            <img 
              src={profile.profilePhotoUrl} 
              alt={profile.displayName} 
              className="w-24 h-24 rounded-full mb-4 object-cover" 
            />
          )}
          <h1 className="text-3xl font-bold text-slate-800">{profile.displayName}</h1>
          {isVisible('showLocation') && profile.location && (
            <p className="text-slate-600 flex items-center gap-2 mt-2"><MapPin className="w-4 h-4" /> {profile.location}</p>
          )}
        </div>
        
        {/* --- 4. UPDATE THE BACK BUTTON HERE AS WELL --- */}
        <Button onClick={() => setView(backView)} variant="secondary" className="px-4 py-2 text-sm">
          &larr; {backButtonText}
        </Button>
      </div>

      <div className="space-y-6">
        
        {/* Contact Info (Unchanged) */}
        {isVisible('showContact') && profile.phone && (
          <section>
            <h2 className="text-xl font-semibold text-slate-700 mb-2 flex items-center gap-2"><Phone /> Contact Info</h2>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p><strong>Phone:</strong> {profile.phone}</p>
            </div>
          </section>
        )}

        {/* Accreditations (Unchanged) */}
        {isVisible('showAccreditation') && profile.accreditation && (
          <section>
            <h2 className="text-xl font-semibold text-slate-700 mb-2 flex items-center gap-2"><Award /> Accreditations</h2>
            <ul className="p-4 bg-slate-50 rounded-lg list-disc list-inside">
              {profile.accreditation.icfMember && <li>ICF Member</li>}
              {profile.accreditation.icfAcc && <li>ICF ACC Credential</li>}
              {profile.accreditation.icfPcc && <li>ICF PCC Credential</li>}
              {profile.accreditation.icfMcc && <li>ICF MCC Credential</li>}
              {profile.accreditation.bcc && <li>Board Certified Coach</li>}
              {profile.accreditation.other && <li>{profile.accreditation.other}</li>}
            </ul>
          </section>
        )}

        {/* Links (Unchanged) */}
        {isVisible('showLinks') && profile.links && (
          <section>
            <h2 className="text-xl font-semibold text-slate-700 mb-2 flex items-center gap-2"><LinkIcon /> Professional Links</h2>
            <div className="p-4 bg-slate-50 rounded-lg space-y-2">
              {profile.links.linkedIn && <p><a href={profile.links.linkedIn} target="_blank" rel="noopener noreferrer" className="text-stone-700 hover:underline">LinkedIn Profile</a></p>}
              {profile.links.website && <p><a href={profile.links.website} target="_blank" rel="noopener noreferrer" className="text-stone-700 hover:underline">Website</a></p>}
              {profile.links.youTube && <p><a href={profile.links.youTube} target="_blank" rel="noopener noreferrer" className="text-stone-700 hover:underline">YouTube Channel</a></p>}
              {profile.links.otherSocial && <p><a href={profile.links.otherSocial} target="_blank" rel="noopener noreferrer" className="text-stone-700 hover:underline">Other Social Media</a></p>}
            </div>
          </section>
        )}

        {/* Check if nothing is public (Unchanged) */}
        {!isVisible('showContact') && !isVisible('showLocation') && !isVisible('showAccreditation') && !isVisible('showLinks') && (
          <div className="p-6 bg-slate-50 rounded-lg text-center text-slate-500">
            <EyeOff className="w-8 h-8 mx-auto mb-2" />
            <p>{profile.displayName} has chosen to keep their profile details private.</p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default PublicProfile;