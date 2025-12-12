import React, { useEffect, useRef } from "react";
import { useCamera } from "../../hooks/useCamera";

interface Props {
  onFrame: (dataUrl: string) => void;
}

const CameraCapture: React.FC<Props> = ({ onFrame }) => {
  const { videoRef, error } = useCamera();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      onFrame(dataUrl);
    }, 1500);
    return () => clearInterval(interval);
  }, [onFrame]);

  if (error) return <div style={{ color: "#f87171" }}>{error}</div>;

  return (
    <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
      <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", background: "#000" }} />
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
};

export default CameraCapture;
