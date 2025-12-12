import React from 'react';

type Props = {
  onUpload: (dataUrl: string) => void;
};

const IDUpload: React.FC<Props> = ({ onUpload }) => {
  const [preview, setPreview] = React.useState<string | null>(null);

  const handleFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPreview(dataUrl);
      onUpload(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={wrapper}>
      <label style={dropzone}>
        <input
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <span>העלה תמונת תעודה / Upload ID</span>
      </label>
      {preview && (
        <div style={previewBox}>
          <img src={preview} alt="ID preview" style={{ width: '100%', borderRadius: 12 }} />
        </div>
      )}
    </div>
  );
};

const wrapper: React.CSSProperties = { width: '100%', maxWidth: 420 };
const dropzone: React.CSSProperties = {
  display: 'block',
  padding: '14px 16px',
  borderRadius: 12,
  border: '1px dashed rgba(255,255,255,0.2)',
  background: 'rgba(13,20,28,0.6)',
  color: '#e7e9ea',
  cursor: 'pointer',
  textAlign: 'center',
  fontWeight: 600,
};
const previewBox: React.CSSProperties = {
  marginTop: 12,
  borderRadius: 12,
  overflow: 'hidden',
  border: '1px solid rgba(255,255,255,0.08)',
};

export default IDUpload;
