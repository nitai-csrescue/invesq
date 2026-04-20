import { Link, useLocation } from "wouter";
import { 
  Network, 
  Database, 
  Rocket, 
  Link as LinkIcon,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", icon: Network, label: "Architecture" },
  { href: "/ai-copilot", icon: Sparkles, label: "AI Copilot" },
  { href: "/resources", icon: Database, label: "Resources" },
  { href: "/deployments", icon: Rocket, label: "Deployments" },
  { href: "/connectors", icon: LinkIcon, label: "Connectors" },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-16 lg:w-64 h-screen flex flex-col border-r border-border bg-card/50 backdrop-blur-sm fixed top-0 left-0 z-40 transition-all duration-300">
      <div className="h-16 flex items-center justify-center lg:justify-start lg:px-6 border-b border-border">
        <Network className="h-8 w-8 text-primary" />
        <span className="hidden lg:block ml-3 font-bold text-lg tracking-tight">CS Rescue</span>
      </div>
      <nav className="flex-1 py-6 flex flex-col gap-2 px-3">
        {navItems.map((item) => {
          const active = location === item.href;
          return (
            <Link key={item.href} href={item.href} className={cn(
              "flex items-center gap-3 px-3 py-3 rounded-md transition-all duration-200 group relative",
              active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
            )} data-testid={`nav-${item.label.toLowerCase()}`}>
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
              )}
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="hidden lg:block font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}