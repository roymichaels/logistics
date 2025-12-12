import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Step1_Liveness from './Step1_Liveness';
import Step2_IDUpload from './Step2_IDUpload';
import Step3_SocialMedia from './Step3_SocialMedia';
import ReviewPending from './ReviewPending';
import AppViewport from '../../layouts/AppViewport';

export default function KYCFlow() {
  return (
    <AppViewport>
      <div className="container">
        <Routes>
          <Route path="/" element={<Navigate to="start" replace />} />
          <Route path="start" element={<Step1_Liveness />} />
          <Route path="liveness" element={<Step1_Liveness />} />
          <Route path="id-upload" element={<Step2_IDUpload />} />
          <Route path="social" element={<Step3_SocialMedia />} />
          <Route path="review" element={<ReviewPending />} />
        </Routes>
      </div>
    </AppViewport>
  );
}
