import React, { useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Clock, Volume2 } from "lucide-react";

interface CourseVideoPlayerProps {
  videoUrl: string;
  videoTitle: string;
  duration?: string;
  onEnded: () => void;
  onProgress?: (event: any) => void;
  completed?: boolean;
}

const CourseVideoPlayer = ({ 
  videoUrl, 
  videoTitle, 
  duration, 
  onEnded, 
  onProgress,
  completed 
}: CourseVideoPlayerProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Sanitize and validate video URL
  const sanitizeVideoUrl = (url: string): string => {
    try {
      // Remove any potentially dangerous characters
      const sanitized = url.replace(/[<>]/g, '');
      
      // Validate URL format
      const parsedUrl = new URL(sanitized);
      
      // Only allow YouTube domains
      const allowedDomains = [
        'youtube.com',
        'youtu.be',
        'www.youtube.com'
      ];
      
      if (!allowedDomains.some(domain => parsedUrl.hostname.endsWith(domain))) {
        throw new Error('Invalid video domain');
      }
      
      // Ensure it's an embed URL
      if (!sanitized.includes('youtube.com/embed/')) {
        // Convert regular YouTube URL to embed URL
        const videoId = parsedUrl.searchParams.get('v') || 
                       parsedUrl.pathname.split('/').pop() || 
                       '';
        return `https://www.youtube.com/embed/${videoId}`;
      }
      
      return sanitized;
    } catch (e) {
      console.error('Invalid video URL:', e);
      return 'https://www.youtube.com/embed/dQw4w9WgXcQ'; // Fallback video
    }
  };
  
  // Setup message listener for YouTube iframe API events
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Verify origin
      if (!event.origin.includes('youtube.com')) return;
      
      // Handle YouTube iframe API messages
      if (event.data && typeof event.data === 'string') {
        try {
          const data = JSON.parse(event.data);
          if (data.event === 'onStateChange' && data.info === 0) {
            // Video ended (state 0)
            onEnded();
          } else if (data.event === 'onStateChange' && data.info === 1) {
            // Video playing (state 1) - start tracking progress
            startProgressTracking();
          }
        } catch (e) {
          // Not a valid JSON message from YouTube
        }
      }
    };
    
    // Add message listener
    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [onEnded]);
  
  // Track video progress - polling method as a fallback for iframe communication
  const startProgressTracking = () => {
    if (!iframeRef.current || !onProgress) return;
    
    const trackInterval = setInterval(() => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        // Try to send a message to get current time
        try {
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: 'getCurrentTime' }),
            'https://www.youtube.com'
          );
        } catch (e) {
          console.error('Error tracking video progress:', e);
        }
      }
    }, 5000); // Check every 5 seconds
    
    return () => clearInterval(trackInterval);
  };
  
  // Create a YouTube embed URL with API enabled
  const getEnhancedEmbedUrl = (url: string) => {
    const sanitizedUrl = sanitizeVideoUrl(url);
    const separator = sanitizedUrl.includes('?') ? '&' : '?';
    return `${sanitizedUrl}${separator}enablejsapi=1&origin=${window.location.origin}`;
  };
  
  return (
    <div className="mb-6 bg-background/40 rounded-xl overflow-hidden shadow-lg border border-primary/10">
      <div className="relative pt-[56.25%] w-full overflow-hidden">
        <iframe 
          ref={iframeRef}
          className="absolute top-0 left-0 w-full h-full"
          src={getEnhancedEmbedUrl(videoUrl)}
          title={videoTitle}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>
      <div className="p-4 flex justify-between items-center bg-card/80 backdrop-blur-sm border-t">
        <div className="flex-1">
          <h3 className="font-medium text-lg">{videoTitle}</h3>
          <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
            <Clock className="size-3.5" />
            <span>{duration}</span>
            <div className="flex items-center gap-1 mr-4">
              <Volume2 className="size-3.5" />
              <span>100%</span>
            </div>
            {completed && (
              <span className="text-tradervue-green font-medium">✓ הושלם</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="text-xs">
            הורד
          </Button>
          <Button size="sm" className="text-xs">
            שתף
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CourseVideoPlayer;
