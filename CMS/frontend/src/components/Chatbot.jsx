import { useState, useEffect, useRef } from 'react';
import { api } from '../api';

/**
 * Premium System-Aware Chatbot for CMS
 * Provides real-time guidance and system statistics.
 */
export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bodyRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Initial greeting if opening for the first time
      setMessages([{ id: Date.now(), text: "Hello! I'm your CMS Assistant. How can I help you today?", sender: 'bot' }]);
    }
  }, [isOpen, messages.length]);

  const handleSend = async (text) => {
    const msgText = text || input;
    if (!msgText.trim() || isTyping) return;

    const userMsg = { id: Date.now(), text: msgText, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const data = await api('chatbot', {
        method: 'POST',
        body: { message: msgText }
      });

      if (data.ok) {
        setMessages(prev => [...prev, { 
          id: Date.now() + 1, 
          text: data.reply, 
          sender: 'bot', 
          quickReplies: data.quickReplies 
        }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        text: "I'm sorry, I'm having trouble connecting to the system right now. Please try again later.", 
        sender: 'bot' 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="chatbot-wrapper">
      <button 
        type="button" 
        className="chatbot-bubble" 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle Chatbot"
      >
        {isOpen ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        )}
      </button>

      {isOpen && (
        <div className="chatbot-window glass">
          <div className="chatbot-header">
            <h3>CMS Assistant</h3>
            <button type="button" className="chatbot-close" onClick={() => setIsOpen(false)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div className="chatbot-body" ref={bodyRef}>
            {messages.map(m => (
              <div key={m.id} className={`chat-message ${m.sender}`}>
                <div dangerouslySetInnerHTML={{ __html: m.text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br/>') }} />
              </div>
            ))}
            {isTyping && (
              <div className="chat-message bot">
                <div className="typing-indicator" style={{ display: 'flex', gap: '4px' }}>
                   <span style={{ width: '6px', height: '6px', background: '#ccc', borderRadius: '50%' }}></span>
                   <span style={{ width: '6px', height: '6px', background: '#ccc', borderRadius: '50%' }}></span>
                   <span style={{ width: '6px', height: '6px', background: '#ccc', borderRadius: '50%' }}></span>
                </div>
              </div>
            )}
          </div>

          {messages[messages.length - 1]?.quickReplies && !isTyping && (
            <div className="chatbot-quick-replies">
              {messages[messages.length - 1].quickReplies.map(qr => (
                <button key={qr} type="button" className="qr-btn" onClick={() => handleSend(qr)}>
                  {qr}
                </button>
              ))}
            </div>
          )}

          <div className="chatbot-footer">
            <input 
              type="text" 
              className="chatbot-input" 
              placeholder="Ask me anything..." 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <button type="button" className="chatbot-send" onClick={() => handleSend()}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
