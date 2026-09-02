import axios from "axios";
import io from "socket.io-client";
import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Radio,
  History,
  ListChecks,
  AlertTriangle,
  Plug,
  FileBarChart,
  Settings as SettingsIcon,
  Users,
  ShieldAlert,
  Clock,
  Mic,
  MicOff,
  PhoneOff,
  MoreHorizontal,
  Filter,
  Bot,
  Send,
  Sparkles,
  MessageSquareText,
  Wrench,
  FileText,
  CheckCircle2,
  ChevronRight,
  Share2,
} from "lucide-react";
import { joinChannel, leaveChannel } from "./agora";
import { startSpeechRecognition, stopSpeechRecognition } from "./speechToText";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const socket = io(API_URL);
const API = `${API_URL}/api`;

/* ---------------------------------------------------------------
   TOKENS
----------------------------------------------------------------*/
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

const PARTICIPANTS = [
  { name: "You", role: "Backend Eng", speaking: false },
  { name: "AI Commander", role: "Assistant", speaking: true },
  { name: "Anita", role: "Support Lead", speaking: false },
  { name: "Rohit", role: "On-call Eng", speaking: false },
  { name: "Karan", role: "DB Infra", speaking: false },
  { name: "Priya", role: "Duty Commander", speaking: false },
];

const TYPE_META = {
  fact: { label: "Fact", color: C.primary, soft: C.primarySoft },
  decision: { label: "Decision", color: C.success, soft: C.successSoft },
  action: { label: "Action", color: C.purple, soft: C.purpleSoft },
  hypothesis: { label: "Hypothesis", color: C.warning, soft: C.warningSoft },
  conflict: { label: "Conflict", color: C.danger, soft: C.dangerSoft },
};

const CAPABILITIES = [
  { icon: MessageSquareText, title: "Real-time Transcription", desc: "Live speech-to-text" },
  { icon: FileText, title: "Intelligent Summaries", desc: "Facts, decisions, actions" },
  { icon: Sparkles, title: "Smart Suggestions", desc: "Contextual recommendations" },
  { icon: Wrench, title: "Tool Integrations", desc: "Jira, Slack, PagerDuty & more" },
  { icon: FileBarChart, title: "Post-Incident Report", desc: "Auto-generated summaries" },
];

export default function SyntrixIncidentCommander() {
  const [view, setView] = useState("overview");
  const [elapsed, setElapsed] = useState(0);
  const [incidentState, setIncidentState] = useState({
    facts: [], hypotheses: [], decisions: [], actions: [], conflicts: [], timeline: []
  });
  const [proposedAction, setProposedAction] = useState(null);

  // Agora + speech recognition state
  const [inRoom, setInRoom] = useState(false);
  const [audioTrack, setAudioTrack] = useState(null);
  const [recognition, setRecognition] = useState(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const i = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    axios.get(`${API}/actions/state`).then(res => setIncidentState(res.data)).catch(() => {});

    socket.on("state_update", () => {
      axios.get(`${API}/actions/state`).then(res => setIncidentState(res.data)).catch(() => {});
    });

    socket.on("action_proposed", (data) => setProposedAction(data));
    socket.on("action_executed", () => setProposedAction(null));

    return () => socket.disconnect();
  }, []);

  const confirmAction = async () => {
    if (!proposedAction) return;
    await axios.post(`${API}/actions/confirm`, {
      description: proposedAction.description,
      confirmedBy: "Incident Commander"
    });
  };

  const handleJoinRoom = async () => {
    if (joining || inRoom) return;
    setJoining(true);
    try {
      const uid = Math.floor(Math.random() * 100000);
      const track = await joinChannel("incident-room-1", uid);
      setAudioTrack(track);

      const rec = startSpeechRecognition("You", "Backend Eng", async (text, speaker, role) => {
        try {
          await axios.post(`${API}/transcript`, { text, speaker, role });
        } catch (e) {
          console.error("transcript post failed", e);
        }
      });
      setRecognition(rec);
      setInRoom(true);
    } catch (err) {
      console.error("failed to join room:", err);
      alert("Could not join voice room — check console for details, and make sure mic permission is granted.");
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
  };

  const hh = String(Math.floor(elapsed / 3600)).padStart(2, "0");
  const mm = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  const clock = `${hh}:${mm}:${ss}`;

  return (
    <div style={{ display: "flex", background: C.bg, minHeight: "100%", width: "100%", fontFamily: "'Inter', system-ui, sans-serif", color: C.ink }}>
      <GlobalStyle />
      <Sidebar
        view={view}
        setView={setView}
        actionCount={incidentState.actions.filter(a => a.status !== "done").length}
        inRoom={inRoom}
        onLeaveRoom={handleLeaveRoom}
      />
      <main style={{ flex: 1, minWidth: 0, padding: "22px 26px 40px" }}>
        {view === "overview" && (
          <OverviewView
            clock={clock}
            state={incidentState}
            proposedAction={proposedAction}
            onConfirm={confirmAction}
            inRoom={inRoom}
            joining={joining}
            onJoinRoom={handleJoinRoom}
            onLeaveRoom={handleLeaveRoom}
          />
        )}
        {view === "timeline" && <TimelineView items={incidentState.timeline} />}
        {view === "actions" && <ActionsView items={incidentState.actions} />}
        {view === "assistant" && <AssistantView state={incidentState} />}
        
      </main>
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
      @keyframes wave {
        0%, 100% { transform: scaleY(0.3); }
        50% { transform: scaleY(1); }
      }
      .wave-bar { animation: wave 1s ease-in-out infinite; transform-origin: center; }
      @keyframes ring-pulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(59,102,224,0.35); }
        50% { box-shadow: 0 0 0 6px rgba(59,102,224,0); }
      }
      .speaking-ring { animation: ring-pulse 1.6s ease-in-out infinite; }
      @keyframes fade-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      .fade-in { animation: fade-in 0.3s ease-out; }
      .nav-item:hover { background: ${C.borderSoft} !important; }
      .btn-primary:hover { filter: brightness(1.06); }
      .btn-ghost:hover { background: ${C.borderSoft} !important; }
      .timeline-row:hover { background: ${C.borderSoft} !important; }
      ::-webkit-scrollbar { width: 8px; height: 8px; }
      ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 4px; }
      @keyframes orb-pulse {
        0%, 100% { transform: scale(1); opacity: 0.9; }
        50% { transform: scale(1.08); opacity: 1; }
      }
      @keyframes orb-rotate {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      .voice-orb {
        background: radial-gradient(circle at 40% 35%, #ffffff, #8ec5ff 30%, #7c5cfc 60%, #3b66e0 100%);
        background-size: 200% 200%;
        animation: orb-pulse 2.4s ease-in-out infinite, orb-rotate 6s ease infinite;
      }
      .voice-orb.idle {
        animation: none;
        opacity: 0.5;
        filter: grayscale(0.6);
      }
      .transcript-line { animation: fade-in 0.25s ease-out; }
      @media (prefers-reduced-motion: reduce) {
        .wave-bar, .speaking-ring, .fade-in { animation: none !important; }
      }
    `}</style>
  );
}

/* ---------------------------- SIDEBAR ---------------------------- */
function Sidebar({ view, setView, actionCount, inRoom, onLeaveRoom }) {
  return (
    <aside style={{ width: 232, flexShrink: 0, background: C.panel, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", padding: "20px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "0 8px", marginBottom: 26 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: C.primary, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ShieldAlert size={15} color="#fff" strokeWidth={2.2} />
        </div>
        <span className="display" style={{ fontSize: 15.5, fontWeight: 800, letterSpacing: "0.01em" }}>SYNTRIX</span>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV.map((item) => {
          const active = view === item.id;
          const badge = item.id === "actions" && actionCount > 0 ? actionCount : null;
          return (
            <button
              key={item.id}
              className="nav-item"
              onClick={() => setView(item.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 10px",
                borderRadius: 8,
                border: "none",
                background: active ? C.primarySoft : "transparent",
                color: active ? C.primary : C.slate,
                fontSize: 13.5,
                fontWeight: active ? 600 : 500,
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "left",
              }}
            >
              <item.icon size={16} strokeWidth={2} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {badge && (
                <span className="mono" style={{ fontSize: 10.5, background: C.danger, color: "#fff", borderRadius: 999, padding: "1px 6px" }}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 10px", borderRadius: 8, background: C.borderSoft }}>
          <div style={{ width: 26, height: 26, borderRadius: "50%", background: C.primarySoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Bot size={13} color={C.primary} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600 }}>AI Commander</p>
            <p style={{ margin: 0, fontSize: 10.5, color: C.success, display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: C.success, display: "inline-block" }} /> Online
            </p>
          </div>
        </div>
        <button
          className="btn-ghost"
          onClick={onLeaveRoom}
          disabled={!inRoom}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "9px 0", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: inRoom ? C.danger : C.faint, fontSize: 13, fontWeight: 600, cursor: inRoom ? "pointer" : "default", fontFamily: "inherit" }}
        >
          <PhoneOff size={14} /> Leave Room
        </button>
      </div>
    </aside>
  );
}

/* ---------------------------- SHARED ---------------------------- */
function PageHeader({ title, subtitle, live, right }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h1 className="display" style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{title}</h1>
          {live && (
            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: C.success, background: C.successSoft, padding: "3px 9px", borderRadius: 999, fontWeight: 600 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.success }} /> Live
            </span>
          )}
        </div>
        <p style={{ margin: "4px 0 0", fontSize: 13.5, color: C.slate }}>{subtitle}</p>
      </div>
      {right}
    </div>
  );
}

function Card({ children, style }) {
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: "0 1px 2px rgba(16,24,40,0.03)", ...style }}>
      {children}
    </div>
  );
}

function Badge({ color, soft, children }) {
  return (
    <span className="mono" style={{ fontSize: 10.5, fontWeight: 600, color, background: soft, padding: "3px 8px", borderRadius: 5, letterSpacing: "0.02em" }}>
      {children}
    </span>
  );
}

function Avatar({ initial, speaking }) {
  return (
    <div className={speaking ? "speaking-ring" : ""} style={{ width: 46, height: 46, borderRadius: "50%", background: speaking ? C.primarySoft : C.borderSoft, border: `2px solid ${speaking ? C.primary : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: speaking ? C.primary : C.slate }}>
      {initial}
    </div>
  );
}

function Placeholder({ label }) {
  return (
    <Card style={{ padding: 40, textAlign: "center" }}>
      <p style={{ color: C.faint, fontSize: 14, margin: 0 }}>{label} isn't wired up in this preview yet — same design system carries over.</p>
    </Card>
  );
}

function EmptyState({ text }) {
  return <p style={{ padding: 20, color: C.faint, fontSize: 13, textAlign: "center" }}>{text}</p>;
}

/* ---------------------------- OVERVIEW ---------------------------- */
function OverviewView({ clock, state, proposedAction, onConfirm, inRoom, joining, onJoinRoom, onLeaveRoom }) {
  const feed = [...state.timeline].slice(-30).reverse();

  return (
    <div className="fade-in">
      <PageHeader
        title="Incident Commander"
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

        {/* LEFT: LIVE CLASSIFIED TRANSCRIPT FEED */}
        <Card style={{ padding: 20, height: 560, display: "flex", flexDirection: "column" }}>
          <div style={{ marginBottom: 12 }}>
            <p className="display" style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Live Transcript</p>
            <span style={{ fontSize: 11.5, color: C.faint }}>SYNTRIX is listening — classified in real time</span>
          </div>
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingRight: 4 }}>
            {feed.length === 0 && <EmptyState text="Nothing said yet — join the room and speak" />}
            {feed.map((item, idx) => {
              const meta = TYPE_META[item.type] || TYPE_META.fact;
              const isCritical = item.type === "conflict" || item.type === "action";
              return (
                <div
                  key={item.id || idx}
                  className="transcript-line"
                  style={{
                    borderLeft: `3px solid ${meta.color}`,
                    background: meta.soft,
                    borderRadius: 8,
                    padding: "10px 12px",
                    boxShadow: isCritical ? `0 0 0 1px ${meta.color}33` : "none",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <Badge color={meta.color} soft="transparent">{meta.label.toUpperCase()}</Badge>
                    <span className="mono" style={{ fontSize: 10, color: C.faint }}>
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: C.ink, lineHeight: 1.4 }}>{item.text}</p>
                  <p style={{ fontSize: 11, color: C.slate, margin: "2px 0 0" }}>{item.speaker}</p>
                </div>
              );
            })}
          </div>
        </Card>

        {/* CENTER: ANIMATED VOICE ORB */}
        <Card style={{ padding: 24, height: 560, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between" }}>
          <div />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
            <div
              className={`voice-orb ${inRoom ? "" : "idle"}`}
              style={{ width: 220, height: 220, borderRadius: "50%", boxShadow: inRoom ? "0 0 60px rgba(124,92,252,0.35)" : "none" }}
            />
            <p className="display" style={{ fontSize: 15, fontWeight: 700, margin: 0, color: inRoom ? C.ink : C.faint }}>
              {inRoom ? "Listening…" : "Ambient"}
            </p>
            <WaveBars active={inRoom} />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            {!inRoom ? (
              <RoundBtn icon={Mic} bg={C.primary} color="#fff" onClick={onJoinRoom} disabled={joining} title={joining ? "Joining..." : "Start conversation"} />
            ) : (
              <RoundBtn icon={MicOff} bg={C.danger} color="#fff" onClick={onLeaveRoom} title="End conversation" />
            )}
            <RoundBtn icon={MoreHorizontal} bg={C.borderSoft} color={C.ink} />
          </div>
        </Card>

        {/* RIGHT: SUMMARY + SUGGESTION + ACTIONS */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card style={{ padding: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              <MiniStat icon={FileText} color={C.primary} soft={C.primarySoft} label="Facts" value={state.facts.length} />
              <MiniStat icon={Sparkles} color={C.warning} soft={C.warningSoft} label="Hypotheses" value={state.hypotheses.length} />
              <MiniStat icon={ListChecks} color={C.purple} soft={C.purpleSoft} label="Actions" value={state.actions.length} />
            </div>
          </Card>

          <Card style={{ padding: 20 }}>
            <p className="display" style={{ fontSize: 15, fontWeight: 700, margin: "0 0 8px" }}>AI Suggestion</p>
            {proposedAction ? (
              <>
                <p style={{ fontSize: 12.5, color: C.slate, margin: "0 0 14px", lineHeight: 1.5 }}>{proposedAction.description}</p>
                <button className="btn-primary" onClick={onConfirm} style={{ width: "100%", padding: "9px 0", borderRadius: 8, border: "none", background: C.primary, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Confirm</button>
              </>
            ) : (
              <p style={{ fontSize: 12.5, color: C.faint, margin: 0 }}>No pending suggestions right now.</p>
            )}
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

function StatCard({ icon: Icon, color, soft, label, value, mono }) {
  return (
    <Card style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 36, height: 36, borderRadius: 9, background: soft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={17} color={color} strokeWidth={2.1} />
      </div>
      <div>
        <p style={{ fontSize: 11.5, color: C.faint, margin: 0 }}>{label}</p>
        <p className={mono ? "mono" : "display"} style={{ fontSize: 15, fontWeight: 700, margin: "1px 0 0", color: C.ink }}>{value}</p>
      </div>
    </Card>
  );
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
    <button
      className="btn-ghost"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{ width: 42, height: 42, borderRadius: "50%", background: bg, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.6 : 1 }}
    >
      <Icon size={17} color={color} />
    </button>
  );
}

function WaveBars({ active = true }) {
  const bars = Array.from({ length: 28 });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2.5, height: 30, justifyContent: "center" }}>
      {bars.map((_, i) => (
        <div
          key={i}
          className={active ? "wave-bar" : ""}
          style={{
            width: 3,
            height: active ? `${8 + (i % 5) * 5}px` : "4px",
            background: i % 3 === 0 ? C.primary : C.primarySoft,
            borderRadius: 2,
            animationDelay: `${(i % 7) * 0.09}s`,
            opacity: active ? 1 : 0.4,
          }}
        />
      ))}
    </div>
  );
}

/* ---------------------------- TIMELINE ---------------------------- */
function TimelineView({ items }) {
  const [selected, setSelected] = useState(items[0] || null);

  useEffect(() => {
    if (!selected && items.length > 0) setSelected(items[0]);
  }, [items, selected]);

  return (
    <div className="fade-in">
      <PageHeader
        title="Incident Timeline"
        subtitle="Chronological timeline of everything that matters."
        right={
          <button className="btn-ghost" style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.ink, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            <Filter size={14} /> Filter
          </button>
        }
      />
      <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        {Object.values(TYPE_META).map((m) => (
          <div key={m.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.slate }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: m.color }} /> {m.label}
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, alignItems: "start" }}>
        <Card style={{ padding: "6px 10px" }}>
          {items.length === 0 && <EmptyState text="Nothing on the timeline yet — waiting on the room" />}
          {items.map((item, idx) => {
            const meta = TYPE_META[item.type] || TYPE_META.fact;
            const active = selected && selected.id === item.id;
            return (
              <button
                key={item.id || idx}
                className="timeline-row"
                onClick={() => setSelected(item)}
                style={{
                  display: "flex",
                  gap: 14,
                  width: "100%",
                  textAlign: "left",
                  padding: "14px 10px",
                  borderBottom: idx < items.length - 1 ? `1px solid ${C.borderSoft}` : "none",
                  background: active ? C.primarySoft : "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  borderRadius: 8,
                }}
              >
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
            <Badge color={(TYPE_META[selected.type] || TYPE_META.fact).color} soft={(TYPE_META[selected.type] || TYPE_META.fact).soft}>
              {(TYPE_META[selected.type] || TYPE_META.fact).label}
            </Badge>
            <p className="display" style={{ fontSize: 16, fontWeight: 700, margin: "10px 0 4px" }}>{selected.text}</p>
            <p className="mono" style={{ fontSize: 11, color: C.faint, margin: "0 0 14px" }}>
              {new Date(selected.timestamp).toLocaleTimeString()} · {selected.speaker}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

/* ---------------------------- ACTIONS ---------------------------- */
function ActionsView({ items }) {
  const [filter, setFilter] = useState("All");
  const filters = ["All", "open", "in_progress", "done"];
  const rows = items.filter((a) => filter === "All" || a.status === filter);

  return (
    <div className="fade-in">
      <PageHeader title="Action Items" subtitle="Never miss a follow-up or a dropped owner." />
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={filter !== f ? "btn-ghost" : ""}
            style={{
              padding: "7px 14px",
              borderRadius: 999,
              border: `1px solid ${filter === f ? C.primary : C.border}`,
              background: filter === f ? C.primarySoft : "transparent",
              color: filter === f ? C.primary : C.slate,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {f}
          </button>
        ))}
      </div>
      <Card style={{ padding: "6px 10px" }}>
        {rows.length === 0 && <EmptyState text="No action items in this filter" />}
        {rows.map((a, idx) => (
          <div key={a.id || idx} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 10px", borderBottom: idx < rows.length - 1 ? `1px solid ${C.borderSoft}` : "none" }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: C.primarySoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12.5, fontWeight: 700, color: C.primary, flexShrink: 0 }}>
              {a.owner ? a.owner[0] : "?"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13.5, fontWeight: 600, margin: 0 }}>{a.text}</p>
              <span style={{ fontSize: 11.5, color: C.faint }}>{a.owner ? `Assigned to ${a.owner}` : "Unassigned"}</span>
            </div>
            <Badge
              color={a.status === "done" ? C.success : a.status === "in_progress" ? C.warning : C.slate}
              soft={a.status === "done" ? C.successSoft : a.status === "in_progress" ? C.warningSoft : C.borderSoft}
            >
              {a.status || "open"}
            </Badge>
          </div>
        ))}
      </Card>
    </div>
  );
}

/* ---------------------------- AI ASSISTANT ---------------------------- */
function AssistantView({ state }) {
  const [messages, setMessages] = useState([
    { from: "ai", text: "I'm listening to the room and organizing everything. Here's what I have so far." },
  ]);
  const [input, setInput] = useState("");

  function send() {
    if (!input.trim()) return;
    const q = input.trim();
    setMessages((m) => [
      ...m,
      { from: "user", text: q },
      { from: "ai", text: "Based on the current fact table and open conflicts, here's what I can tell you — check the Timeline tab for the full trail." },
    ]);
    setInput("");
  }

  return (
    <div className="fade-in">
      <PageHeader title="AI Commander" subtitle="Conversational AI that listens, understands and acts." live />
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, alignItems: "start" }}>
        <Card style={{ padding: 24, display: "flex", flexDirection: "column", minHeight: 460 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 0 24px" }}>
            <div style={{ width: 76, height: 76, borderRadius: "50%", background: C.primarySoft, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
              <Bot size={34} color={C.primary} />
            </div>
            <WaveBars />
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, overflowY: "auto", paddingRight: 4 }}>
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.from === "ai" ? "flex-start" : "flex-end",
                  maxWidth: "80%",
                  background: m.from === "ai" ? C.borderSoft : C.primary,
                  color: m.from === "ai" ? C.ink : "#fff",
                  padding: "10px 14px",
                  borderRadius: 12,
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                {m.text}
              </div>
            ))}
          </div>

          <div style={{ background: C.borderSoft, borderRadius: 10, padding: 14, marginTop: 16 }}>
            <p style={{ fontSize: 11.5, fontWeight: 700, margin: "0 0 10px", color: C.slate, textTransform: "uppercase", letterSpacing: "0.04em" }}>Current Incident Snapshot</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              <SnapshotStat icon={FileText} color={C.primary} label="Facts" value={state.facts.length} />
              <SnapshotStat icon={CheckCircle2} color={C.success} label="Decisions" value={state.decisions.length} />
              <SnapshotStat icon={ListChecks} color={C.purple} label="Action Items" value={state.actions.length} />
              <SnapshotStat icon={AlertTriangle} color={C.danger} label="Open Risks" value={state.conflicts.length} />
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask me anything about the incident…"
              style={{ flex: 1, padding: "10px 14px", borderRadius: 999, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: "inherit", outline: "none" }}
            />
            <button onClick={send} className="btn-primary" style={{ width: 40, height: 40, borderRadius: "50%", border: "none", background: C.primary, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
              <Send size={15} />
            </button>
          </div>
        </Card>

        <Card style={{ padding: 20 }}>
          <p className="display" style={{ fontSize: 15, fontWeight: 700, margin: "0 0 14px" }}>AI Capabilities</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {CAPABILITIES.map((c) => (
              <div key={c.title} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: C.primarySoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <c.icon size={15} color={C.primary} />
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{c.title}</p>
                  <p style={{ fontSize: 11.5, color: C.faint, margin: "1px 0 0" }}>{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function SnapshotStat({ icon: Icon, color, label, value }) {
  return (
    <div style={{ textAlign: "center" }}>
      <Icon size={13} color={color} style={{ marginBottom: 3 }} />
      <p className="display" style={{ fontSize: 15, fontWeight: 800, margin: 0, color }}>{value}</p>
      <p style={{ fontSize: 9.5, color: C.slate, margin: 0 }}>{label}</p>
    </div>
  );
}