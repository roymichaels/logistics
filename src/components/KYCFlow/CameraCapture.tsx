import React from 'react';

type Props = {
  onFrame?: (dataUrl: string) => void;
  intervalMs?: number;
  active?: boolean;
};

/**
 * Lightweight webcam component that captures frames and streams them to the parent.
 * Uses getUserMedia directly to avoid external dependencies.
 */
const CameraCapture: React.FC<Props> = ({ onFrame, intervalMs = 1200, active = true }) => {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const timerRef = React.useRef<number | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  React.useEffect(() => {
    const cleanup = () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };

    if (!active) {
      cleanup();
      return;
    }

    const start = async () => {
      try {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
        if (videoRef.current) {
          videoRef.current.srcObject = streamRef.current;
          try {
            await videoRef.current.play();
          } catch (playErr: any) {
            if (playErr?.name !== 'AbortError') {
              console.warn('Camera play interrupted', playErr);
            }
          }
        }
        scheduleCapture();
      } catch (err) {
        console.error('Failed to start camera', err);
      }
    };

    const scheduleCapture = () => {
      if (!onFrame) return;
      timerRef.current = window.setInterval(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) return;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        onFrame(dataUrl);
      }, intervalMs);
    };

    start();
    return cleanup;
  }, [intervalMs, onFrame, active]);

  return (
    <div style={container}>
      <video ref={videoRef} style={videoStyles} playsInline muted />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};

const container: React.CSSProperties = {
  width: '100%',
  maxWidth: 420,
  borderRadius: 16,
  overflow: 'hidden',
  border: '1px solid rgba(255,255,255,0.1)',
  boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
  background: '#0b1623',
};

const videoStyles: React.CSSProperties = {
  width: '100%',
  display: 'block',
  transform: 'scaleX(-1)', // mirror for selfie view
};

export default CameraCapture;
