import { useState } from "react";
import { PageHeader } from "@/components/cs/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { team } from "@/data";
import { LS_COMPLETED as TOUR_LS_COMPLETED } from "@/components/cs/DemoTour";

export default function Settings() {
  const [risk, setRisk] = useState([50]);
  const [healthy, setHealthy] = useState([75]);
  const { toast } = useToast();

  return (
    <div className="p-6 max-w-[1200px] mx-auto" data-testid="settings-page">
      <PageHeader eyebrow="Workspace" title="Settings" subtitle="Workspace, team, scoring, AI, and notification preferences." />

      <Tabs defaultValue="workspace" orientation="vertical" className="flex flex-col md:flex-row gap-6">
        <TabsList className="bg-slate-900/60 md:flex-col h-fit md:h-auto p-2 md:w-52 shrink-0">
          <TabsTrigger value="workspace" className="md:w-full md:justify-start">Workspace</TabsTrigger>
          <TabsTrigger value="team" className="md:w-full md:justify-start">Team</TabsTrigger>
          <TabsTrigger value="scoring" className="md:w-full md:justify-start">Scoring thresholds</TabsTrigger>
          <TabsTrigger value="ai" className="md:w-full md:justify-start">AI preferences</TabsTrigger>
          <TabsTrigger value="notifications" className="md:w-full md:justify-start">Notifications</TabsTrigger>
        </TabsList>

        <div className="flex-1 min-w-0">
          <TabsContent value="workspace" className="space-y-4">
            <Section title="Workspace details">
              <Field label="Workspace name"><Input defaultValue="Acme Inc." /></Field>
              <Field label="Default region"><Input defaultValue="Americas" /></Field>
              <Field label="Plan"><Input defaultValue="Enterprise" disabled /></Field>
            </Section>
            <Section title="Demo tour">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-white">Reset demo tour</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Clears the saved completion flag so the guided tour will start fresh on the Dashboard.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="reset-tour-btn"
                  onClick={() => {
                    try {
                      window.localStorage.removeItem(TOUR_LS_COMPLETED);
                    } catch {}
                    toast({ title: "Demo tour reset", description: "The guided tour will run again next time you trigger it." });
                  }}
                >
                  Reset demo tour
                </Button>
              </div>
            </Section>
            <SaveBar onSave={() => toast({ title: "Workspace saved" })} />
          </TabsContent>

          <TabsContent value="team" className="space-y-3">
            <Section title="Team members">
              {team.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500/30 to-indigo-500/30 border border-white/10 flex items-center justify-center text-xs font-bold text-cyan-100">
                      {t.initials}
                    </div>
                    <div>
                      <p className="text-sm text-white font-medium">{t.name}</p>
                      <p className="text-[11px] text-slate-500">{t.role} · {t.region}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{t.email}</Badge>
                </div>
              ))}
            </Section>
          </TabsContent>

          <TabsContent value="scoring" className="space-y-4">
            <Section title="Health score thresholds">
              <div>
                <div className="flex justify-between mb-2"><Label>At-risk threshold</Label><Badge variant="outline">{risk[0]}</Badge></div>
                <Slider value={risk} onValueChange={setRisk} min={20} max={70} step={5} />
                <p className="text-[11px] text-slate-500 mt-1">Accounts below {risk[0]} are tagged at-risk.</p>
              </div>
              <div>
                <div className="flex justify-between mb-2"><Label>Healthy threshold</Label><Badge variant="outline">{healthy[0]}</Badge></div>
                <Slider value={healthy} onValueChange={setHealthy} min={60} max={95} step={5} />
                <p className="text-[11px] text-slate-500 mt-1">Accounts at or above {healthy[0]} are tagged healthy.</p>
              </div>
            </Section>
            <SaveBar onSave={() => toast({ title: "Thresholds saved" })} />
          </TabsContent>

          <TabsContent value="ai" className="space-y-4">
            <Section title="AI Copilot">
              <ToggleRow label="Auto-generate briefings on landing" hint="Generate the default briefing automatically when AI Copilot opens." defaultChecked />
              <ToggleRow label="Surface expansion plays in briefings" hint="Include expansion-thesis section in customer briefings." defaultChecked />
              <ToggleRow label="Use peer benchmarks" hint="Compare each account against segment peers." defaultChecked />
            </Section>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <Section title="Channels">
              <ToggleRow label="Slack — at-risk alerts" hint="Post to #cs-pipeline when an account drops into at-risk." defaultChecked />
              <ToggleRow label="Slack — expansion alerts" hint="Post to #cs-pipeline when an expansion signal fires." defaultChecked />
              <ToggleRow label="Email — daily digest" hint="One email per day summarizing queue." />
              <ToggleRow label="Email — weekly executive summary" hint="Sent every Monday at 7am." defaultChecked />
            </Section>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/40 p-5">
      <p className="text-sm font-semibold text-white mb-4">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-slate-400">{label}</Label>
      {children}
    </div>
  );
}

function ToggleRow({ label, hint, defaultChecked }: { label: string; hint: string; defaultChecked?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-white/5 last:border-0">
      <div>
        <p className="text-sm text-white">{label}</p>
        <p className="text-[11px] text-slate-500 mt-0.5">{hint}</p>
      </div>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}

function SaveBar({ onSave }: { onSave: () => void }) {
  return (
    <div className="flex justify-end">
      <Button onClick={onSave} className="bg-cyan-500 hover:bg-cyan-400 text-slate-950">Save changes</Button>
    </div>
  );
}
