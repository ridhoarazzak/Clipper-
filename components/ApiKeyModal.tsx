import React, { useState } from 'react';
import { Key, ExternalLink } from 'lucide-react';

interface ApiKeyModalProps {
  onSubmit: (key: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onSubmit }) => {
  const [key, setKey] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (key.trim()) {
      onSubmit(key.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-8 shadow-2xl">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 bg-red-600/20 text-red-500 rounded-full flex items-center justify-center mb-4">
            <Key size={24} />
          </div>
          <h2 className="text-2xl font-bold text-white">Enter API Key</h2>
          <p className="text-slate-400 mt-2">
            To use ClipGenius AI for free, you need your own Google Gemini API Key.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Paste your API Key here (starts with AIza...)"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
              autoFocus
            />
          </div>
          
          <button
            type="submit"
            disabled={!key}
            className="w-full bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-500 hover:to-purple-500 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Creating
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-800 text-center">
          <a 
            href="https://aistudio.google.com/app/apikey" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            Get a free API Key from Google AI Studio <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  );
};
