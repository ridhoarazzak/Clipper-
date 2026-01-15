import React from 'react';
import { VideoAnalysis, SuggestedClip } from '../types.ts';
import { Play, Hash, Award, TrendingUp, Scissors } from 'lucide-react';

interface DashboardProps {
  analysis: VideoAnalysis;
  onSeek: (time: string) => void;
}

export const AnalysisDashboard: React.FC<DashboardProps> = ({ analysis, onSeek }) => {
  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <h1 className="text-2xl font-bold text-white">{analysis.videoTitle}</h1>
          <span className="px-3 py-1 bg-purple-500/20 text-purple-400 text-xs font-bold rounded-full uppercase tracking-wider w-fit">
            {analysis.category}
          </span>
        </div>
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">Video Description</h3>
        <p className="text-slate-300 leading-relaxed">{analysis.summary}</p>
      </div>

      {/* Clips Grid */}
      <h2 className="text-xl font-bold flex items-center gap-2 mt-8 mb-4">
        <TrendingUp className="text-red-500" /> 10 Key Highlights
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
        {analysis.suggestedClips.map((clip, index) => (
          <div 
            key={index}
            className="bg-slate-800 p-5 rounded-xl border border-slate-700 hover:border-red-500/50 transition-all hover:shadow-lg group"
          >
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-semibold text-lg text-white group-hover:text-red-400 transition-colors">
                {index + 1}. {clip.title}
              </h3>
              <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded text-xs text-yellow-500 font-mono">
                <Award size={12} /> {clip.viralScore}/10
              </div>
            </div>
            
            <p className="text-sm text-slate-400 mb-4">{clip.description}</p>
            
            {/* Timestamps & Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-slate-300 font-mono bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-700">
                <Scissors size={14} className="text-slate-500" />
                <span className="text-red-400">{clip.startTime}</span> 
                <span className="text-slate-600">-</span> 
                <span className="text-red-400">{clip.endTime}</span>
              </div>
              
              <button 
                onClick={() => onSeek(clip.startTime)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Play size={16} fill="currentColor" /> Preview Clip
              </button>
            </div>

            {/* Hashtags */}
            <div className="flex flex-wrap gap-2 mt-4">
              {clip.hashtags.map((tag, i) => (
                <span key={i} className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer flex items-center">
                  <Hash size={10} className="mr-0.5" />{tag.replace('#', '')}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};