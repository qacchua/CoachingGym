import React, { useState, useEffect } from 'react';
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
import { db } from '../firebaseConfig.js';
import { doc, updateDoc } from "firebase/firestore"; 
import Card from './Card';
import Button from './Button';
import { User, Shield, Mail, Check, Link as LinkIcon, Phone, MapPin, Award, Eye, EyeOff } from 'lucide-react';

// --- Helper: A simple toggle switch component ---
const Toggle = ({ label, isToggled, onToggle }) => (
  <label className="flex items-center cursor-pointer">
    <div className="relative">
      <input type="checkbox" className="sr-only" checked={isToggled} onChange={onToggle} />
      <div className={`block w-14 h-8 rounded-full ${isToggled ? 'bg-stone-700' : 'bg-slate-300'}`}></div>
      <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${isToggled ? 'translate-x-6' : ''}`}></div>
    </div>
    <div className="ml-3 text-slate-700">{label}</div>
  </label>
);

// --- Main Profile Component ---
const Profile = ({ setView, currentUser }) => {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const auth = getAuth();

  // --- State for ALL form fields ---
  const [formData, setFormData] = useState({
    // Mandatory
    displayName: '',
    // Optional
    profilePhotoUrl: '',
    phone: '',
    location: '',
    accreditation: {
      icfMember: false,
      icfAcc: false,
      icfPcc: false,
      icfMcc: false,
      bcc: false,
      other: '',
    },
    links: {
      linkedIn: '',
      website: '',
      youTube: '',
      otherSocial: '',
    },
    // Toggles for public visibility
    publicVisibility: {
      showPhoto: false,
      showContact: false,
      showLocation: false,
      showAccreditation: false,
      showLinks: false,
    }
  });

  // --- Load currentUser data into the form state ---
  useEffect(() => {
    if (currentUser) {
      setFormData({
        displayName: currentUser.displayName || '',
        profilePhotoUrl: currentUser.profilePhotoUrl || '',
        phone: currentUser.phone || '',
        location: currentUser.location || '',
        accreditation: currentUser.accreditation || {
          icfMember: false, icfAcc: false, icfPcc: false, icfMcc: false, bcc: false, other: '',
        },
        links: currentUser.links || {
          linkedIn: '', website: '', youTube: '', otherSocial: '',
        },
        publicVisibility: currentUser.publicVisibility || {
          showPhoto: false, showContact: false, showLocation: false, showAccreditation: false, showLinks: false,
        }
      });
    }
  }, [currentUser]);

  // --- Handlers to update the complex formData state ---
  const handleTextChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLinkChange = (e) => {
    setFormData({
      ...formData,
      links: { ...formData.links, [e.target.name]: e.target.value }
    });
  };

  const handleAccreditationChange = (e) => {
    setFormData({
      ...formData,
      accreditation: { ...formData.accreditation, [e.target.name]: e.target.checked }
    });
  };

  const handleAccreditationTextChange = (e) => {
    setFormData({
      ...formData,
      accreditation: { ...formData.accreditation, other: e.target.value }
    });
  };

  const handleToggleChange = (e) => {
    setFormData({
      ...formData,
      publicVisibility: { ...formData.publicVisibility, [e.target.name]: e.target.checked }
    });
  };

  // --- Save function to update Firestore ---
  const handleSaveProfile = async () => {
    setIsSaving(true);
    setMessage('');
    setError('');

    const userRef = doc(db, "users", currentUser.uid);
    
    try {
      await updateDoc(userRef, formData);
      setMessage('Profile saved successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // --- Other functions ---
  const handlePasswordReset = async () => {
    setError('');
    setMessage('');
    try {
      await sendPasswordResetEmail(auth, currentUser.email);
      setMessage('Success! Check your email inbox for a password reset link.');
    } catch (err) {
      setError(err.message);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000).toLocaleDateString();
    }
    return new Date(timestamp).toLocaleDateString();
  };

  // --- The new, expanded JSX ---
  return (
    <Card className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start mb-6 gap-2">
        <h1 className="text-3xl font-bold text-slate-800">My Account</h1>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            onClick={() => setView('publicProfile', { userId: currentUser.uid })} 
            variant="secondary" 
            className="px-4 py-2 text-sm"
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview Public Profile
          </Button>
          <Button onClick={() => setView('home')} variant="secondary" className="px-4 py-2 text-sm">&larr; Back to Home</Button>
        </div>
      </div>

      <div className="space-y-8">
        
        {/* --- Section 1: Mandatory Details --- */}
        <section>
          <h2 className="text-xl font-semibold text-slate-700 mb-3 flex items-center gap-2"><User /> Profile Details</h2>
          <div className="p-6 bg-slate-50 rounded-lg space-y-4">
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-slate-700">Display Name (Mandatory)</label>
              <input id="displayName" name="displayName" type="text"
                value={formData.displayName}
                onChange={handleTextChange}
                className="w-full p-2 border rounded-lg"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">Email (Mandatory, read-only)</label>
              <input id="email" type="email" value={currentUser.email} disabled className="w-full p-2 border rounded-lg bg-slate-200" />
            </div>
            <div>
              <label htmlFor="profilePhotoUrl" className="block text-sm font-medium text-slate-700">Profile Photo URL (Optional)</label>
              <input id="profilePhotoUrl" name="profilePhotoUrl" type="text"
                value={formData.profilePhotoUrl}
                onChange={handleTextChange}
                placeholder="https://... (paste a link to your photo)"
                className="w-full p-2 border rounded-lg"
              />
              <Toggle label="Show photo publicly" isToggled={formData.publicVisibility.showPhoto} onToggle={(e) => handleToggleChange({ target: { name: 'showPhoto', checked: e.target.checked }})} />
            </div>
          </div>
        </section>

        {/* --- Section 2: Contact & Location (Optional) --- */}
        <section>
          <h2 className="text-xl font-semibold text-slate-700 mb-3 flex items-center gap-2"><Phone /> Contact & Location</h2>
          <div className="p-6 bg-slate-50 rounded-lg space-y-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-slate-700">Phone Number (Optional)</label>
              <input id="phone" name="phone" type="tel"
                value={formData.phone}
                onChange={handleTextChange}
                placeholder="+1 (555) 555-1234"
                className="w-full p-2 border rounded-lg"
              />
              <Toggle label="Show phone publicly" isToggled={formData.publicVisibility.showContact} onToggle={(e) => handleToggleChange({ target: { name: 'showContact', checked: e.target.checked }})} />
            </div>
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-slate-700">Location (Optional)</label>
              <input id="location" name="location" type="text"
                value={formData.location}
                onChange={handleTextChange}
                placeholder="City, Country"
                className="w-full p-2 border rounded-lg"
              />
              <Toggle label="Show location publicly" isToggled={formData.publicVisibility.showLocation} onToggle={(e) => handleToggleChange({ target: { name: 'showLocation', checked: e.target.checked }})} />
            </div>
          </div>
        </section>

        {/* --- Section 3: Accreditation (Optional) --- */}
        <section>
          <h2 className="text-xl font-semibold text-slate-700 mb-3 flex items-center gap-2"><Award /> Coaching Accreditation</h2>
          <div className="p-6 bg-slate-50 rounded-lg space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {['icfMember', 'icfAcc', 'icfPcc', 'icfMcc', 'bcc'].map((id) => (
                <label key={id} className="flex items-center">
                  <input type="checkbox" name={id} checked={formData.accreditation[id]} onChange={handleAccreditationChange} className="h-4 w-4 text-stone-600" />
                  <span className="ml-2">{id.replace('icf', 'ICF ').replace('bcc', 'Board Certified Coach').replace('Acc', 'ACC').replace('Pcc', 'PCC').replace('Mcc', 'MCC')}</span>
                </label>
              ))}
            </div>
            <div>
              <label htmlFor="other" className="block text-sm font-medium text-slate-700">Other Credential (please specify)</label>
              <input id="other" name="other" type="text"
                value={formData.accreditation.other}
                onChange={handleAccreditationTextChange}
                className="w-full p-2 border rounded-lg"
              />
            </div>
            <Toggle label="Show accreditation publicly" isToggled={formData.publicVisibility.showAccreditation} onToggle={(e) => handleToggleChange({ target: { name: 'showAccreditation', checked: e.target.checked }})} />
          </div>
        </section>

        {/* --- Section 4: Links (Optional) --- */}
        <section>
          <h2 className="text-xl font-semibold text-slate-700 mb-3 flex items-center gap-2"><LinkIcon /> Professional Links</h2>
          <div className="p-6 bg-slate-50 rounded-lg space-y-4">
            <div>
              <label htmlFor="linkedIn" className="block text-sm font-medium text-slate-700">LinkedIn Profile</label>
              <input id="linkedIn" name="linkedIn" type="url" value={formData.links.linkedIn} onChange={handleLinkChange} placeholder="https://linkedin.com/in/..." className="w-full p-2 border rounded-lg" />
            </div>
            <div>
              <label htmlFor="website" className="block text-sm font-medium text-slate-700">Website</label>
              <input id="website" name="website" type="url" value={formData.links.website} onChange={handleLinkChange} placeholder="https://mycoachingsite.com" className="w-full p-2 border rounded-lg" />
            </div>
            <div>
              <label htmlFor="youTube" className="block text-sm font-medium text-slate-700">YouTube Channel</label>
              <input id="youTube" name="youTube" type="url" value={formData.links.youTube} onChange={handleLinkChange} placeholder="https://youtube.com/c/..." className="w-full p-2 border rounded-lg" />
            </div>
            <div>
              <label htmlFor="otherSocial" className="block text-sm font-medium text-slate-700">Other Social Media</label>
              <input id="otherSocial" name="otherSocial" type="url" value={formData.links.otherSocial} onChange={handleLinkChange} placeholder="https://..." className="w-full p-2 border rounded-lg" />
            </div>
            <Toggle label="Show links publicly" isToggled={formData.publicVisibility.showLinks} onToggle={(e) => handleToggleChange({ target: { name: 'showLinks', checked: e.target.checked }})} />
          </div>
        </section>

        {/* --- Section 5: Membership & Security (Read-Only) --- */}
        <section>
          <h2 className="text-xl font-semibold text-slate-700 mb-3 flex items-center gap-2"><Shield /> Membership & Security</h2>
          <div className="p-6 bg-slate-50 rounded-lg space-y-4">
            <div>
              <p><strong>Coaching Gym Member Since:</strong> {formatDate(currentUser.joined)}</p>
              <p><strong>Membership Tier:</strong> <span className="font-bold text-stone-700">{currentUser.tier}</span></p>
              <p><strong>Membership Renewal Date:</strong> {formatDate(currentUser.renewalDate) || 'N/A'}</p>
              <p className="text-sm text-slate-500">(Renewal date will be auto-populated by your Stripe subscription.)</p>
            </div>
            <div className="pt-4 border-t">
              <p className="mb-4">Need to change your password?</p>
              <Button onClick={handlePasswordReset} variant="secondary">
                Send Password Reset Email
              </Button>
            </div>
          </div>
        </section>

        {/* --- Save Button & Feedback --- */}
        <div className="text-right">
          <Button onClick={handleSaveProfile} disabled={isSaving}>
            {isSaving ? 'Saving...' : <><Check className="w-5 h-5" /> Save All Changes</>}
          </Button>
          {message && <p className="text-emerald-600 mt-4 text-center">{message}</p>}
          {error && <p className="text-rose-600 mt-4 text-center">{error}</p>}
        </div>
      </div>
    </Card>
  );
};

export default Profile;