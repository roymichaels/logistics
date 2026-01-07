import React, { useRef, useState } from 'react';
import { tokens } from '../../styles/tokens';
import { Button } from '../atoms/Button';
import { logger } from '../../lib/logger';
import { supabase } from '../../lib/supabase';

interface PhotoCaptureProps {
  onPhotoCapture: (photoUrl: string) => void;
  onCancel: () => void;
  title?: string;
  subtitle?: string;
  orderId?: string;
}

export function PhotoCapture({
  onPhotoCapture,
  onCancel,
  title = 'Take Photo',
  subtitle = 'Proof of delivery',
  orderId,
}: PhotoCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStream(mediaStream);
      setError(null);
    } catch (err) {
      logger.error('[PhotoCapture] Failed to start camera:', err);
      setError('Unable to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);

      const timestamp = new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(10, canvas.height - 60, 300, 50);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText(timestamp, 20, canvas.height - 35);
      ctx.fillText(`Order: ${orderId || 'N/A'}`, 20, canvas.height - 15);

      const imageData = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedImage(imageData);
      stopCamera();
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  const uploadPhoto = async () => {
    if (!capturedImage) return;

    try {
      setUploading(true);
      setError(null);

      const blob = await fetch(capturedImage).then((res) => res.blob());
      const fileName = `proof-${orderId || Date.now()}-${Date.now()}.jpg`;
      const filePath = `delivery-proofs/${fileName}`;

      const { data, error: uploadError } = await supabase.storage
        .from('delivery-photos')
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
        });

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('delivery-photos').getPublicUrl(filePath);

      logger.info('[PhotoCapture] Photo uploaded successfully:', publicUrl);
      onPhotoCapture(publicUrl);
    } catch (err) {
      logger.error('[PhotoCapture] Upload failed:', err);
      setError('Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCapturedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  React.useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.95)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          padding: '20px',
          background: 'rgba(0, 0, 0, 0.8)',
          color: '#fff',
          textAlign: 'center',
        }}
      >
        <h2 style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: '700' }}>{title}</h2>
        <p style={{ margin: 0, fontSize: '14px', opacity: 0.8 }}>{subtitle}</p>
      </div>

      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {!capturedImage ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </>
        ) : (
          <img
            src={capturedImage}
            alt="Captured"
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
            }}
          />
        )}

        {error && (
          <div
            style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              right: '20px',
              padding: '16px',
              background: '#ef4444',
              color: '#fff',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            {error}
          </div>
        )}
      </div>

      <div
        style={{
          padding: '24px',
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {!capturedImage ? (
          <>
            <Button
              onClick={capturePhoto}
              variant="primary"
              size="large"
              style={{
                width: '100%',
                height: '64px',
                fontSize: '18px',
                fontWeight: '700',
                background: tokens.gradients.primary,
                border: 'none',
                borderRadius: '16px',
              }}
            >
              📸 Capture Photo
            </Button>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  flex: 1,
                  padding: '16px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                📁 Choose from Gallery
              </button>
              <button
                onClick={onCancel}
                style={{
                  flex: 1,
                  padding: '16px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </>
        ) : (
          <>
            <Button
              onClick={uploadPhoto}
              disabled={uploading}
              variant="primary"
              size="large"
              style={{
                width: '100%',
                height: '64px',
                fontSize: '18px',
                fontWeight: '700',
                background: uploading
                  ? 'rgba(255, 255, 255, 0.2)'
                  : 'linear-gradient(135deg, #10b981, #059669)',
                border: 'none',
                borderRadius: '16px',
              }}
            >
              {uploading ? '⏳ Uploading...' : '✅ Confirm & Upload'}
            </Button>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={retakePhoto}
                disabled={uploading}
                style={{
                  flex: 1,
                  padding: '16px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  opacity: uploading ? 0.5 : 1,
                }}
              >
                🔄 Retake
              </button>
              <button
                onClick={onCancel}
                disabled={uploading}
                style={{
                  flex: 1,
                  padding: '16px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  opacity: uploading ? 0.5 : 1,
                }}
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
