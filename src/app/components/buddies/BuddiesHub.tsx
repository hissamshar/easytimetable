'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Badge } from '../ui/Badge';

type Connection = {
  connection_id: number;
  buddy_id: number;
  buddy_name: string;
  buddy_roll: string;
  status: string;
  requester_id: number;
};

type Message = {
  message_id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  message_type: string;
  created_at: string;
};

export default function BuddiesHub({ connections, currentUserId }: { connections: Connection[], currentUserId: number }) {
  const [selectedBuddy, setSelectedBuddy] = useState<Connection | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteRollNumber, setInviteRollNumber] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteRollNumber.trim()) return;
    setInviteLoading(true);
    try {
      const res = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roll_number: inviteRollNumber })
      });
      if (res.ok) {
        setIsInviteModalOpen(false);
        setInviteRollNumber('');
        window.location.reload();
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Failed to send invite');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred');
    }
    setInviteLoading(false);
  }

  async function respondToInvite(status: 'accepted' | 'declined') {
    if (!selectedBuddy) return;
    try {
      const res = await fetch('/api/connections', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connection_id: selectedBuddy.connection_id, status })
      });
      if (res.ok) {
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Fetch messages when buddy changes
  useEffect(() => {
    if (!selectedBuddy) return;
    
    let isMounted = true;
    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/messages?buddy_id=${selectedBuddy.buddy_id}`);
        const data = await res.json();
        if (res.ok && isMounted) {
          setMessages(data.messages || []);
        }
      } catch (err) {
        console.error(err);
      }
    };
    
    fetchMessages();
    
    // Simple polling for now
    const interval = setInterval(fetchMessages, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedBuddy]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e?: React.FormEvent, type: string = 'text', content: string = newMessage) => {
    e?.preventDefault();
    if (!content.trim() || !selectedBuddy) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiver_id: selectedBuddy.buddy_id,
          content: content.trim(),
          message_type: type
        })
      });
      
      if (res.ok) {
        const { message } = await res.json();
        setMessages(prev => [...prev, message]);
        if (type === 'text') setNewMessage('');
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="flex w-full h-full">
      {/* Sidebar */}
      <div className="w-1/3 min-w-[250px] border-r border-border bg-bg-slate flex flex-col h-full overflow-y-auto">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h2 className="text-[14px] font-bold text-text-dark">Your Buddies</h2>
          <button 
            onClick={() => setIsInviteModalOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-indigo/10 text-indigo hover:bg-indigo/20 transition-colors"
            title="Add Buddy"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
          </button>
        </div>
        <div className="flex-1">
          {connections.length === 0 ? (
            <div className="p-4 text-[13px] text-text-muted text-center">
              You haven't added any study buddies yet. Go to Analytics to send invites!
            </div>
          ) : (
            connections.map(conn => (
              <button
                key={conn.buddy_id}
                onClick={() => setSelectedBuddy(conn)}
                className={`w-full p-4 flex items-center gap-3 text-left transition-colors border-b border-border/50
                  ${selectedBuddy?.buddy_id === conn.buddy_id ? 'bg-primary/10' : 'hover:bg-bg-white'}`}
              >
                <div className="w-10 h-10 rounded-full bg-indigo/20 flex items-center justify-center text-indigo font-bold shrink-0">
                  {conn.buddy_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-bold text-text-dark truncate">{conn.buddy_name}</p>
                  <p className="text-[11px] text-text-muted truncate">
                    {conn.status === 'pending' ? <span className="text-orange font-semibold">Pending</span> : conn.buddy_roll}
                  </p>
                </div>
                {conn.status === 'accepted' && (
                  <div className="w-2.5 h-2.5 rounded-full bg-text-subdued" title="Offline" />
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col h-full bg-bg-white relative">
        {selectedBuddy ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-border flex justify-between items-center bg-bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo/20 flex items-center justify-center text-indigo font-bold">
                  {selectedBuddy.buddy_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-text-dark">{selectedBuddy.buddy_name}</h3>
                  <p className="text-[11px] text-text-muted">
                    {selectedBuddy.status === 'pending' ? 'Invitation Pending' : 'Chatting & Collaborating'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => alert("Find Free Time coming in Phase 3!")}
                  className="px-3 py-1.5 bg-indigo/10 text-indigo rounded-lg text-[12px] font-semibold hover:bg-indigo/20 transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                  Find Free Time
                </button>
              </div>
            </div>

            {selectedBuddy.status === 'pending' ? (
              <div className="flex-1 flex flex-col items-center justify-center p-4">
                <div className="bg-bg-slate p-6 rounded-2xl max-w-sm text-center border border-border">
                  <span className="material-symbols-outlined text-[48px] text-orange mb-3">hourglass_empty</span>
                  <h3 className="text-[16px] font-bold text-text-dark mb-2">Invitation Pending</h3>
                  {selectedBuddy.requester_id === currentUserId ? (
                    <p className="text-[13px] text-text-muted">
                      You have invited {selectedBuddy.buddy_name} to be your study buddy. Waiting for them to accept.
                    </p>
                  ) : (
                    <>
                      <p className="text-[13px] text-text-muted mb-6">
                        {selectedBuddy.buddy_name} ({selectedBuddy.buddy_roll}) wants to be your study buddy!
                      </p>
                      <div className="flex gap-3 justify-center">
                        <button 
                          onClick={() => respondToInvite('declined')}
                          className="px-4 py-2 bg-white border border-border text-text-dark rounded-xl text-[13px] font-bold hover:bg-gray-50"
                        >
                          Decline
                        </button>
                        <button 
                          onClick={() => respondToInvite('accepted')}
                          className="px-4 py-2 bg-primary text-white rounded-xl text-[13px] font-bold hover:bg-primary/90"
                        >
                          Accept Invite
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-text-muted">
                      <span className="material-symbols-outlined text-[48px] text-text-subdued mb-2">waving_hand</span>
                      <p className="text-[14px]">No messages yet. Say hi to {selectedBuddy.buddy_name}!</p>
                    </div>
                  ) : (
                    messages.map(msg => {
                      const isMine = msg.sender_id === currentUserId;
                      const isNudge = msg.message_type === 'nudge';
                      
                      return (
                        <div key={msg.message_id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                          <div 
                            className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                              isNudge 
                                ? 'bg-transparent text-[40px] p-0' 
                                : isMine 
                                  ? 'bg-primary text-white rounded-tr-none' 
                                  : 'bg-bg-slate text-text-dark rounded-tl-none border border-border'
                            }`}
                          >
                            {msg.content}
                          </div>
                          <span className="text-[10px] text-text-muted mt-1 px-1">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-border bg-bg-slate">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-[11px] font-semibold text-text-muted uppercase px-1">Send a Nudge</p>
                    <button onClick={() => sendMessage(undefined, 'nudge', '🔥')} className="text-[20px] hover:scale-125 transition-transform" title="Fire">🔥</button>
                    <button onClick={() => sendMessage(undefined, 'nudge', '☕')} className="text-[20px] hover:scale-125 transition-transform" title="Coffee">☕</button>
                    <button onClick={() => sendMessage(undefined, 'nudge', '💪')} className="text-[20px] hover:scale-125 transition-transform" title="Strength">💪</button>
                  </div>
                  <form onSubmit={e => sendMessage(e, 'text')} className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 bg-bg-white border border-border rounded-xl px-4 py-2.5 text-[14px] text-text-primary focus:outline-none focus:border-primary"
                    />
                    <button
                      type="submit"
                      disabled={loading || !newMessage.trim()}
                      className="bg-primary text-white w-11 h-11 rounded-xl flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[20px]">send</span>
                    </button>
                  </form>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-text-muted">
            <span className="material-symbols-outlined text-[64px] text-text-subdued mb-4">forum</span>
            <p className="text-[15px] font-medium text-text-dark">Select a buddy to start chatting</p>
            <p className="text-[13px] max-w-sm text-center mt-2">
              You can send text messages, quickly ping them with nudges, and soon, sync your schedules!
            </p>
          </div>
        )}
      </div>

      {isInviteModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setIsInviteModalOpen(false)}>
          <div className="bg-bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[18px] font-bold font-heading text-text-dark">Find Study Buddy</h2>
              <button onClick={() => setIsInviteModalOpen(false)} className="text-text-muted hover:text-text-dark">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-text-dark mb-1">Friend's Roll Number</label>
                <input 
                  type="text" 
                  required
                  value={inviteRollNumber}
                  onChange={e => setInviteRollNumber(e.target.value)}
                  className="w-full bg-bg-slate border border-border rounded-xl px-4 py-2 text-[14px] text-text-primary focus:outline-none focus:border-primary"
                  placeholder="e.g., 21L-1234"
                />
              </div>
              <button 
                type="submit" 
                disabled={inviteLoading}
                className="w-full bg-indigo text-white rounded-xl py-2.5 font-semibold text-[14px] hover:bg-indigo/90 transition-colors disabled:opacity-50"
              >
                {inviteLoading ? 'Sending Request...' : 'Send Request'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
