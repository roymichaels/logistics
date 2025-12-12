import axios from "axios";

const api = axios.create({
  baseURL: "/kyc", // adjust when integrating
});

export const startKYC = () => api.post("/start").then((r) => r.data);
export const sendFrame = (session_id: string, frame_base64: string) =>
  api.post("/frame", { session_id, frame_base64 }).then((r) => r.data);
export const uploadID = (session_id: string, id_front_base64: string) =>
  api.post("/id-upload", { session_id, id_front_base64 }).then((r) => r.data);
export const verifyKYC = (session_id: string) =>
  api.post("/verify", { session_id }).then((r) => r.data);
export const getStatus = (user_id: string) =>
  api.get(`/status/${user_id}`).then((r) => r.data);
