import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <Sidebar />
      <div className="flex-1 flex flex-col ml-16 lg:ml-64 min-w-0 transition-all duration-300">
        <Header />
        <main className="flex-1 p-6 relative overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}