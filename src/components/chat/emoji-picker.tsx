"use client";

import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

const EMOJI_CATEGORIES: Record<string, string[]> = {
  "Smileys": ["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","😉","😊","😇","🥰","😍","🤩","😘","😗","😚","😙","🥲","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","😐","😑","😶","😏","😒","🙄","😬","🤥","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🥵","🥶","🥴","😵","🤯","🤠","🥳","🥸","😎","🤓","🧐"],
  "Gestures": ["👍","👎","👊","✊","🤛","🤜","👏","🙌","👐","🤲","🤝","🙏","✌️","🤞","🤟","🤘","👌","🤌","🤏","👈","👉","👆","👇","☝️","✋","🤚","🖐","🖖","👋","🤙","💪","🦾"],
  "Hearts": ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟"],
  "Objects": ["🔥","⭐","🌟","💫","✨","⚡","💥","💯","🎉","🎊","🏆","🥇","🎯","📌","📎","🔗","💡","🔔","📣","💬","💭","🗨","🕐","⏰","📅","📎","🔑","🔒"],
  "Work": ["✅","❌","⚠️","📋","📊","📈","📉","📁","📂","📝","✏️","📐","📏","🗂","🗃","📦","🏠","🏢","🔧","🔨","🪛","🔩","⚙️","🪜","🧰"],
  "Nature": ["🌈","☀️","🌤","⛅","🌥","☁️","🌧","⛈","🌩","🌪","❄️","☃️","⛄","🌊","🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁"],
};

export function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Smileys");

  const filteredEmojis = useMemo(() => {
    if (!search) return EMOJI_CATEGORIES[activeCategory] || [];
    const all = Object.values(EMOJI_CATEGORIES).flat();
    return all;
  }, [search, activeCategory]);

  return (
    <div className="w-72 bg-surface border border-border-medium rounded-xl shadow-2xl shadow-black/50 overflow-hidden">
      {/* Search */}
      <div className="p-2 border-b border-border-subtle">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
          <input
            type="text"
            placeholder="Search emoji..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            className="w-full pl-8 pr-3 py-1.5 bg-surface-hover border border-border-subtle rounded-lg text-xs focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2"
            >
              <X className="h-3 w-3 text-text-muted" />
            </button>
          )}
        </div>
      </div>

      {/* Category tabs */}
      {!search && (
        <div className="flex gap-0.5 px-2 py-1.5 border-b border-border-subtle overflow-x-auto">
          {Object.keys(EMOJI_CATEGORIES).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-2 py-1 text-[10px] rounded-md whitespace-nowrap transition-colors",
                activeCategory === cat
                  ? "bg-cyan-500/10 text-cyan-400"
                  : "text-text-muted hover:bg-surface-hover"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Emoji grid */}
      <div className="p-2 max-h-48 overflow-y-auto">
        <div className="grid grid-cols-8 gap-0.5">
          {filteredEmojis.map((emoji, i) => (
            <button
              key={`${emoji}-${i}`}
              onClick={() => {
                onSelect(emoji);
                onClose();
              }}
              className="p-1.5 text-lg hover:bg-surface-hover rounded-md transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
