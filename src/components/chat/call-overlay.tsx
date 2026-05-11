"use client";

import { useState, useEffect } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  MoreHorizontal,
  X,
} from "lucide-react";

type CallStatus = "ringing" | "connected" | "ended";

interface CallParticipant {
  id: string;
  name: string;
  image?: string | null;
  isMuted?: boolean;
  isVideoOff?: boolean;
}

interface CallOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  callType: "audio" | "video";
  participants: CallParticipant[];
  channelName?: string;
}

export function CallOverlay({
  isOpen,
  onClose,
  callType,
  participants,
  channelName,
}: CallOverlayProps) {
  const [status, setStatus] = useState<CallStatus>("ringing");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === "audio");
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setStatus("ringing");
      setElapsed(0);
      return;
    }
    // Auto-connect after 2s for demo
    const timer = setTimeout(() => setStatus("connected"), 2000);
    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (status !== "connected") return;
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [status]);

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  function handleEnd() {
    setStatus("ended");
    setTimeout(onClose, 1000);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg mx-4">
        {/* Main call container */}
        <div className="bg-surface border border-border-medium rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border-subtle">
            <div className="flex items-center gap-2">
              {callType === "video" ? (
                <Video className="h-4 w-4 text-cyan-400" />
              ) : (
                <Phone className="h-4 w-4 text-cyan-400" />
              )}
              <span className="text-sm font-medium text-text-primary">
                {callType === "video" ? "Video Call" : "Voice Call"}
              </span>
              {channelName && (
                <span className="text-xs text-text-muted">in {channelName}</span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-surface-hover text-text-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Participants area */}
          <div className="p-8 min-h-[280px] flex flex-col items-center justify-center">
            {status === "ringing" && (
              <div className="text-center">
                <div className="relative inline-block mb-4">
                  <div className="absolute inset-0 rounded-full bg-cyan-500/20 animate-ping" />
                  <Avatar
                    src={participants[0]?.image}
                    name={participants[0]?.name}
                    size="lg"
                  />
                </div>
                <h3 className="text-lg font-semibold text-text-primary">
                  {participants[0]?.name || "Unknown"}
                </h3>
                {participants.length > 1 && (
                  <p className="text-sm text-text-muted mt-1">
                    +{participants.length - 1} others
                  </p>
                )}
                <p className="text-sm text-cyan-400 mt-3 animate-pulse">
                  Ringing...
                </p>
              </div>
            )}

            {status === "connected" && (
              <div className="w-full">
                {/* Video grid or avatar display */}
                {callType === "video" && !isVideoOff ? (
                  <div
                    className={cn(
                      "grid gap-3 mb-4",
                      participants.length === 1
                        ? "grid-cols-1"
                        : participants.length === 2
                        ? "grid-cols-2"
                        : "grid-cols-2"
                    )}
                  >
                    {participants.map((p) => (
                      <div
                        key={p.id}
                        className="relative aspect-video bg-surface-hover rounded-xl border border-border-subtle flex items-center justify-center overflow-hidden"
                      >
                        <Avatar src={p.image} name={p.name} size="lg" />
                        <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
                          <span className="text-xs font-medium text-white bg-black/50 px-2 py-0.5 rounded-full">
                            {p.name}
                          </span>
                          {p.isMuted && (
                            <MicOff className="h-3 w-3 text-red-400" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center mb-4">
                    <div className="flex -space-x-3 mb-4">
                      {participants.slice(0, 4).map((p) => (
                        <Avatar
                          key={p.id}
                          src={p.image}
                          name={p.name}
                          size="lg"
                          className="ring-2 ring-[#1a1a2e]"
                        />
                      ))}
                    </div>
                    <p className="text-sm text-text-secondary">
                      {participants.map((p) => p.name).join(", ")}
                    </p>
                  </div>
                )}

                {/* Call duration */}
                <p className="text-center text-sm text-cyan-400 font-mono">
                  {formatTime(elapsed)}
                </p>
              </div>
            )}

            {status === "ended" && (
              <div className="text-center">
                <PhoneOff className="h-12 w-12 text-text-dim mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-text-primary">
                  Call Ended
                </h3>
                <p className="text-sm text-text-muted mt-1">
                  Duration: {formatTime(elapsed)}
                </p>
              </div>
            )}
          </div>

          {/* Controls */}
          {status !== "ended" && (
            <div className="flex items-center justify-center gap-3 px-5 py-4 border-t border-border-subtle bg-surface-hover">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={cn(
                  "p-3 rounded-full transition-colors",
                  isMuted
                    ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                    : "bg-surface-hover text-text-secondary hover:bg-surface-hover"
                )}
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? (
                  <MicOff className="h-5 w-5" />
                ) : (
                  <Mic className="h-5 w-5" />
                )}
              </button>

              <button
                onClick={() => setIsVideoOff(!isVideoOff)}
                className={cn(
                  "p-3 rounded-full transition-colors",
                  isVideoOff
                    ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                    : "bg-surface-hover text-text-secondary hover:bg-surface-hover"
                )}
                title={isVideoOff ? "Turn on camera" : "Turn off camera"}
              >
                {isVideoOff ? (
                  <VideoOff className="h-5 w-5" />
                ) : (
                  <Video className="h-5 w-5" />
                )}
              </button>

              <button
                onClick={() => setIsScreenSharing(!isScreenSharing)}
                className={cn(
                  "p-3 rounded-full transition-colors",
                  isScreenSharing
                    ? "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                    : "bg-surface-hover text-text-secondary hover:bg-surface-hover"
                )}
                title="Share screen"
              >
                <Monitor className="h-5 w-5" />
              </button>

              <button
                onClick={handleEnd}
                className="p-3 rounded-full bg-red-600 text-white hover:bg-red-500 transition-colors"
                title="End call"
              >
                <PhoneOff className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
