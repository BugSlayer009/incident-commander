import axios from "axios";
import io from "socket.io-client";
import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Radio,
  History,
  ListChecks,
  AlertTriangle,
  Users,
  ShieldAlert,
  Clock,
  Mic,
  MicOff,
  PhoneOff,
  MoreHorizontal,
  Bot,
  Sparkles,
  FileText,
  ChevronRight,
  Settings as SettingsIcon,
  X,
  Copy,
  Video,
  KeyRound,
} from "lucide-react";
import { joinChannel, leaveChannel } from "./agora";
import { startSpeechRecognition, stopSpeechRecognition } from "./speechToText";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const socket = io(API_URL);
const API = `${API_URL}/api`;

const C = {
  bg: "#F5F7FA",
  panel: "#FFFFFF",
  border: "#E5E9F0",
  borderSoft: "#EEF1F5",
  ink: "#171B23",
  slate: "#6B7280",
  faint: "#9AA3B0",
  primary: "#3B66E0",
  primarySoft: "#EBF0FE",
  success: "#1E9E6B",
  successSoft: "#E8F7F1",
  warning: "#C9860F",
  warningSoft: "#FBF1DE",
  danger: "#D14343",
  dangerSoft: "#FBEAEA",
  purple: "#7C5CFC",
  purpleSoft: "#F1EEFE",
};

const NAV = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "timeline", label: "Timeline", icon: History },
];

const TYPE_META = {
  fact: { label: "Fact", color: C.primary, soft: C.primarySoft },
  decision: { label: "Decision", color: C.success, soft: C.successSoft },
  action: { label: "Action", color: C.purple, soft: C.purpleSoft },
  hypothesis: { label: "Hypothesis", color: C.warning, soft: C.warningSoft },
  conflict: { label: "Conflict", color: C.danger, soft: C.dangerSoft },
};

function generateMeetingCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export default function SyntrixIncidentCommander() {
  const [screen, setScreen] = useState("landing"); // landing | app
  const [meetingCode, setMeetingCode] = useState(null);

  const [view, setView] = useState("overview");
  const [elapsed, setElapsed] = useState(0);
  const [incidentState, setIncidentState] = useState({
    facts: [], hypotheses: [], decisions: [], actions: [], conflicts: [], timeline: []
  });
  const [inRoom, setInRoom] = useState(false);
  const [audioTrack, setAudioTrack] = useState(null);
  const [recognition, setRecognition] = useState(null);
  const [joining, setJoining] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [micMuted, setMicMuted] = useState(false);

  useEffect(() => {
    const i = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    if (screen !== "app") return;
    axios.get(`${API}/actions/state`).then(res => setIncidentState(res.data)).catch(() => {});
    socket.on("state_update", () => {
      axios.get(`${API}/actions/state`).then(res => setIncidentState(res.data)).catch(() => {});
    });
    return () => socket.off("state_update");
  }, [screen]);

  const handleEnterApp = async (code) => {
    setMeetingCode(code);
    setScreen("app");
    setJoining(true);
    try {
      const uid = Math.floor(Math.random() * 100000);
      const track = await joinChannel(`incident-room-${code}`, uid);
      setAudioTrack(track);
      const rec = startSpeechRecognition("You", "Participant", async (text, speaker, role) => {
        try {
          await axios.post(`${API}/transcript`, { text, speaker, role });
        } catch (e) { console.error(e); }
      });
      setRecognition(rec);
      setInRoom(true);
    } catch (err) {
      console.error("failed to join room:", err);
      alert("Could not join voice room — check mic permission.");
    } finally {
      setJoining(false);
    }
  };

  const handleLeaveRoom = async () => {
    await leaveChannel(audioTrack);
    stopSpeechRecognition(recognition);
    setAudioTrack(null);
    setRecognition(null);
    setInRoom(false);
    setScreen("landing");
  };

  const toggleMic = () => {
    if (audioTrack) {
      if (micMuted) audioTrack.setEnabled(true); else audioTrack.setEnabled(false);
      setMicMuted(!micMuted);
    }
  };

  const hh = String(Math.floor(elapsed / 3600)).padStart(2, "0");
  const mm = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  const clock = `${hh}:${mm}:${ss}`;

  if (screen === "landing") {
    return <LandingScreen onEnter={handleEnterApp} />;
  }

  return (
    <div style={{ display: "flex", background: C.bg, minHeight: "100%", width: "100%", fontFamily: "'Inter', system-ui, sans-serif", color: C.ink }}>
      <GlobalStyle />
      <Sidebar view={view} setView={setView} inRoom={inRoom} onLeaveRoom={handleLeaveRoom} meetingCode={meetingCode} />
      <main style={{ flex: 1, minWidth: 0, padding: "22px 26px 40px" }}>
        {view === "overview" && (
          <OverviewView
            state={incidentState}
            inRoom={inRoom}
            joining={joining}
            micMuted={micMuted}
            onToggleMic={toggleMic}
            onLeaveRoom={handleLeaveRoom}
            onOpenSettings={() => setShowSettings(true)}
          />
        )}
        {view === "timeline" && <TimelineView items={incidentState.timeline} />}
      </main>
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} meetingCode={meetingCode} clock={clock} />}
    </div>
  );
}

/* ---------------------------- LANDING / JOIN-CREATE ---------------------------- */
function LandingScreen({ onEnter }) {
  const [mode, setMode] = useState(null); // null | join | create
  const [codeInput, setCodeInput] = useState("");
  const [createdCode, setCreatedCode] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = () => {
    const code = generateMeetingCode();
    setCreatedCode(code);
    setMode("create");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(createdCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div style={{
      minHeight: "100vh", width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
      background: "radial-gradient(circle at 20% 20%, #3b66e033, transparent 50%), radial-gradient(circle at 80% 80%, #7c5cfc33, transparent 50%), linear-gradient(135deg, #0f1115 0%, #171b2b 100%)",
      fontFamily: "'Inter', system-ui, sans-serif", position: "relative", overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&family=Inter:wght@400;500;600&display=swap');
        .glass-card {
          background: rgba(255,255,255,0.06);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255,255,255,0.14);
          box-shadow: 0 8px 40px rgba(0,0,0,0.35);
        }
        .glass-btn {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.18);
          transition: all 0.2s ease;
        }
        .glass-btn:hover { background: rgba(255,255,255,0.14); transform: translateY(-1px); }
        .glass-input {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.16);
          color: #fff;
        }
        .glass-input::placeholder { color: rgba(255,255,255,0.4); }
        @keyframes floatOrb { 0%,100%{ transform: translateY(0px);} 50%{ transform: translateY(-14px);} }
        .float-orb { animation: floatOrb 5s ease-in-out infinite; }
      `}</style>

      <div className="glass-card float-orb" style={{ borderRadius: 24, padding: 40, width: 420, position: "relative", zIndex: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 30, justifyContent: "center" }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, #3B66E0, #7C5CFC)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ShieldAlert size={20} color="#fff" />
          </div>
          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "0.02em" }}>SYNTRIX</span>
        </div>

        {mode === null && (
          <>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13.5, textAlign: "center", margin: "0 0 28px" }}>
              AI Incident Commander — join or start a live room
            </p>
            <button className="glass-btn" onClick={handleCreate} style={{ width: "100%", padding: "14px 0", borderRadius: 12, color: "#fff", fontSize: 14.5, fontWeight: 600, cursor: "pointer", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Video size={17} /> Create a New Meeting
            </button>
            <button className="glass-btn" onClick={() => setMode("join")} style={{ width: "100%", padding: "14px 0", borderRadius: 12, color: "#fff", fontSize: 14.5, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <KeyRound size={17} /> Join with a Code
            </button>
          </>
        )}

        {mode === "join" && (
          <>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13.5, textAlign: "center", margin: "0 0 20px" }}>
              Enter the 6-digit meeting code
            </p>
            <input
              className="glass-input"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              style={{ width: "100%", padding: "16px 0", borderRadius: 12, textAlign: "center", fontSize: 28, letterSpacing: "0.4em", fontFamily: "'IBM Plex Mono', monospace", marginBottom: 20, outline: "none" }}
            />
            <button
              className="glass-btn"
              disabled={codeInput.length !== 6}
              onClick={() => onEnter(codeInput)}
              style={{ width: "100%", padding: "14px 0", borderRadius: 12, color: "#fff", fontSize: 14.5, fontWeight: 600, cursor: codeInput.length === 6 ? "pointer" : "default", opacity: codeInput.length === 6 ? 1 : 0.4 }}
            >
              Join Meeting
            </button>
            <button onClick={() => setMode(null)} style={{ width: "100%", background: "transparent", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 14, cursor: "pointer" }}>← Back</button>
          </>
        )}

        {mode === "create" && (
          <>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13.5, textAlign: "center", margin: "0 0 16px" }}>
              Share this code with your team
            </p>
            <div className="glass-input" style={{ borderRadius: 12, padding: "18px 0", textAlign: "center", marginBottom: 16 }}>
              <span style={{ fontSize: 32, letterSpacing: "0.4em", fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700 }}>{createdCode}</span>
            </div>
            <button className="glass-btn" onClick={handleCopy} style={{ width: "100%", padding: "12px 0", borderRadius: 12, color: "#fff", fontSize: 13.5, fontWeight: 600, cursor: "pointer", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Copy size={15} /> {copied ? "Copied!" : "Copy Code"}
            </button>
            <button
              className="glass-btn"
              onClick={() => onEnter(createdCode)}
              style={{ width: "100%", padding: "14px 0", borderRadius: 12, color: "#fff", fontSize: 14.5, fontWeight: 600, cursor: "pointer", background: "linear-gradient(135deg, #3B66E0, #7C5CFC)", border: "none" }}
            >
              Start Meeting
            </button>
            <button onClick={() => setMode(null)} style={{ width: "100%", background: "transparent", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 14, cursor: "pointer" }}>← Back</button>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------------------- SETTINGS MODAL ---------------------------- */
function SettingsModal({ onClose, meetingCode, clock }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.panel, borderRadius: 16, padding: 28, width: 360, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <p className="display" style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Room Settings</p>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} color={C.faint} /></button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.borderSoft}` }}>
            <span style={{ fontSize: 13, color: C.slate }}>Meeting Code</span>
            <span className="mono" style={{ fontSize: 13, fontWeight: 700 }}>{meetingCode}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.borderSoft}` }}>
            <span style={{ fontSize: 13, color: C.slate }}>Session Duration</span>
            <span className="mono" style={{ fontSize: 13, fontWeight: 700 }}>{clock}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.borderSoft}` }}>
            <span style={{ fontSize: 13, color: C.slate }}>Speech Recognition</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.success }}>Active</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0" }}>
            <span style={{ fontSize: 13, color: C.slate }}>Voice Engine</span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Agora RTC</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
      * { box-sizing: border-box; }
      .display { font-family: 'Plus Jakarta Sans', sans-serif; }
      .mono { font-family: 'IBM Plex Mono', monospace; }
      @keyframes wave { 0%,100%{transform:scaleY(0.3);} 50%{transform:scaleY(1);} }
      .wave-bar { animation: wave 1s ease-in-out infinite; transform-origin: center; }
      @keyframes fade-in { from{opacity:0; transform:translateY(4px);} to{opacity:1; transform:translateY(0);} }
      .fade-in { animation: fade-in 0.3s ease-out; }
      .nav-item:hover { background: ${C.borderSoft} !important; }
      .btn-ghost:hover { background: ${C.borderSoft} !important; }
      .timeline-row:hover { background: ${C.borderSoft} !important; }
      ::-webkit-scrollbar { width: 8px; height: 8px; }
      ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 4px; }
      @keyframes orb-pulse { 0%,100%{transform:scale(1); opacity:0.9;} 50%{transform:scale(1.08); opacity:1;} }
      @keyframes orb-rotate { 0%{background-position:0% 50%;} 50%{background-position:100% 50%;} 100%{background-position:0% 50%;} }
      .voice-orb {
        background: radial-gradient(circle at 40% 35%, #ffffff, #8ec5ff 30%, #7c5cfc 60%, #3b66e0 100%);
        background-size: 200% 200%;
        animation: orb-pulse 2.4s ease-in-out infinite, orb-rotate 6s ease infinite;
      }
      .voice-orb.idle { animation: none; opacity: 0.5; filter: grayscale(0.6); }
      .transcript-line { animation: fade-in 0.25s ease-out; }
    `}</style>
  );
}

function Sidebar({ view, setView, inRoom, onLeaveRoom, meetingCode }) {
  return (
    <aside style={{ width: 232, flexShrink: 0, background: C.panel, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", padding: "20px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "0 8px", marginBottom: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: C.primary, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ShieldAlert size={15} color="#fff" strokeWidth={2.2} />
        </div>
        <span className="display" style={{ fontSize: 15.5, fontWeight: 800 }}>SYNTRIX</span>
      </div>
      <p className="mono" style={{ fontSize: 10.5, color: C.faint, padding: "0 8px", marginBottom: 22 }}>Room #{meetingCode}</p>

      <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV.map((item) => {
          const active = view === item.id;
          return (
            <button key={item.id} className="nav-item" onClick={() => setView(item.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 8, border: "none", background: active ? C.primarySoft : "transparent", color: active ? C.primary : C.slate, fontSize: 13.5, fontWeight: active ? 600 : 500, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
              <item.icon size={16} strokeWidth={2} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
        <button className="btn-ghost" onClick={onLeaveRoom} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "9px 0", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.danger, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
          <PhoneOff size={14} /> Leave Room
        </button>
      </div>
    </aside>
  );
}

function PageHeader({ title, subtitle, live, right }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h1 className="display" style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{title}</h1>
          {live && <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: C.success, background: C.successSoft, padding: "3px 9px", borderRadius: 999, fontWeight: 600 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: C.success }} /> Live</span>}
        </div>
        <p style={{ margin: "4px 0 0", fontSize: 13.5, color: C.slate }}>{subtitle}</p>
      </div>
      {right}
    </div>
  );
}

function Card({ children, style }) {
  return <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: "0 1px 2px rgba(16,24,40,0.03)", ...style }}>{children}</div>;
}

function Badge({ color, soft, children }) {
  return <span className="mono" style={{ fontSize: 10.5, fontWeight: 600, color, background: soft, padding: "3px 8px", borderRadius: 5, letterSpacing: "0.02em" }}>{children}</span>;
}

function EmptyState({ text }) {
  return <p style={{ padding: 20, color: C.faint, fontSize: 13, textAlign: "center" }}>{text}</p>;
}

function MiniStat({ icon: Icon, color, soft, label, value }) {
  return (
    <div style={{ background: soft, borderRadius: 9, padding: "10px 8px", textAlign: "center" }}>
      <Icon size={14} color={color} style={{ marginBottom: 4 }} />
      <p className="display" style={{ fontSize: 16, fontWeight: 800, margin: 0, color }}>{value}</p>
      <p style={{ fontSize: 10, color: C.slate, margin: 0 }}>{label}</p>
    </div>
  );
}

function RoundBtn({ icon: Icon, bg, color, onClick, disabled, title }) {
  return (
    <button onClick={onClick} disabled={disabled} title={title} style={{ width: 42, height: 42, borderRadius: "50%", background: bg, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.6 : 1 }}>
      <Icon size={17} color={color} />
    </button>
  );
}

function WaveBars({ active = true }) {
  const bars = Array.from({ length: 28 });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2.5, height: 30, justifyContent: "center" }}>
      {bars.map((_, i) => (
        <div key={i} className={active ? "wave-bar" : ""} style={{ width: 3, height: active ? `${8 + (i % 5) * 5}px` : "4px", background: i % 3 === 0 ? C.primary : C.primarySoft, borderRadius: 2, animationDelay: `${(i % 7) * 0.09}s`, opacity: active ? 1 : 0.4 }} />
      ))}
    </div>
  );
}

/* ---------------------------- OVERVIEW ---------------------------- */
function OverviewView({ state, inRoom, joining, micMuted, onToggleMic, onLeaveRoom, onOpenSettings }) {
  const feed = [...state.timeline].slice(-30).reverse();

  return (
    <div className="fade-in">
      <PageHeader
        title="SYNTRIX Incident Commander"
        subtitle="AI co-pilot for real-time incident management"
        live={inRoom}
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <Badge color={C.slate} soft={C.borderSoft}>Deepgram STT</Badge>
            <Badge color={C.primary} soft={C.primarySoft}>Groq LLM</Badge>
            <Badge color={C.purple} soft={C.purpleSoft}>Browser TTS</Badge>
          </div>
        }
      />
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr 0.85fr", gap: 16, alignItems: "start" }}>

        <Card style={{ padding: 20, height: 560, display: "flex", flexDirection: "column" }}>
          <div style={{ marginBottom: 12 }}>
            <p className="display" style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Live Transcript</p>
            <span style={{ fontSize: 11.5, color: C.faint }}>SYNTRIX is listening — classified in real time</span>
          </div>
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingRight: 4 }}>
            {feed.length === 0 && <EmptyState text="Nothing said yet — start speaking" />}
            {feed.map((item, idx) => {
              const meta = TYPE_META[item.type] || TYPE_META.fact;
              return (
                <div key={item.id || idx} className="transcript-line" style={{ borderLeft: `3px solid ${meta.color}`, background: meta.soft, borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <Badge color={meta.color} soft="transparent">{meta.label.toUpperCase()}</Badge>
                    <span className="mono" style={{ fontSize: 10, color: C.faint }}>{new Date(item.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: C.ink, lineHeight: 1.4 }}>{item.text}</p>
                  <p style={{ fontSize: 11, color: C.slate, margin: "2px 0 0" }}>{item.speaker}</p>
                </div>
              );
            })}
          </div>
        </Card>

        <Card style={{ padding: 24, height: 560, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between" }}>
          <div />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
            <div className={`voice-orb ${inRoom ? "" : "idle"}`} style={{ width: 220, height: 220, borderRadius: "50%", boxShadow: inRoom ? "0 0 60px rgba(124,92,252,0.35)" : "none" }} />
            <p className="display" style={{ fontSize: 15, fontWeight: 700, margin: 0, color: inRoom ? C.ink : C.faint }}>SYNTRIX</p>
            <WaveBars active={inRoom} />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <RoundBtn icon={micMuted ? MicOff : Mic} bg={micMuted ? C.dangerSoft : C.primarySoft} color={micMuted ? C.danger : C.primary} onClick={onToggleMic} disabled={joining} title={micMuted ? "Unmute" : "Mute"} />
            <RoundBtn icon={PhoneOff} bg={C.danger} color="#fff" onClick={onLeaveRoom} title="Leave room" />
            <RoundBtn icon={SettingsIcon} bg={C.borderSoft} color={C.ink} onClick={onOpenSettings} title="Settings" />
          </div>
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card style={{ padding: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              <MiniStat icon={FileText} color={C.primary} soft={C.primarySoft} label="Facts" value={state.facts.length} />
              <MiniStat icon={Sparkles} color={C.warning} soft={C.warningSoft} label="Hypotheses" value={state.hypotheses.length} />
              <MiniStat icon={ListChecks} color={C.purple} soft={C.purpleSoft} label="Actions" value={state.actions.length} />
            </div>
          </Card>

          <Card style={{ padding: 20, flex: 1 }}>
            <p className="display" style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px" }}>Open Conflicts</p>
            {state.conflicts.length === 0 && <EmptyState text="No conflicts flagged" />}
            {state.conflicts.map((c, i) => (
              <div key={c.id || i} style={{ borderLeft: `3px solid ${C.danger}`, background: C.dangerSoft, borderRadius: 8, padding: 10, marginBottom: 8 }}>
                <p style={{ fontSize: 12.5, fontWeight: 600, margin: 0 }}>{c.text}</p>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------- TIMELINE ---------------------------- */
function TimelineView({ items }) {
  const [selected, setSelected] = useState(items[0] || null);
  useEffect(() => { if (!selected && items.length > 0) setSelected(items[0]); }, [items, selected]);

  return (
    <div className="fade-in">
      <PageHeader title="Incident Timeline" subtitle="Chronological timeline of everything that matters." />
      <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        {Object.values(TYPE_META).map((m) => (
          <div key={m.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.slate }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: m.color }} /> {m.label}
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, alignItems: "start" }}>
        <Card style={{ padding: "6px 10px" }}>
          {items.length === 0 && <EmptyState text="Nothing on the timeline yet" />}
          {items.map((item, idx) => {
            const meta = TYPE_META[item.type] || TYPE_META.fact;
            const active = selected && selected.id === item.id;
            return (
              <button key={item.id || idx} className="timeline-row" onClick={() => setSelected(item)} style={{ display: "flex", gap: 14, width: "100%", textAlign: "left", padding: "14px 10px", borderBottom: idx < items.length - 1 ? `1px solid ${C.borderSoft}` : "none", background: active ? C.primarySoft : "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", borderRadius: 8 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 3 }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: meta.color, flexShrink: 0 }} />
                  {idx < items.length - 1 && <span style={{ width: 1, flex: 1, background: C.borderSoft, marginTop: 4 }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="mono" style={{ fontSize: 10.5, color: C.faint, margin: "0 0 3px" }}>{new Date(item.timestamp).toLocaleTimeString()}</p>
                  <p style={{ fontSize: 13.5, fontWeight: 600, margin: 0, color: C.ink }}>{item.text}</p>
                  <p style={{ fontSize: 11.5, color: C.slate, margin: "2px 0 0" }}>{item.speaker}</p>
                </div>
                <ChevronRight size={15} color={C.faint} style={{ alignSelf: "center", flexShrink: 0 }} />
              </button>
            );
          })}
        </Card>
        {selected && (
          <Card style={{ padding: 20, position: "sticky", top: 20 }}>
            <Badge color={(TYPE_META[selected.type] || TYPE_META.fact).color} soft={(TYPE_META[selected.type] || TYPE_META.fact).soft}>{(TYPE_META[selected.type] || TYPE_META.fact).label}</Badge>
            <p className="display" style={{ fontSize: 16, fontWeight: 700, margin: "10px 0 4px" }}>{selected.text}</p>
            <p className="mono" style={{ fontSize: 11, color: C.faint, margin: "0 0 14px" }}>{new Date(selected.timestamp).toLocaleTimeString()} · {selected.speaker}</p>
          </Card>
        )}
      </div>
    </div>
  );
}