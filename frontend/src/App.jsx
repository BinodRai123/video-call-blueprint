import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

export default function App() {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const [roomId] = useState("room123");
  const [stream, setStream] = useState(null);

  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);

  useEffect(() => {
    async function init() {
      // Optimized constraints: 1280x720 @ 30fps
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {frameRate: 30 },
        audio: {'echoCancellation': true}
      });

      setStream(mediaStream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = mediaStream;
      }

      pcRef.current = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" } // public STUN server
        ]
      });

      mediaStream.getTracks().forEach(track =>
        pcRef.current.addTrack(track, mediaStream)
      );

      pcRef.current.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      pcRef.current.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("ice-candidate", { candidate: event.candidate, room: roomId });
        }
      };

      // Auto create offer when negotiation is needed
      pcRef.current.onnegotiationneeded = async () => {
        try {
          const offer = await pcRef.current.createOffer();
          await pcRef.current.setLocalDescription(offer);
          socket.emit("offer", { sdp: offer, room: roomId });
        } catch (err) {
          console.error("Negotiation error:", err);
        }
      };

      socket.emit("join-room", roomId);

      socket.on("offer", async (data) => {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
        const answer = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answer);
        socket.emit("answer", { sdp: answer, room: roomId });
      });

      socket.on("answer", async (data) => {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
      });

      socket.on("ice-candidate", async (candidate) => {
        try {
          await pcRef.current.addIceCandidate(candidate);
        } catch (err) {
          console.error("Error adding ICE candidate", err);
        }
      });
    }

    init();
  }, [roomId]);

  const toggleAudio = () => {
    if (!stream) return;
    stream.getAudioTracks()[0].enabled = !audioEnabled;
    setAudioEnabled(!audioEnabled);
  };

  const toggleVideo = () => {
    if (!stream) return;
    stream.getVideoTracks()[0].enabled = !videoEnabled;
    setVideoEnabled(!videoEnabled);
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
      <div className="flex gap-4">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-64 h-48 bg-black rounded-lg"
        />
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-64 h-48 bg-black rounded-lg"
        />
      </div>

      <div className="mt-6 flex gap-4">
        <button
          onClick={toggleAudio}
          className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          {audioEnabled ? "Mute" : "Unmute"}
        </button>

        <button
          onClick={toggleVideo}
          className="px-4 py-2 bg-green-600 rounded-lg hover:bg-green-700"
        >
          {videoEnabled ? "Disable Video" : "Enable Video"}
        </button>
      </div>
    </div>
  );
}
