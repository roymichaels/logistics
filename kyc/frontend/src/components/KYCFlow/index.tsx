import React, { useEffect, useState } from "react";
import { startKYC, sendFrame, uploadID, verifyKYC } from "../../api/kyc";
import CameraCapture from "./CameraCapture";
import ChallengeGuide from "./ChallengeGuide";
import IDUpload from "./IDUpload";
import ResultScreen from "./ResultScreen";

type Step = "start" | "live" | "id" | "verify" | "done";

export const KYCFlow: React.FC = () => {
  const [step, setStep] = useState<Step>("start");
  const [sessionId, setSessionId] = useState<string>("");
  const [challenges, setChallenges] = useState<string[]>([]);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const resp = await startKYC();
        setSessionId(resp.session_id);
        setChallenges(resp.challenge_sequence);
        setStep("live");
      } catch (err: any) {
        setError(err.message || "Failed to start KYC");
      }
    }
    init();
  }, []);

  const handleFrame = async (frame: string) => {
    if (!sessionId) return;
    await sendFrame(sessionId, frame);
  };

  const handleIDUpload = async (dataUrl: string) => {
    if (!sessionId) return;
    await uploadID(sessionId, dataUrl);
    setStep("verify");
    const verification = await verifyKYC(sessionId);
    setResult(verification);
    setStep("done");
  };

  if (error) return <div style={{ color: "#f87171" }}>{error}</div>;

  return (
    <div style={{ minHeight: "100vh", background: "#0f141a", color: "#e7e9ea", padding: "16px" }}>
      {step === "live" && (
        <>
          <ChallengeGuide challenges={challenges} />
          <CameraCapture onFrame={handleFrame} />
          <button onClick={() => setStep("id")} style={buttonStyle}>הבא / Next</button>
        </>
      )}
      {step === "id" && <IDUpload onUpload={handleIDUpload} />}
      {step === "done" && <ResultScreen result={result} />}
    </div>
  );
};

const buttonStyle: React.CSSProperties = {
  marginTop: 16,
  padding: "12px 16px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "linear-gradient(135deg, #1d9bf0, #00b7ff)",
  color: "#0b1020",
  fontWeight: 700,
  cursor: "pointer",
};

export default KYCFlow;
