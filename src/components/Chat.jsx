// src/components/Chat.jsx

import React, { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from '../App.jsx'; // Correct db import
import Card from './Card';
import Button from './Button';
import { Send, Hash } from 'lucide-react';

const Chat = ({ setView, currentUser }) => {
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState('general'); // Default channel
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  // 1. Fetch the list of channels
  useEffect(() => {
    const q = query(collection(db, "channels"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const channelsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setChannels(channelsData);
    });
    return () => unsubscribe(); // Cleanup listener
  }, []);

  // 2. Fetch messages for the *selected* channel
  useEffect(() => {
    if (!selectedChannel) return;

    // Create a query for the subcollection
    const q = query(
      collection(db, 'channels', selectedChannel, 'messages'),
      orderBy('timestamp', 'asc'), // Order by time
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const messagesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(messagesData);
    });

    return () => unsubscribe(); // Cleanup listener on channel change
  }, [selectedChannel]); // Re-run this when the channel changes

  // 3. Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 4. Handle sending a new message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (newMessage.trim() === '') return;

    try {
      await addDoc(collection(db, 'channels', selectedChannel, 'messages'), {
        text: newMessage,
        timestamp: serverTimestamp(),
        userId: currentUser.uid,
        userEmail: currentUser.email
      });
      setNewMessage('');
    } catch (error) {
      console.error("Error sending message: ", error);
    }
  };

  return (
    <Card className="max-w-6xl mx-auto h-[85vh] flex">
      {/* Sidebar for Channels */}
      <div className="w-1/4 border-r pr-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Channels</h2>
          <Button onClick={() => setView('home')} variant="secondary" className="px-3 py-1 text-sm">&larr; Back</Button>
        </div>
        <div className="space-y-2">
          {channels.map(channel => (
            <button
              key={channel.id}
              onClick={() => setSelectedChannel(channel.id)}
              className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-2 ${
                selectedChannel === channel.id 
                  ? 'bg-stone-700 text-white' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Hash className="w-4 h-4" /> {channel.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="w-3/4 flex flex-col pl-6">
        {/* Chat Messages */}
        <div className="flex-grow overflow-y-auto mb-4 space-y-4 pr-4 -mr-4">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.userId === currentUser.uid ? 'justify-end' : ''}`}>
              <div className={`p-3 rounded-lg max-w-lg ${
                msg.userId === currentUser.uid 
                  ? 'bg-stone-700 text-white' 
                  : 'bg-slate-100 text-slate-800'
              }`}>
                <p className="text-xs font-bold opacity-70 mb-1">{msg.userEmail}</p>
                <p>{msg.text}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Form */}
        <form onSubmit={handleSendMessage} className="flex gap-4">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={`Message #${selectedChannel}...`}
            className="flex-grow p-3 border rounded-lg"
          />
          <Button type="submit">
            <Send className="w-5 h-5" />
          </Button>
        </form>
      </div>
    </Card>
  );
};

export default Chat;