export type ActionStatus = "queued" | "in-progress" | "completed";
export type ActionSource = "ai" | "playbook" | "manual";

export interface ActionItem {
  id: string;
  title: string;
  accountId?: string;
  ownerId: string;
  source: ActionSource;
  status: ActionStatus;
  dueDate: string;
  playbookId?: string;
  signalId?: string;
  context?: string;
}

const today = new Date("2026-04-22");
function days(d: number) {
  const dt = new Date(today);
  dt.setDate(dt.getDate() + d);
  return dt.toISOString().slice(0, 10);
}

export const actions: ActionItem[] = [
  // QUEUED — flagship at-risk surface
  {
    id: "act_wayne_exec",
    title: "Schedule executive check-in with Wayne Enterprises CTO",
    accountId: "a_wayne",
    ownerId: "u_alex",
    source: "ai",
    status: "queued",
    dueDate: days(2),
    playbookId: "pb_executive_checkin",
    signalId: "sig_usage_drop",
    context: "Usage cliff + new exec sponsor — escalate before renewal review.",
  },
  {
    id: "act_wayne_p1",
    title: "Resolve Wayne P1 #4821 — daily stand-up until closed",
    accountId: "a_wayne",
    ownerId: "u_maya",
    source: "ai",
    status: "queued",
    dueDate: days(1),
    signalId: "sig_p1_unresolved",
    context: "P1 ticket open 9 days — CS+Eng joint daily stand-up.",
  },
  {
    id: "act_umbrella_save",
    title: "Activate Renewal Defense playbook for Umbrella Co.",
    accountId: "a_umbrella",
    ownerId: "u_sam",
    source: "ai",
    status: "queued",
    dueDate: days(0),
    playbookId: "pb_renewal_defense",
    signalId: "sig_procurement_signal",
    context: "Procurement engaged + renewal in 21 days. High urgency.",
  },
  {
    id: "act_soylent_save",
    title: "Identify new champion at Soylent Corp",
    accountId: "a_soylent",
    ownerId: "u_kenji",
    source: "ai",
    status: "queued",
    dueDate: days(3),
    playbookId: "pb_champion_id",
    signalId: "sig_champion_left",
  },
  {
    id: "act_cyberdyne_health",
    title: "Run Health Recovery diagnostic for Cyberdyne",
    accountId: "a_cyberdyne",
    ownerId: "u_alex",
    source: "ai",
    status: "queued",
    dueDate: days(5),
    playbookId: "pb_health_recovery",
    signalId: "sig_ticket_volume_spike",
  },
  {
    id: "act_ingen_onboard",
    title: "Re-onboard InGen — 3/8 milestones complete after 90 days",
    accountId: "a_ingen",
    ownerId: "u_jordan",
    source: "playbook",
    status: "queued",
    dueDate: days(2),
    playbookId: "pb_reonboard",
    signalId: "sig_onboarding_stall",
  },
  {
    id: "act_acme_adopt",
    title: "Schedule adoption workshop with Acme Corp ops team",
    accountId: "a_acme",
    ownerId: "u_kenji",
    source: "playbook",
    status: "queued",
    dueDate: days(7),
    playbookId: "pb_adoption_workshop",
    signalId: "sig_shallow_adoption",
  },
  {
    id: "act_vandelay_unblock",
    title: "Unblock Vandelay integration ticket — 30 days stalled",
    accountId: "a_vandelay",
    ownerId: "u_lena",
    source: "manual",
    status: "queued",
    dueDate: days(4),
  },

  // EXPANSION QUEUE
  {
    id: "act_stark_expand",
    title: "Build expansion plan for Stark Industries — SSO + 200 seats",
    accountId: "a_stark",
    ownerId: "u_priya",
    source: "ai",
    status: "queued",
    dueDate: days(7),
    playbookId: "pb_expansion",
    signalId: "sig_seat_expansion",
    context: "Seat utilization 91% + SSO add-on requested.",
  },
  {
    id: "act_hooli_expand",
    title: "Joint CS+AE brief for Hooli analytics POC",
    accountId: "a_hooli",
    ownerId: "u_priya",
    source: "ai",
    status: "queued",
    dueDate: days(3),
    playbookId: "pb_expansion",
    signalId: "sig_module_pilot",
  },
  {
    id: "act_tyrell_expand",
    title: "Renewal kickoff with Tyrell — surface 25% expansion",
    accountId: "a_tyrell",
    ownerId: "u_priya",
    source: "playbook",
    status: "queued",
    dueDate: days(5),
    playbookId: "pb_qbr",
  },
  {
    id: "act_pp_expand",
    title: "Send seat-pack pricing to Pied Piper",
    accountId: "a_pied_piper",
    ownerId: "u_jordan",
    source: "ai",
    status: "queued",
    dueDate: days(2),
    playbookId: "pb_expansion",
    signalId: "sig_seat_expansion",
  },
  {
    id: "act_aperture_pricing",
    title: "Tier-upgrade pricing conversation with Aperture Labs",
    accountId: "a_aperture",
    ownerId: "u_kenji",
    source: "manual",
    status: "queued",
    dueDate: days(6),
  },

  // IN PROGRESS
  {
    id: "act_massive_expand",
    title: "Roadmap session follow-up: 3 use cases for Massive Dynamic",
    accountId: "a_massive",
    ownerId: "u_priya",
    source: "playbook",
    status: "in-progress",
    dueDate: days(4),
    playbookId: "pb_expansion",
  },
  {
    id: "act_globex_check",
    title: "Quarterly check-in with Globex Logistics",
    accountId: "a_globex",
    ownerId: "u_lena",
    source: "playbook",
    status: "in-progress",
    dueDate: days(8),
    playbookId: "pb_qbr",
  },
  {
    id: "act_nakatomi_security",
    title: "Compliance walkthrough with Nakatomi security team",
    accountId: "a_nakatomi",
    ownerId: "u_sam",
    source: "manual",
    status: "in-progress",
    dueDate: days(3),
  },

  // COMPLETED
  {
    id: "act_done_initech_review",
    title: "Initech adoption milestone review — completed",
    accountId: "a_initech",
    ownerId: "u_lena",
    source: "playbook",
    status: "completed",
    dueDate: days(-3),
    playbookId: "pb_onboarding_fast",
  },
  {
    id: "act_done_blackmesa_qbr",
    title: "Black Mesa QBR delivered",
    accountId: "a_blackmesa",
    ownerId: "u_alex",
    source: "playbook",
    status: "completed",
    dueDate: days(-5),
    playbookId: "pb_qbr",
  },
  {
    id: "act_done_sterling_kickoff",
    title: "Sterling Cooper onboarding kickoff",
    accountId: "a_sterling",
    ownerId: "u_jordan",
    source: "playbook",
    status: "completed",
    dueDate: days(-9),
    playbookId: "pb_onboarding_fast",
  },
];

export function getAction(id: string) {
  return actions.find((a) => a.id === id);
}
