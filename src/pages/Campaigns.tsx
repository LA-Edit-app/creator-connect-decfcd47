import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Filter, MoreVertical } from "lucide-react";
import { Input } from "@/components/ui/input";

const campaigns = [
  {
    id: 1,
    name: "Summer Collection Launch",
    creator: "Sarah Johnson",
    status: "active",
    budget: "$12,500",
    spent: "$8,200",
    startDate: "Jan 15, 2024",
    endDate: "Mar 15, 2024",
    platform: "Instagram",
  },
  {
    id: 2,
    name: "Tech Review Series",
    creator: "Mike Chen",
    status: "pending",
    budget: "$8,000",
    spent: "$0",
    startDate: "Feb 1, 2024",
    endDate: "Apr 1, 2024",
    platform: "YouTube",
  },
  {
    id: 3,
    name: "Fitness Challenge 2024",
    creator: "Emma Davis",
    status: "active",
    budget: "$15,000",
    spent: "$11,500",
    startDate: "Jan 1, 2024",
    endDate: "Feb 28, 2024",
    platform: "TikTok",
  },
  {
    id: 4,
    name: "Holiday Gift Guide",
    creator: "Alex Thompson",
    status: "completed",
    budget: "$10,000",
    spent: "$10,000",
    startDate: "Nov 15, 2023",
    endDate: "Dec 31, 2023",
    platform: "Instagram",
  },
  {
    id: 5,
    name: "Gaming Tournament",
    creator: "Chris Lee",
    status: "active",
    budget: "$20,000",
    spent: "$14,300",
    startDate: "Jan 10, 2024",
    endDate: "Mar 10, 2024",
    platform: "Twitch",
  },
  {
    id: 6,
    name: "Beauty Brand Collab",
    creator: "Jessica Park",
    status: "pending",
    budget: "$18,000",
    spent: "$0",
    startDate: "Feb 15, 2024",
    endDate: "May 15, 2024",
    platform: "YouTube",
  },
];

const statusStyles = {
  active: "bg-green-100 text-green-700 hover:bg-green-100",
  pending: "bg-amber-100 text-amber-700 hover:bg-amber-100",
  completed: "bg-slate-100 text-slate-700 hover:bg-slate-100",
};

const platformStyles = {
  Instagram: "bg-pink-100 text-pink-700",
  YouTube: "bg-red-100 text-red-700",
  TikTok: "bg-purple-100 text-purple-700",
  Twitch: "bg-violet-100 text-violet-700",
};

const Campaigns = () => {
  return (
    <DashboardLayout title="Campaigns">
      <div className="space-y-6 animate-fade-in">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-3">
            <div className="relative flex-1 sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search campaigns..." className="pl-9" />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="w-4 h-4" />
            </Button>
          </div>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            New Campaign
          </Button>
        </div>

        {/* Campaigns Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="bg-card rounded-xl border border-border p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    {campaign.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">{campaign.creator}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex gap-2 mb-4">
                <Badge
                  variant="secondary"
                  className={statusStyles[campaign.status as keyof typeof statusStyles]}
                >
                  {campaign.status}
                </Badge>
                <Badge
                  variant="secondary"
                  className={platformStyles[campaign.platform as keyof typeof platformStyles]}
                >
                  {campaign.platform}
                </Badge>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Budget</span>
                  <span className="font-medium text-foreground">{campaign.budget}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Spent</span>
                  <span className="font-medium text-foreground">{campaign.spent}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{
                      width: `${
                        (parseInt(campaign.spent.replace(/[^0-9]/g, "")) /
                          parseInt(campaign.budget.replace(/[^0-9]/g, ""))) *
                        100
                      }%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground pt-2">
                  <span>{campaign.startDate}</span>
                  <span>{campaign.endDate}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Campaigns;
