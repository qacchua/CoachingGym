import React, { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from '../firebaseConfig.js';
import Card from './Card';
import Button from './Button';
// --- 1. Import Plus icon ---
import { Send, Hash, Plus } from 'lucide-react';

const Chat = ({ setView, currentUser }) => {
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(''); // Start with no selection
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  // Fetch the list of channels
  useEffect(() => {
    const q = query(collection(db, "channels"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const channelsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setChannels(channelsData);
      // Automatically select the first channel if none is selected
      if (!selectedChannel && channelsData.length > 0) {
        setSelectedChannel(channelsData[0].id);
      }
    });
    return () => unsubscribe();
  }, [selectedChannel]); // Re-run if selectedChannel changes (to ensure it's still valid)

  // Fetch messages for the *selected* channel
  useEffect(() => {
    if (!selectedChannel) {
      setMessages([]); // Clear messages if no channel is selected
      return;
    }

    const q = query(
      collection(db, 'channels', selectedChannel, 'messages'),
      orderBy('timestamp', 'asc'),
    );
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      setMessages(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [selectedChannel]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle sending a new message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (newMessage.trim() === '' || !selectedChannel) return;

    try {
      await addDoc(collection(db, 'channels', selectedChannel, 'messages'), {
        text: newMessage,
        timestamp: serverTimestamp(),
        userId: currentUser.uid,
        userEmail: currentUser.email,
        displayName: currentUser.displayName || currentUser.email.split('@')[0]
      });
      setNewMessage('');
    } catch (error) {
      console.error("Error sending message: ", error);
    }
  };

  // --- 2. NEW FUNCTION TO CREATE A CHANNEL ---
  const handleCreateChannel = async () => {
    const channelName = prompt("Enter a name for the new channel:");
    
    if (!channelName || channelName.trim().length < 3) {
      if (channelName !== null) { // Only alert if they didn't hit 'cancel'
        alert("Channel name must be at least 3 characters long.");
      }
      return;
    }

    const channelDescription = prompt("Enter a brief description (optional):") || "User-created channel.";

    try {
      // Add the new channel doc to the 'channels' collection
      const newChannel = await addDoc(collection(db, "channels"), {
        name: channelName.trim(),
        description: channelDescription,
        createdBy: currentUser.uid,
        creatorName: currentUser.displayName || currentUser.email,
        timestamp: serverTimestamp()
      });
      // Automatically select the new channel
      setSelectedChannel(newChannel.id);
    } catch (error) {
      console.error("Error creating channel: ", error);
      alert("Could not create channel. See console for details.");
    }
  };

  return (
    <Card className="max-w-6xl mx-auto h-[85vh] flex">
      {/* Sidebar for Channels */}
      <div className="w-1/4 border-r pr-6 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Channels</h2>
          <Button onClick={() => setView('home')} variant="secondary" className="px-3 py-1 text-sm">&larr; Back</Button>
        </div>
        <div className="flex-grow space-y-2 overflow-y-auto">
          {channels.map(channel => (
            <button
              key={channel.id}
              onClick={() => setSelectedChannel(channel.id)}
              className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                selectedChannel === channel.id 
                  ? 'bg-stone-700 text-white' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Hash className="w-4 h-4" /> {channel.name}
            </button>
          ))}
        </div>
        
        {/* --- 3. NEW BUTTON ADDED --- */}
        <Button onClick={handleCreateChannel} variant="secondary" className="w-full mt-4 flex items-center justify-center gap-2">
          <Plus className="w-5 h-5" /> New Channel
        </Button>
      </div>

      {/* Main Chat Area */}
      <div className="w-3/4 flex flex-col pl-6">
        {messages.length === 0 && selectedChannel ? (
            <div className="flex-grow flex flex-col items-center justify-center text-slate-500">
                <Hash className="w-16 h-16" />
                <h3 className="text-xl font-bold mt-4">Welcome to #{channels.find(c => c.id === selectedChannel)?.name}</h3>
                <p>Be the first to say something!</p>
            </div>
        ) : (
            <div className="flex-grow overflow-y-auto mb-4 space-y-4 pr-4 -mr-4">
            {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.userId === currentUser.uid ? 'justify-end' : ''}`}>
                <div className={`p-3 rounded-lg max-w-lg ${
                    msg.userId === currentUser.uid 
                    ? 'bg-stone-700 text-white' 
                    : 'bg-slate-100 text-slate-800'
                }`}>
                    <button 
                    className="text-xs font-bold opacity-70 mb-1 text-left"
                    onClick={() => setView('publicProfile', { userId: msg.userId })}
                    disabled={msg.userId === currentUser.uid}
                    style={{ textDecoration: msg.userId !== currentUser.uid ? 'none' : 'none' }}
                    onMouseEnter={e => { if (msg.userId !== currentUser.uid) e.currentTarget.style.textDecoration = 'underline' }}
                    onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                    >
                    {msg.displayName || msg.userEmail}
                    </button>
                    <p>{msg.text}</p>
                </div>
                </div>
            ))}
            <div ref={messagesEndRef} />
            </div>
        )}

        {/* Message Input Form */}
        <form onSubmit={handleSendMessage} className="flex gap-4">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={selectedChannel ? `Message #${channels.find(c => c.id === selectedChannel)?.name}...` : "Select a channel to start"}
            className="flex-grow p-3 border rounded-lg"
            disabled={!selectedChannel}
          />
          <Button type="submit" disabled={!selectedChannel}>
            <Send className="w-5 h-5" />
          </Button>
        </form>
      </div>
    </Card>
  );
};

export default Chat;