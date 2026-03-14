import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Users, ClipboardList } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useCreators } from "@/hooks/useCreators";
import { useCampaigns } from "@/hooks/useCampaigns";

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { data: creators = [] } = useCreators(true);
  const { data: campaigns = [] } = useCampaigns();

  const q = query.trim().toLowerCase();

  const matchedCreators = q
    ? creators.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.handle.toLowerCase().includes(q)
      ).slice(0, 4)
    : [];

  const matchedCampaigns = q
    ? campaigns.filter(
        (c) =>
          c.brand.toLowerCase().includes(q) ||
          (c.activity ?? "").toLowerCase().includes(q)
      ).slice(0, 4)
    : [];

  const results: Array<{ type: "creator" | "campaign"; id: string; label: string; sub: string }> = [
    ...matchedCreators.map((c) => ({
      type: "creator" as const,
      id: c.id,
      label: c.name,
      sub: `${c.handle}`,
    })),
    ...matchedCampaigns.map((c) => ({
      type: "campaign" as const,
      id: c.id,
      label: c.brand,
      sub: c.activity ?? "",
    })),
  ];

  const isOpen = open && q.length > 0;

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelect = (result: (typeof results)[number]) => {
    setOpen(false);
    setQuery("");
    if (result.type === "creator") {
      navigate("/creators");
    } else {
      navigate("/campaign-tracker", { state: { highlightCampaignId: result.id } });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[activeIndex]) handleSelect(results[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <Input
        placeholder="Search..."
        className="pl-9 w-64 bg-background"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
      />

      {isOpen && (
        <div className="absolute top-full mt-1 left-0 w-80 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">No results for "{query}"</p>
          ) : (
            <ul>
              {matchedCreators.length > 0 && (
                <li className="px-3 pt-2 pb-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3 h-3" /> Creators
                  </span>
                </li>
              )}
              {matchedCreators.map((c, i) => {
                const idx = i;
                return (
                  <li key={c.id}>
                    <button
                      className={`w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-accent transition-colors ${activeIndex === idx ? "bg-accent" : ""}`}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelect({ type: "creator", id: c.id, label: c.name, sub: c.handle })}
                    >
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary flex-shrink-0">
                        {c.name[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground truncate">@{c.handle}</p>
                      </div>
                    </button>
                  </li>
                );
              })}

              {matchedCampaigns.length > 0 && (
                <li className={`px-3 pb-1 ${matchedCreators.length > 0 ? "pt-2 border-t border-border mt-1" : "pt-2"}`}>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <ClipboardList className="w-3 h-3" /> Campaigns
                  </span>
                </li>
              )}
              {matchedCampaigns.map((c, i) => {
                const idx = matchedCreators.length + i;
                return (
                  <li key={c.id}>
                    <button
                      className={`w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-accent transition-colors ${activeIndex === idx ? "bg-accent" : ""}`}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelect({ type: "campaign", id: c.id, label: c.brand, sub: c.activity ?? "" })}
                    >
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary flex-shrink-0">
                        {c.brand[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{c.brand}</p>
                        {c.activity && <p className="text-xs text-muted-foreground truncate">{c.activity}</p>}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
