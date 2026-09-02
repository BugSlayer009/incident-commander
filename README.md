<div align="center">

# 🛡️ SYNTRIX — Voice AI Incident Commander

**An AI that joins your incident call, listens, thinks, and keeps everyone aligned — without ever pretending to know the root cause.**

Built for **EchoSphere: Agora Conversational AI Hackathon 2026**

[![Agora](https://img.shields.io/badge/Voice-Agora%20RTC-1E9E6B?style=for-the-badge)](https://www.agora.io/)
[![Node](https://img.shields.io/badge/Backend-Node.js-3B66E0?style=for-the-badge)](https://nodejs.org/)
[![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-7C5CFC?style=for-the-badge)](https://react.dev/)
[![Live Demo](https://img.shields.io/badge/Live-Demo-D14343?style=for-the-badge)](https://incident-commander-eta.vercel.app/)

</div>

---

## 🎯 The Problem

> A payment system goes down at 2 AM. Engineers, support leads, and business stakeholders pile into a call. Everyone's talking at once — some sharing facts, some guessing, some deciding. Ten minutes in, nobody agrees on what's confirmed, what's assumed, who owns what, or what's already been tried.

Incidents aren't slow because people don't know what to do. They're slow because **nobody is tracking what everyone just said.**

## 💡 The Idea

SYNTRIX joins the incident call as a real participant over **Agora's real-time voice infrastructure**. Anyone can create a room and get a shareable 6-digit code, or join an existing one with a code — no accounts, no setup friction. Once inside, it listens continuously, and instead of just transcribing, it actively **organizes the chaos**:

| It hears... | It does... |
|---|---|
| *"the payment API is returning 500s"* | Logs it as a **Fact** |
| *"I think it's the connection pool"* | Logs it as a **Hypothesis** |
| *"let's roll back the deployment"* | Logs it as a **Decision** |
| *"Rohit, can you check the DB pool"* | Creates a tracked **Action Item** |
| Two people contradicting each other | Raises a **Conflict Flag** — never picks a side |
| Something sounds critical | **Proposes** an action — but waits for a human to confirm before doing anything |

It never claims to know the root cause. It just makes sure the humans never lose the thread.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    ENTRY["🚪 Join / Create Meeting<br/>6-digit room code"] --> ROOM

    subgraph ROOM["🎙️ Live Incident Room — Agora RTC"]
        U1["👤 Engineer"]
        U2["👤 Support Lead"]
        U3["👤 Duty Commander"]
    end

    U1 & U2 & U3 -->|joins voice channel| AGORA["Agora RTC Engine<br/>real-time audio transport"]
    AGORA -->|mic audio| STT["🗣️ Browser Speech-to-Text<br/>live transcription"]

    STT -->|"raw transcript chunk<br/>+ speaker + role"| API["⚙️ Express Backend<br/>/api/transcript"]

    API --> CLASSIFY["🧠 LLM Classification Engine<br/>Groq · Llama-based"]

    CLASSIFY -->|structured JSON| ROUTER{Type?}

    ROUTER -->|fact| FACTS[("📘 Fact Table")]
    ROUTER -->|hypothesis| HYPO[("💭 Hypotheses")]
    ROUTER -->|decision| DEC[("✅ Decisions")]
    ROUTER -->|action| ACT[("📋 Action Tracker<br/>owner · status · due")]
    ROUTER -->|conflict| CONF[("⚠️ Conflict Log")]

    CLASSIFY -->|"critical? + keyword scan"| CRITICAL{Severity Check}
    CRITICAL -->|yes| PROPOSE["🚨 AI proposes an action"]
    PROPOSE --> CONFIRM{{"Human Confirms?"}}
    CONFIRM -->|✅ yes| SLACK["📣 Slack Webhook<br/>real action fires"]
    CONFIRM -->|❌ no| DISCARD["discarded — no action taken"]

    FACTS & HYPO & DEC & ACT & CONF --> STATE["🗄️ Live Incident State<br/>in-memory store"]
    STATE -->|"socket.io push"| DASH["📊 React Dashboard<br/>Live Transcript · Timeline"]

    style ENTRY fill:#171B2B,stroke:#7C5CFC,stroke-width:2px,color:#fff
    style ROOM fill:#EBF0FE,stroke:#3B66E0,stroke-width:2px
    style CLASSIFY fill:#F1EEFE,stroke:#7C5CFC,stroke-width:2px
    style PROPOSE fill:#FBEAEA,stroke:#D14343,stroke-width:2px
    style CONFIRM fill:#FBF1DE,stroke:#C9860F,stroke-width:2px
    style SLACK fill:#E8F7F1,stroke:#1E9E6B,stroke-width:2px
    style DASH fill:#EBF0FE,stroke:#3B66E0,stroke-width:2px
```

---

## 🔄 The Human-in-the-Loop Guardrail

The one rule this whole system is built around: **the AI never acts alone on anything critical.**

```mermaid
sequenceDiagram
    participant Room as 🎙️ Incident Room
    participant AI as 🧠 SYNTRIX AI
    participant Dash as 📊 Dashboard
    participant Human as 🧑‍💼 Duty Commander
    participant Slack as 📣 Slack

    Room->>AI: "we have a full payment outage"
    AI->>AI: classify → fact + critical:true
    AI->>Dash: push live update (Timeline)
    AI->>Dash: propose action → "Page on-call engineer"
    Dash-->>Human: shows pending suggestion, waits
    Human->>Dash: clicks Confirm
    Dash->>Slack: fires webhook — real message posted
    Slack-->>Room: 🚨 team notified instantly

    Note over AI,Human: If the human ignores or rejects it,<br/>nothing happens. Ever.
```

---

## 🧩 What Each Layer Actually Does

<table>
<tr><td width="30%"><b>🚪 Entry Layer</b></td><td>

A glass-styled **join / create meeting** screen — create a room and get a shareable 6-digit code, or join an existing one with a code, before entering the live dashboard.

</td></tr>
<tr><td><b>🎙️ Voice Layer</b></td><td>

**Agora RTC** — every participant joins a real voice channel over Agora's infrastructure, with per-user tracks so the system always knows *who* is speaking, not just *what* was said.

</td></tr>
<tr><td><b>🧠 Intelligence Layer</b></td><td>

Every transcript chunk is sent to an LLM with a strict instruction: **classify, don't narrate.** It returns structured JSON — type, summary, owner, due date, and a severity flag — never free-form prose. This is what turns a wall of talk into a queryable state.

</td></tr>
<tr><td><b>🗄️ State Layer</b></td><td>

A live, continuously-updated incident record — facts, hypotheses, decisions, actions, conflicts, and a full timeline. This *is* the shared understanding the whole product exists to protect.

</td></tr>
<tr><td><b>🚦 Action Layer</b></td><td>

A strict **propose → human-confirm → execute** state machine. Nothing touches the outside world (Slack, tickets, pages) without a person explicitly saying yes.

</td></tr>
<tr><td><b>📊 Dashboard Layer</b></td><td>

A React command-center that every responder can watch live — a color-coded, real-time transcript feed, an animated voice orb showing SYNTRIX actively listening, and a full incident Timeline — all updating over Socket.io the instant something new is classified.

</td></tr>
</table>

---

## ✅ What's Real vs. What's Scoped Down

Being upfront about hackathon-scope tradeoffs, because a working honest prototype beats a fake polished one:

| Component | Status |
|---|---|
| Agora real-time voice room, joinable via shareable code | ✅ Fully live |
| LLM classification (facts/hypotheses/decisions/actions/conflicts) | ✅ Fully live |
| Live dashboard with Socket.io | ✅ Fully live |
| Human-confirm-before-action guardrail | ✅ Fully live |
| Slack integration | ✅ Fully live |
| Auto-proposal on detected severity | ✅ Fully live |
| Speech-to-text | ⚠️ Browser-native STT (not yet Agora's native Conversational AI STT engine) |
| **Agora Conversational AI Engine (native ASR→LLM→TTS)** | ✅ **Separately validated** via Agora's official Next.js quickstart — confirms direct engagement with Agora's managed voice AI pipeline, not just RTC transport |
| Jira / PagerDuty integration | 🔜 Stubbed — same architecture, swap the webhook |
| Multi-speaker simultaneous transcription | 🔜 Currently one active mic per client tab |

---

## 🛠️ Tech Stack

```
Voice          → Agora RTC (agora-rtc-sdk-ng)
Speech-to-Text → Web Speech API (browser-native)
AI Reasoning   → Groq (OpenAI-compatible, Llama-based)
Backend        → Node.js + Express + Socket.io
Frontend       → React + Vite
Integrations   → Slack Incoming Webhooks
Hosting        → Render (backend) · Vercel (frontend)
```

---

## 🚀 Running It Yourself

```bash
# clone
git clone https://github.com/shivamshukla02/incident-commander.git
cd incident-commander

# backend
cd backend
npm install
cp .env.example .env   # fill in your real keys
npm run dev

# frontend (new terminal)
cd frontend
npm install
npm run dev
```

You'll need free keys from:
- [console.agora.io](https://console.agora.io) — App ID + Certificate
- [console.groq.com](https://console.groq.com) — free-tier LLM access
- [api.slack.com/apps](https://api.slack.com/apps) — Incoming Webhook URL

---

## 👥 Team SYNTRIX

| Name | Role |
|---|---|
| Shivam Shukla | Backend & Systems |
| Arpit Singh Baghel | Frontend & Deployment |

---

<div align="center">

**SYNTRIX doesn't try to solve your incident. It makes sure your team never loses track of it.**

</div>
