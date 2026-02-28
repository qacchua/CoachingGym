import React, { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from '../firebaseConfig.js';
import Card from './Card';
import Button from './Button';
import { Send, Hash, Plus, ArrowLeft } from 'lucide-react';

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
    <Card className="max-w-6xl mx-auto h-[85vh] flex border-rose-100 shadow-xl fade-in p-6 md:p-8">
      {/* Sidebar for Channels */}
      <div className="w-1/4 border-r border-rose-50 pr-6 flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Channels</h2>
          <Button onClick={() => setView('home')} variant="secondary" className="p-2 border-rose-100 text-rose-800 hover:bg-rose-50">
             <ArrowLeft size={16}/>
          </Button>
        </div>
        <div className="flex-grow space-y-2 overflow-y-auto custom-scrollbar pr-2">
          {channels.map(channel => (
            <button
              key={channel.id}
              onClick={() => setSelectedChannel(channel.id)}
              className={`w-full text-left px-4 py-3 rounded-2xl flex items-center gap-3 transition-all font-bold text-xs uppercase tracking-widest ${
                selectedChannel === channel.id 
                  ? 'bg-rose-800 text-white shadow-md' 
                  : 'text-slate-500 hover:bg-rose-50 hover:text-rose-800'
              }`}
            >
              <Hash className="w-4 h-4 opacity-70" /> {channel.name}
            </button>
          ))}
        </div>
        
        {/* --- 3. NEW BUTTON ADDED --- */}
        <Button onClick={handleCreateChannel} variant="secondary" className="w-full mt-6 flex items-center justify-center gap-2 border-rose-200 text-rose-800 font-black uppercase tracking-widest text-xs py-4 hover:bg-rose-50 transition-colors">
          <Plus className="w-4 h-4" /> New Channel
        </Button>
      </div>

      {/* Main Chat Area */}
      <div className="w-3/4 flex flex-col pl-6">
        {messages.length === 0 && selectedChannel ? (
            <div className="flex-grow flex flex-col items-center justify-center text-slate-400 fade-in">
                <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mb-4">
                    <Hash className="w-10 h-10 text-rose-800" />
                </div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mt-2">Welcome to #{channels.find(c => c.id === selectedChannel)?.name}</h3>
                <p className="text-sm font-medium mt-2">Be the first to say something!</p>
            </div>
        ) : (
            <div className="flex-grow overflow-y-auto mb-4 space-y-6 pr-4 -mr-4 custom-scrollbar">
            {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.userId === currentUser.uid ? 'justify-end' : ''}`}>
                <div className={`p-4 rounded-2xl max-w-lg text-sm leading-relaxed ${
                    msg.userId === currentUser.uid 
                    ? 'bg-rose-800 text-white rounded-br-none shadow-md' 
                    : 'bg-slate-50 border border-slate-100 text-slate-700 rounded-bl-none shadow-sm'
                }`}>
                    <button 
                    className={`text-[10px] font-black uppercase tracking-widest mb-1.5 block text-left transition-opacity ${msg.userId === currentUser.uid ? 'text-rose-200 hover:text-white' : 'text-slate-400 hover:text-rose-800'}`}
                    onClick={() => setView('publicProfile', { userId: msg.userId })}
                    disabled={msg.userId === currentUser.uid}
                    >
                    {msg.displayName || msg.userEmail}
                    </button>
                    <p className="font-medium">{msg.text}</p>
                </div>
                </div>
            ))}
            <div ref={messagesEndRef} />
            </div>
        )}

        {/* Message Input Form */}
        <form onSubmit={handleSendMessage} className="flex gap-3 mt-4 pt-6 border-t border-rose-50">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={selectedChannel ? `Message #${channels.find(c => c.id === selectedChannel)?.name}...` : "Select a channel to start"}
            className="flex-grow p-4 border border-rose-100 rounded-2xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-rose-800 outline-none transition-all font-medium text-slate-800 placeholder:text-slate-400"
            disabled={!selectedChannel}
          />
          <Button 
            type="submit" 
            disabled={!selectedChannel || !newMessage.trim()}
            className="bg-rose-800 hover:bg-rose-900 text-white p-4 rounded-2xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </Button>
        </form>
      </div>
    </Card>
  );
};

export default Chat;