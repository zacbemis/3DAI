import React, { useState, useEffect, useRef } from 'react';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
}

const ChatArea: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Hello! I'm your 3DAI assistant. How can I help you today?",
      sender: 'bot',
    },
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg: Message = { id: Date.now(), text: input, sender: 'user' };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    setTimeout(() => {
      const botMsg: Message = {
        id: Date.now() + 1,
        text: "I'm processing that request for you...",
        sender: 'bot',
      };
      setMessages((prev) => [...prev, botMsg]);
    }, 1000);
  };

  return (
    <div className="flex h-screen w-full flex-col bg-[#0f0f12] font-sans">
      <div
        ref={scrollRef}
        className="flex flex-1 flex-col gap-4 overflow-y-auto p-8"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-[18px] px-[18px] py-3 text-[0.95rem] leading-relaxed ${
                msg.sender === 'user'
                  ? 'rounded-br-sm bg-indigo-600 text-white'
                  : 'rounded-bl-sm bg-zinc-800 text-zinc-200'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-4 border-t border-zinc-800 bg-zinc-900 px-8 py-6">
        <input
          type="text"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white outline-none transition-colors placeholder:text-zinc-500 focus:border-indigo-600"
        />
        <button
          type="button"
          onClick={handleSend}
          className="rounded-[10px] border-0 bg-indigo-600 px-5 font-semibold text-white transition-opacity hover:opacity-90"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatArea;
