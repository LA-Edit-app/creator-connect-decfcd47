import { Creator } from "@/data/campaignTrackerData";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Instagram, Youtube } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useState } from "react";

interface CreatorSelectorProps {
  creators: Creator[];
  onSelect: (creator: Creator) => void;
}

const getPlatformIcon = (platform: string) => {
  switch (platform.toLowerCase()) {
    case "instagram":
      return <Instagram className="w-3.5 h-3.5" />;
    case "youtube":
      return <Youtube className="w-3.5 h-3.5" />;
    case "tiktok":
      return (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
        </svg>
      );
    default:
      return null;
  }
};

export const CreatorSelector = ({ creators, onSelect }: CreatorSelectorProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCreators = creators.filter(
    (creator) =>
      creator.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      creator.handle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Select a Creator</h2>
        <p className="text-muted-foreground">
          Choose a creator to view and manage their campaign information
        </p>
      </div>

      <div className="relative max-w-md mx-auto">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search creators..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredCreators.map((creator) => (
          <Card
            key={creator.id}
            className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary/50 hover:-translate-y-1 bg-card group"
            onClick={() => onSelect(creator)}
          >
            <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
              <Avatar className="w-20 h-20 ring-2 ring-border group-hover:ring-primary/50 transition-all">
                <AvatarImage src={creator.avatar} alt={creator.name} />
                <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                  {creator.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <h3 className="font-semibold text-foreground">{creator.name}</h3>
                <p className="text-sm text-muted-foreground">{creator.handle}</p>
              </div>
              <div className="flex gap-2">
                {creator.platforms.map((platform) => (
                  <Badge
                    key={platform}
                    variant="secondary"
                    className="flex items-center gap-1 text-xs"
                  >
                    {getPlatformIcon(platform)}
                    {platform}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCreators.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No creators found matching "{searchQuery}"
        </div>
      )}
    </div>
  );
};
