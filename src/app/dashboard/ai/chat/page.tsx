"use client";

import { AIChat } from "@/components/ai-chat";
import { Card } from "@/components/ui";
import { Sparkles } from "lucide-react";

export default function AIChatPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          <Sparkles className="inline h-6 w-6 mr-2 text-cyan-400" />
          AI Assistant
        </h1>
        <p className="text-text-muted mt-1">
          Ask anything about your work orders, properties, contractors, or business
          performance. The AI has full context of your data.
        </p>
      </div>

      <Card padding={false} className="h-[calc(100vh-12rem)]">
        <AIChat
          embedded
          context={{ type: "general" }}
          className="h-full"
        />
      </Card>
    </div>
  );
}
