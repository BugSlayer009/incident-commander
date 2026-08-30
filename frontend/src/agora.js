import AgoraRTC from "agora-rtc-sdk-ng";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

export async function joinChannel(channelName, uid) {
  const res = await axios.post(`${API_URL}/api/agora/token`, { channelName, uid });
  const { token, appId } = res.data;

  await client.join(appId, channelName, token, uid);

  const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
  await client.publish([audioTrack]);

  return audioTrack;
}

export async function leaveChannel(audioTrack) {
  if (audioTrack) {
    audioTrack.stop();
    audioTrack.close();
  }
  await client.leave();
}