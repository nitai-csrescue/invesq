export type IntegrationCategory =
  | "CRM"
  | "Support"
  | "Product Analytics"
  | "Comms"
  | "Data Warehouse"
  | "Customer Success";
export type IntegrationStatus = "connected" | "mock" | "planned";

export interface Integration {
  id: string;
  name: string;
  category: IntegrationCategory;
  status: IntegrationStatus;
  contributesData: string[];
  whyItMatters: string;
  iconLetter: string;
  iconColor: string;
}

export const integrations: Integration[] = [
  {
    id: "int_salesforce",
    name: "Salesforce",
    category: "CRM",
    status: "connected",
    contributesData: ["Account ownership", "Renewal dates", "Opportunity stage", "Contact roles"],
    whyItMatters: "Salesforce is the system of record for accounts and renewals. INVESQ reads ownership and renewal data to route signals and actions.",
    iconLetter: "S",
    iconColor: "from-sky-500/30 to-blue-500/30 border-sky-400/40 text-sky-100",
  },
  {
    id: "int_hubspot",
    name: "HubSpot",
    category: "CRM",
    status: "mock",
    contributesData: ["Contacts", "Deals", "Email engagement"],
    whyItMatters: "Combines marketing + sales engagement signals into a single CS view.",
    iconLetter: "H",
    iconColor: "from-orange-500/30 to-amber-500/30 border-orange-400/40 text-orange-100",
  },
  {
    id: "int_zendesk",
    name: "Zendesk",
    category: "Support",
    status: "connected",
    contributesData: ["Tickets", "SLA breaches", "CSAT"],
    whyItMatters: "Support escalation signals (P1 unresolved, ticket spike) come straight from Zendesk.",
    iconLetter: "Z",
    iconColor: "from-emerald-500/30 to-green-500/30 border-emerald-400/40 text-emerald-100",
  },
  {
    id: "int_intercom",
    name: "Intercom",
    category: "Support",
    status: "mock",
    contributesData: ["Conversations", "NPS", "In-app messages"],
    whyItMatters: "In-app conversations are an early signal of friction, not just a support channel.",
    iconLetter: "I",
    iconColor: "from-indigo-500/30 to-violet-500/30 border-indigo-400/40 text-indigo-100",
  },
  {
    id: "int_gainsight",
    name: "Gainsight",
    category: "Customer Success",
    status: "planned",
    contributesData: ["Health scores", "Playbook history", "Touchpoints"],
    whyItMatters: "Migrate health/touchpoint history when customers replace Gainsight with INVESQ.",
    iconLetter: "G",
    iconColor: "from-fuchsia-500/30 to-pink-500/30 border-fuchsia-400/40 text-fuchsia-100",
  },
  {
    id: "int_slack",
    name: "Slack",
    category: "Comms",
    status: "connected",
    contributesData: ["Account channel activity", "Internal mentions"],
    whyItMatters: "INVESQ posts at-risk alerts and expansion briefings into the right team channels.",
    iconLetter: "S",
    iconColor: "from-purple-500/30 to-fuchsia-500/30 border-purple-400/40 text-purple-100",
  },
  {
    id: "int_snowflake",
    name: "Snowflake",
    category: "Data Warehouse",
    status: "mock",
    contributesData: ["Modeled customer 360 tables", "Usage marts"],
    whyItMatters: "When customers have a warehouse-first stack, INVESQ can read directly from modeled tables.",
    iconLetter: "S",
    iconColor: "from-cyan-500/30 to-sky-500/30 border-cyan-400/40 text-cyan-100",
  },
  {
    id: "int_segment",
    name: "Segment",
    category: "Product Analytics",
    status: "connected",
    contributesData: ["Page views", "Feature events", "User identification"],
    whyItMatters: "Product signals (usage cliff, shallow adoption, seat utilization) are powered by event streams.",
    iconLetter: "S",
    iconColor: "from-emerald-500/30 to-teal-500/30 border-emerald-400/40 text-emerald-100",
  },
  {
    id: "int_amplitude",
    name: "Amplitude",
    category: "Product Analytics",
    status: "mock",
    contributesData: ["Cohort behavior", "Funnel completion"],
    whyItMatters: "Behavioral cohorts let INVESQ benchmark each account against peers.",
    iconLetter: "A",
    iconColor: "from-blue-500/30 to-indigo-500/30 border-blue-400/40 text-blue-100",
  },
];
