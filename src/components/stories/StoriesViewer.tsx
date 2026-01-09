import React, { useState, useEffect, useRef } from 'react';
import { Story, storiesService } from '../../services/stories';
import { logger } from '../../lib/logger';
import { X, ChevronLeft, ChevronRight, Heart, Send, MoreVertical } from 'lucide-react';

interface StoriesViewerProps {
  userId: string;
  stories: Story[];
  onClose: () => void;
  initialIndex?: number;
}

export function StoriesViewer({ userId, stories, onClose, initialIndex = 0 }: StoriesViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [viewStartTime, setViewStartTime] = useState(Date.now());
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const currentStory = stories[currentIndex];
  const duration = currentStory?.duration_seconds || 5;

  useEffect(() => {
    if (!currentStory) return;

    storiesService.viewStory(currentStory.id);
    setViewStartTime(Date.now());
    setProgress(0);

    return () => {
      const viewDuration = Math.floor((Date.now() - viewStartTime) / 1000);
      storiesService.viewStory(currentStory.id, viewDuration);
    };
  }, [currentIndex, currentStory]);

  useEffect(() => {
    if (isPaused) {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
      return;
    }

    progressTimerRef.current = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + (100 / (duration * 10));
        if (newProgress >= 100) {
          goToNext();
          return 0;
        }
        return newProgress;
      });
    }, 100);

    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    };
  }, [isPaused, duration, currentIndex]);

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      onClose();
    }
  };

  const goToNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onClose();
    }
  };

  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, currentTarget } = e;
    const { left, width } = currentTarget.getBoundingClientRect();
    const tapPosition = clientX - left;

    if (tapPosition < width / 3) {
      goToPrevious();
    } else if (tapPosition > (2 * width) / 3) {
      goToNext();
    } else {
      setIsPaused(!isPaused);
    }
  };

  if (!currentStory) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#000',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={handleTap}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: 'rgba(0, 0, 0, 0.5)',
          border: 'none',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 10,
        }}
      >
        <X color="white" size={24} />
      </button>

      {currentIndex > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            goToPrevious();
          }}
          style={{
            position: 'absolute',
            left: '20px',
            background: 'rgba(0, 0, 0, 0.5)',
            border: 'none',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10,
          }}
        >
          <ChevronLeft color="white" size={24} />
        </button>
      )}

      {currentIndex < stories.length - 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            goToNext();
          }}
          style={{
            position: 'absolute',
            right: '20px',
            background: 'rgba(0, 0, 0, 0.5)',
            border: 'none',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10,
          }}
        >
          <ChevronRight color="white" size={24} />
        </button>
      )}

      <div
        style={{
          width: '100%',
          maxWidth: '500px',
          height: '100%',
          maxHeight: '90vh',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            right: '10px',
            display: 'flex',
            gap: '4px',
            zIndex: 10,
          }}
        >
          {stories.map((_, index) => (
            <div
              key={index}
              style={{
                flex: 1,
                height: '3px',
                backgroundColor: 'rgba(255, 255, 255, 0.3)',
                borderRadius: '2px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: index === currentIndex ? `${progress}%` : index < currentIndex ? '100%' : '0%',
                  height: '100%',
                  backgroundColor: 'white',
                  transition: index === currentIndex ? 'none' : 'width 0.3s ease',
                }}
              />
            </div>
          ))}
        </div>

        <div
          style={{
            position: 'absolute',
            top: '30px',
            left: '10px',
            right: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            zIndex: 10,
            padding: '10px',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: '2px solid white',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#666',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
              }}
            >
              {userId[0].toUpperCase()}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>
              @{userId}
            </div>
            <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '12px' }}>
              {Math.floor((Date.now() - new Date(currentStory.created_at).getTime()) / 3600000)}h ago
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <MoreVertical color="white" size={20} />
          </button>
        </div>

        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {currentStory.story_type === 'photo' && currentStory.media_url && (
            <img
              src={currentStory.media_url}
              alt="Story"
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
              }}
            />
          )}
          {currentStory.story_type === 'video' && currentStory.media_url && (
            <video
              src={currentStory.media_url}
              autoPlay
              muted
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
              }}
            />
          )}
          {currentStory.story_type === 'text' && (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: currentStory.background_color || '#333',
                padding: '40px',
              }}
            >
              <div
                style={{
                  color: 'white',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  textAlign: 'center',
                }}
              >
                {currentStory.text_content}
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '10px',
            right: '10px',
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            zIndex: 10,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="text"
            placeholder="Send message"
            style={{
              flex: 1,
              padding: '12px',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '24px',
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              color: 'white',
              outline: 'none',
            }}
          />
          <button
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Heart color="white" size={24} />
          </button>
          <button
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Send color="white" size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}
