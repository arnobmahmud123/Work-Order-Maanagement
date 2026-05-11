"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { AIChat } from "@/components/ai-chat";
import { useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { sidebarCollapsed } = useAppStore();

  return (
    <div className="flex min-h-screen bg-background text-text-primary" data-dashboard>
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        data-sidebar="mobile"
        className={cn(
          "fixed inset-y-0 left-0 z-[70] w-72 bg-background transform transition-transform duration-300 ease-in-out lg:hidden border-r border-border-subtle",
          sidebarOpen ? "translate-x-0 shadow-2xl shadow-black" : "-translate-x-full"
        )}
      >
        <Sidebar />
      </div>

      {/* Desktop Sidebar */}
      <div
        data-sidebar="desktop"
        className={cn(
          "hidden lg:block transition-all duration-300 ease-in-out flex-shrink-0 z-50",
          sidebarCollapsed ? "w-20" : "w-64"
        )}
      >
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative h-screen overflow-hidden">
        {/* Advanced Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          {/* Subtle Grid Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20" />
          
          {/* Dynamic Light Orbs */}
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[50%] rounded-full bg-cyan-500/10 blur-[140px] animate-glow" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/5 blur-[140px] animate-glow" style={{ animationDelay: '1s' }} />
          
          {/* Edge Glows */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent opacity-50" />
        </div>

        {/* Top Header */}
        <TopNav onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        
        {/* Content Container */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 relative z-10 scrollbar-thin scrollbar-thumb-white/[0.08] scrollbar-track-transparent">
          <div className="max-w-[1600px] mx-auto animate-slide-up">
            {children}
          </div>
        </main>
      </div>

      {/* Floating AI Chat Overlay */}
      <AIChat context={{ type: "general" }} />
    </div>
  );
}
