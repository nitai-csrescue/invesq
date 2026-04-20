# CS Rescue — Product Overview & Demo Guide

A 5-minute orientation for someone who already gets the *idea* but hasn't clicked around yet.

---

## What it is

**CS Rescue** is a dark-mode enterprise web app that visualizes a company's **customer lifecycle architecture** — every business team, every supporting system, and every dependency between them — and overlays it with a **persona-aware AI Copilot** that turns the live graph + account data into a tailored demo briefing.

The premise: a customer's "lifecycle" is not a straight line from Sales → Onboarding → CSM → Support. It's a **mesh** — Support escalations feed renewal risk, Analytics feeds Pre-Sales ROI, Compliance gates Implementation. CS Rescue makes that mesh legible to whoever is looking at it.

---

## The mental model (3 layers)

| Layer | What it is | Where you see it |
|---|---|---|
| **Nodes** | Business teams (Pre-Sales, CSM, Support…) and capabilities (Decisioning, Analytics…) | Architecture page |
| **Edges** | Dependencies between nodes — labeled, typed, weighted, sometimes degraded | Architecture page |
| **Resources** | The actual *systems* in the customer's environment (CRM, Case Management, Document Store…) connected to those nodes | Resources page |

A **Persona** (VP / Sales / Post-Sales / CS / Support / Engineering) and a **View Mode** (Business / Dependency / Systems) sit on top of all three layers and re-color the same data for that audience.

---

## The 5 pages

1. **Architecture** — the graph itself. Switch persona and view mode in the top strip; the same nodes and edges re-style for that audience. Click a node for the inspector.
2. **Resources** — every system in the environment (CRM, ticketing, doc store, etc.) with status (`connected / degraded / disconnected / pending`) and which nodes it powers.
3. **Connectors** — the integration plumbing between resources.
4. **Deployments** — per-account rollout state: milestones, blockers (with severity + owner), health.
5. **AI Copilot** — the headline feature. Choose persona + account + goal → get a briefing grounded in the live graph and that account's deployment.

---

## Demo script (≈ 6 minutes)

### 1. Set the stage on Architecture (1 min)
- Open **Architecture**. Note the persona one-liner under the title — it changes with persona.
- Toggle persona from **VP** → **Engineering**. Same graph, different framing in the header and node chips.
- Point at a **degraded edge** (e.g. Deployment Intelligence → Decisioning). Tell them: *"this is a real signal, not decoration — the AI uses it."*

### 2. Show the mesh, not a line (1 min)
- Highlight the cross-functional edges: **Support → CSM** (escalations becoming renewal risk), **Analytics → Pre-Sales** (ROI proof points), **Compliance → Implementation** (gating).
- Switch View Mode **Business → Dependency → Systems**. Same nodes, three lenses.

### 3. Resources and ownership (45 sec)
- Open **Resources**. Note the small "resources are systems in your environment" line.
- Show a degraded resource and which nodes it touches.

### 4. The AI Copilot (3 min) — the money shot
- Open **AI Copilot**.
- **Persona:** Customer Success → **Account:** *Meridian Health Systems* (at-risk) → **Goal:** Renewal Risk Review → **Generate Briefing**.
- Walk through the output:
  - **Priorities / Risks / Opportunities** are bulleted, each with **source chips** (`Account`, `Deployment`, `Blocker`, `Edge`, `Node`, `Resource`, `Milestone`). These are receipts — every line is traceable to data on the other pages.
  - **Recommended Architecture Focus** lists the systems and owner teams to anchor on.
  - **Walkthrough** is a step-by-step demo flow with sources per step.
  - **Signals scanned** footer at the bottom shows how many of each signal type fed the output.
- Click **"Open in Architecture"** on the recommended focus → it deep-links to Architecture, drops a top-center "AI recommended" toast, and animates the suggested edges in purple.
- Now switch persona to **Engineering**, regenerate. **Same account, materially different briefing** — engineering-flavored systems/dependency language, different priorities. This is the persona-affinity boost in action.

### 5. The point (15 sec)
> *"Same data, six personas, three views, one Copilot that knows which signals matter to whom — and shows its work."*

---

## What to emphasize for each audience

| Audience | Lead with |
|---|---|
| **Sales / GTM leaders** | Persona switch on AI Copilot — "the demo writes itself for the room you're in." |
| **CS / Post-Sales** | Account-driven priorities + at-risk save plan + renewal signals from Support edges. |
| **Engineering** | Degraded edges, resource health, dependency view, source-chip traceability. |
| **VPs / Execs** | The mesh view (not a funnel), cross-functional risk paths, owner-team accountability. |

---

## Things that will earn questions — and the answers

- **"Is this LLM-generated?"** — The briefing engine is deterministic and runs on a signal-scoring model over real graph + account data. The output is reactive to the data, not hallucinated. The architecture is ready to swap in an LLM later, but the contract (signals → briefing items with sources) is already there.
- **"Where does the data come from?"** — A backing API server (`/api/...`) returns the graph, accounts, deployments, resources, and connectors. Easy to point at a real source.
- **"Resources vs Connectors?"** — Resources are the *systems* (CRM, Case Mgmt). Connectors are the *links between* them. The Resources page header now spells this out.

---

## One-line pitch
> *"A live, persona-aware map of how your customer lifecycle actually works — and an AI Copilot that turns it into the right briefing for whoever is in the room, with receipts."*
