import React, { useState, useRef, useEffect } from 'react';
import { PaperPlaneRight, Robot, User, Sparkle } from '@phosphor-icons/react';
import api from '../services/api';

interface Message {
    role: 'user' | 'model';
    content: string;
}

export const ChatAssistant: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([
        { role: 'model', content: "Hi! I'm your AI Career Assistant. I can help you with resume tips, interview prep, or organizing your career journey. How can I help today?" }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = { role: 'user' as const, content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // Prepare history for API (excluding the very last user message we just added locally)
            // actually API expects history including previous turn, let's just send what we have.
            // The backend endpoint takes { message, history }
            // So we send current input as 'message', and 'messages' state as history.

            const history = messages.map(m => ({ role: m.role, content: m.content }));

            const response = await api.post('/chat', {
                message: userMessage.content,
                history: history
            });

            const aiMessage = { role: 'model' as const, content: response.data.response };
            setMessages(prev => [...prev, aiMessage]);

        } catch (error) {
            console.error("Chat failed:", error);
            setMessages(prev => [...prev, { role: 'model', content: "Sorry, I'm having trouble connecting right now. Please try again later." }]);
        } finally {
            setIsLoading(false);
        }
    };

    // Simple helper to parse [text](url) links
    const renderContent = (text: string) => {
        const parts = text.split(/(\[.*?\]\(.*?\))/g);
        return parts.map((part, i) => {
            const match = part.match(/^\[(.*?)\]\((.*?)\)$/);
            if (match) {
                return (
                    <a
                        key={i}
                        href={match[2]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline font-medium"
                    >
                        {match[1]}
                    </a>
                );
            }
            return part;
        });
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-[#020c07] rounded-xl shadow-sm border border-gray-200 dark:border-emerald-500/10 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 dark:border-emerald-500/10 flex items-center gap-3 bg-gray-50/50 dark:bg-emerald-900/10">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-400 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                    <Robot size={24} weight="fill" />
                </div>
                <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">AI Assistant</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <Sparkle size={12} className="text-emerald-500" weight="fill" />
                        Powered by Gemini 1.5
                    </p>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f8fafc] dark:bg-[#020c07]">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'}`}>
                            {msg.role === 'user' ? <User size={16} weight="bold" /> : <Robot size={16} weight="bold" />}
                        </div>
                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.role === 'user'
                                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-tr-none'
                                : 'bg-white dark:bg-emerald-950/40 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-emerald-500/10 rounded-tl-none'
                            }`}>
                            <div className="whitespace-pre-wrap">{renderContent(msg.content)}</div>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <Robot size={16} weight="bold" />
                        </div>
                        <div className="bg-white dark:bg-emerald-950/40 p-3 rounded-2xl rounded-tl-none border border-gray-100 dark:border-emerald-500/10">
                            <div className="flex gap-1">
                                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-4 bg-white dark:bg-[#020c07] border-t border-gray-100 dark:border-emerald-500/10">
                <div className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about resume tips, interview prep..."
                        className="w-full pl-4 pr-12 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:text-white placeholder-gray-400"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="absolute right-2 top-2 p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <PaperPlaneRight size={20} weight="fill" />
                    </button>
                </div>
            </form>
        </div>
    );
};
