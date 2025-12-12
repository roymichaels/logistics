import React, { useRef, useState } from "react";

interface Props {
  onUpload: (dataUrl: string) => Promise<void>;
}

const IDUpload: React.FC<Props> = ({ onUpload }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setPreview(dataUrl);
      setLoading(true);
      await onUpload(dataUrl);
      setLoading(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ border: "1px dashed rgba(255,255,255,0.2)", borderRadius: 16, padding: 16 }}>
      <p>העלה את תעודת הזהות / Upload ID front</p>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} />
      {preview && <img src={preview} alt="ID preview" style={{ width: "100%", marginTop: 12, borderRadius: 12 }} />}
      {loading && <p>מעלה... / Uploading...</p>}
    </div>
  );
};

export default IDUpload;
