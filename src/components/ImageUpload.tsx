import React, { useState, useRef } from 'react';

interface ImageUploadProps {
  onUpload: (file: File) => void;
  maxFiles?: number;
  acceptedTypes?: string[];
  placeholder?: string;
  disabled?: boolean;
}

export function ImageUpload({
  onUpload,
  maxFiles = 3,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  placeholder = "העלה תמונה",
  disabled = false
}: ImageUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList) => {
    const validFiles = Array.from(files)
      .filter(file => acceptedTypes.includes(file.type))
      .filter(file => file.size <= 5 * 1024 * 1024) // 5MB limit
      .slice(0, maxFiles - uploadedFiles.length);

    if (validFiles.length === 0) return;

    const newPreviews: string[] = [];
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          newPreviews.push(e.target.result as string);
          if (newPreviews.length === validFiles.length) {
            setPreviews(prev => [...prev, ...newPreviews]);
          }
        }
      };
      reader.readAsDataURL(file);
      onUpload(file);
    });

    setUploadedFiles(prev => [...prev, ...validFiles]);
    haptic();
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled || !e.dataTransfer.files) return;
    handleFiles(e.dataTransfer.files);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || !e.target.files) return;
    handleFiles(e.target.files);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
    haptic();
  };

  const triggerFileInput = () => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  return (
    <div style={{ direction: 'rtl' }}>
      {/* Upload Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={triggerFileInput}
        style={{
          border: `2px dashed ${dragActive ? theme.button_color : theme.hint_color}40`,
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center',
          backgroundColor: dragActive ? theme.button_color + '10' : theme.secondary_bg_color,
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          opacity: disabled ? 0.6 : 1
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleInputChange}
          disabled={disabled}
          style={{ display: 'none' }}
        />

        <div style={{ fontSize: '32px', marginBottom: '8px' }}>📷</div>
        <div style={{
          fontSize: '16px',
          color: theme.text_color,
          marginBottom: '4px'
        }}>
          {placeholder}
        </div>
        <div style={{
          fontSize: '12px',
          color: theme.hint_color
        }}>
          גרור קבצים לכאן או לחץ לבחירה
        </div>
        <div style={{
          fontSize: '11px',
          color: theme.hint_color,
          marginTop: '8px'
        }}>
          עד {maxFiles} קבצים, מקסימום 5MB כל אחד
        </div>
      </div>

      {/* File Previews */}
      {previews.length > 0 && (
        <div style={{
          marginTop: '16px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
          gap: '12px'
        }}>
          {previews.map((preview, index) => (
            <div key={index} style={{ position: 'relative' }}>
              <img
                src={preview}
                alt={`תצוגה מקדימה ${index + 1}`}
                style={{
                  width: '100%',
                  height: '120px',
                  objectFit: 'cover',
                  borderRadius: '8px',
                  border: `1px solid ${theme.hint_color}40`
                }}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(index);
                }}
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: '#ff3b30',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
              <div style={{
                fontSize: '11px',
                color: theme.hint_color,
                textAlign: 'center',
                marginTop: '4px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {uploadedFiles[index]?.name}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Progress Info */}
      {uploadedFiles.length > 0 && (
        <div style={{
          marginTop: '12px',
          fontSize: '12px',
          color: theme.hint_color,
          textAlign: 'center'
        }}>
          הועלו {uploadedFiles.length} מתוך {maxFiles} קבצים מקסימום
        </div>
      )}
    </div>
  );
}