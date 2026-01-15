import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { VideoSource } from '../types.ts';

interface VideoPlayerProps {
  source: VideoSource;
}

export interface VideoPlayerRef {
  seekTo: (time: number) => void;
}

export const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(({ source }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useImperativeHandle(ref, () => ({
    seekTo: (timeInSeconds: number) => {
      if (source.type === 'file' && videoRef.current) {
        videoRef.current.currentTime = timeInSeconds;
        videoRef.current.play();
      } else if (source.type === 'youtube' && iframeRef.current) {
        // Send command to YouTube IFrame API
        iframeRef.current.contentWindow?.postMessage(
          JSON.stringify({
            event: 'command',
            func: 'seekTo',
            args: [timeInSeconds, true]
          }), 
          '*'
        );
        iframeRef.current.contentWindow?.postMessage(
          JSON.stringify({
            event: 'command',
            func: 'playVideo',
            args: []
          }), 
          '*'
        );
      }
    }
  }));

  if (source.type === 'youtube') {
    return (
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black shadow-2xl border border-slate-800">
        <iframe
          ref={iframeRef}
          src={`https://www.youtube.com/embed/${source.id}?enablejsapi=1&autoplay=0&rel=0`}
          title="YouTube video player"
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>
    );
  }

  // File handling
  const url = React.useMemo(() => URL.createObjectURL(source.file), [source.file]);

  useEffect(() => {
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [url]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden bg-black shadow-2xl border border-slate-800">
      <video
        ref={videoRef}
        src={url}
        controls
        className="w-full h-auto max-h-[60vh]"
      />
    </div>
  );
});

VideoPlayer.displayName = 'VideoPlayer';