import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen bg-background text-foreground flex overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col ml-16 lg:ml-64 min-w-0 transition-all duration-300">
        <Header />
        <main className="flex-1 relative overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}