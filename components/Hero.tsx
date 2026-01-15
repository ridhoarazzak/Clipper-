import React, { useState } from 'react';
import { Upload, Youtube, Link as LinkIcon } from 'lucide-react';

interface HeroProps {
  onFileSelect: (file: File) => void;
  onYoutubeSubmit: (url: string) => void;
}

export const Hero: React.FC<HeroProps> = ({ onFileSelect, onYoutubeSubmit }) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'youtube'>('upload');
  const [youtubeUrl, setYoutubeUrl] = useState('');

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (activeTab === 'upload' && e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('video/')) {
        onFileSelect(file);
      } else {
        alert("Please upload a video file.");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (youtubeUrl.trim()) {
      onYoutubeSubmit(youtubeUrl);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
      <div className="mb-8 relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-purple-600 rounded-lg blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative px-7 py-4 bg-slate-900 ring-1 ring-slate-800 rounded-lg leading-none flex items-top justify-start space-x-6">
          <span className="text-3xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-purple-500">
            ClipGenius AI
          </span>
        </div>
      </div>
      
      <p className="text-slate-400 text-lg md:text-xl max-w-2xl mb-12">
        Transform videos into viral social media clips in seconds. 
        Powered by Google Gemini 2.5 Flash.
      </p>

      {/* Tabs */}
      <div className="flex space-x-4 mb-6 bg-slate-800/50 p-1 rounded-full border border-slate-700">
        <button
          onClick={() => setActiveTab('upload')}
          className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
            activeTab === 'upload' 
              ? 'bg-slate-700 text-white shadow-lg' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <Upload size={16} /> Upload Video
          </div>
        </button>
        <button
          onClick={() => setActiveTab('youtube')}
          className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
            activeTab === 'youtube' 
              ? 'bg-red-600 text-white shadow-lg' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <Youtube size={16} /> YouTube Link
          </div>
        </button>
      </div>

      {activeTab === 'upload' ? (
        <div 
          className="w-full max-w-xl p-8 border-2 border-dashed border-slate-700 rounded-2xl hover:border-red-500 transition-colors cursor-pointer bg-slate-800/50 backdrop-blur-sm"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-upload')?.click()}
        >
          <div className="flex flex-col items-center">
            <div className="p-4 bg-slate-800 rounded-full mb-4 text-red-500">
              <Upload size={32} />
            </div>
            <h3 className="text-xl font-semibold mb-2">Drop your video here</h3>
            <p className="text-slate-400 text-sm mb-4">MP4, WebM, MOV (Max 50MB for demo)</p>
            <button className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full font-medium transition-all">
              Browse Files
            </button>
            <input 
              type="file" 
              id="file-upload" 
              className="hidden" 
              accept="video/*" 
              onChange={handleFileChange}
            />
          </div>
        </div>
      ) : (
        <div className="w-full max-w-xl p-8 border border-slate-700 rounded-2xl bg-slate-800/50 backdrop-blur-sm">
          <div className="flex flex-col items-center">
            <div className="p-4 bg-slate-800 rounded-full mb-4 text-red-500">
              <LinkIcon size={32} />
            </div>
            <h3 className="text-xl font-semibold mb-6">Paste YouTube URL</h3>
            <form onSubmit={handleUrlSubmit} className="w-full flex gap-2">
              <input 
                type="text" 
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..." 
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
              />
              <button 
                type="submit"
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all"
              >
                Analyze
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};