export interface TeamMember {
  id: string;
  name: string;
  initials: string;
  role: string;
  email: string;
  region: string;
}

export const team: TeamMember[] = [
  { id: "u_alex", name: "Alex Morgan", initials: "AM", role: "Head of CS", email: "alex@csrescue.io", region: "Americas" },
  { id: "u_priya", name: "Priya Shah", initials: "PS", role: "Senior CSM", email: "priya@csrescue.io", region: "Americas" },
  { id: "u_kenji", name: "Kenji Tanaka", initials: "KT", role: "CSM", email: "kenji@csrescue.io", region: "APAC" },
  { id: "u_lena", name: "Lena Brandt", initials: "LB", role: "CSM", email: "lena@csrescue.io", region: "EMEA" },
  { id: "u_jordan", name: "Jordan Rivera", initials: "JR", role: "Onboarding Lead", email: "jordan@csrescue.io", region: "Americas" },
  { id: "u_sam", name: "Sam Olin", initials: "SO", role: "Renewals Manager", email: "sam@csrescue.io", region: "Americas" },
  { id: "u_maya", name: "Maya Chen", initials: "MC", role: "Solutions Architect", email: "maya@csrescue.io", region: "Americas" },
];

export function getTeamMember(id: string): TeamMember | undefined {
  return team.find((t) => t.id === id);
}
