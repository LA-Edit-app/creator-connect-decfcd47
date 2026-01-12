import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Filter, Instagram, Youtube, Twitter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const creators = [
  {
    id: 1,
    name: "Sarah Johnson",
    email: "sarah@example.com",
    category: "Fashion",
    followers: "1.2M",
    engagement: "4.2%",
    campaigns: 8,
    status: "active",
    platforms: ["instagram", "youtube"],
  },
  {
    id: 2,
    name: "Mike Chen",
    email: "mike@example.com",
    category: "Tech",
    followers: "850K",
    engagement: "3.8%",
    campaigns: 5,
    status: "active",
    platforms: ["youtube", "twitter"],
  },
  {
    id: 3,
    name: "Emma Davis",
    email: "emma@example.com",
    category: "Fitness",
    followers: "2.1M",
    engagement: "5.1%",
    campaigns: 12,
    status: "active",
    platforms: ["instagram", "youtube"],
  },
  {
    id: 4,
    name: "Alex Thompson",
    email: "alex@example.com",
    category: "Lifestyle",
    followers: "680K",
    engagement: "4.7%",
    campaigns: 6,
    status: "inactive",
    platforms: ["instagram"],
  },
  {
    id: 5,
    name: "Chris Lee",
    email: "chris@example.com",
    category: "Gaming",
    followers: "3.5M",
    engagement: "6.2%",
    campaigns: 15,
    status: "active",
    platforms: ["youtube", "twitter"],
  },
  {
    id: 6,
    name: "Jessica Park",
    email: "jessica@example.com",
    category: "Beauty",
    followers: "1.8M",
    engagement: "4.9%",
    campaigns: 10,
    status: "active",
    platforms: ["instagram", "youtube"],
  },
];

const platformIcons = {
  instagram: Instagram,
  youtube: Youtube,
  twitter: Twitter,
};

const categoryColors: Record<string, string> = {
  Fashion: "bg-pink-100 text-pink-700",
  Tech: "bg-blue-100 text-blue-700",
  Fitness: "bg-green-100 text-green-700",
  Lifestyle: "bg-purple-100 text-purple-700",
  Gaming: "bg-violet-100 text-violet-700",
  Beauty: "bg-rose-100 text-rose-700",
};

const Creators = () => {
  return (
    <DashboardLayout title="Creators">
      <div className="space-y-6 animate-fade-in">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-3">
            <div className="relative flex-1 sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search creators..." className="pl-9" />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="w-4 h-4" />
            </Button>
          </div>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Add Creator
          </Button>
        </div>

        {/* Creators Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">
                    Creator
                  </th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">
                    Category
                  </th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">
                    Followers
                  </th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">
                    Engagement
                  </th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">
                    Campaigns
                  </th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">
                    Platforms
                  </th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {creators.map((creator) => (
                  <tr
                    key={creator.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {creator.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">{creator.name}</p>
                          <p className="text-sm text-muted-foreground">{creator.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <Badge variant="secondary" className={categoryColors[creator.category]}>
                        {creator.category}
                      </Badge>
                    </td>
                    <td className="py-4 px-6 font-medium text-foreground">
                      {creator.followers}
                    </td>
                    <td className="py-4 px-6 text-foreground">{creator.engagement}</td>
                    <td className="py-4 px-6 text-foreground">{creator.campaigns}</td>
                    <td className="py-4 px-6">
                      <div className="flex gap-2">
                        {creator.platforms.map((platform) => {
                          const Icon = platformIcons[platform as keyof typeof platformIcons];
                          return (
                            <Icon
                              key={platform}
                              className="w-4 h-4 text-muted-foreground"
                            />
                          );
                        })}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <Badge
                        variant="secondary"
                        className={
                          creator.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-700"
                        }
                      >
                        {creator.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Creators;
