import { Badge } from "@/components/ui/badge";

const campaigns = [
  {
    id: 1,
    name: "Summer Collection Launch",
    creator: "Sarah Johnson",
    status: "active",
    budget: "$12,500",
    engagement: "4.2%",
  },
  {
    id: 2,
    name: "Tech Review Series",
    creator: "Mike Chen",
    status: "pending",
    budget: "$8,000",
    engagement: "3.8%",
  },
  {
    id: 3,
    name: "Fitness Challenge 2024",
    creator: "Emma Davis",
    status: "active",
    budget: "$15,000",
    engagement: "5.1%",
  },
  {
    id: 4,
    name: "Holiday Gift Guide",
    creator: "Alex Thompson",
    status: "completed",
    budget: "$10,000",
    engagement: "4.7%",
  },
  {
    id: 5,
    name: "Gaming Tournament",
    creator: "Chris Lee",
    status: "active",
    budget: "$20,000",
    engagement: "6.2%",
  },
];

const statusStyles = {
  active: "bg-green-100 text-green-700 hover:bg-green-100",
  pending: "bg-amber-100 text-amber-700 hover:bg-amber-100",
  completed: "bg-slate-100 text-slate-700 hover:bg-slate-100",
};

export function RecentCampaigns() {
  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Recent Campaigns</h3>
        <a href="/campaigns" className="text-sm text-primary hover:underline">
          View all
        </a>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                Campaign
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                Creator
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                Status
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                Budget
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                Engagement
              </th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((campaign) => (
              <tr
                key={campaign.id}
                className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
              >
                <td className="py-3 px-4">
                  <span className="font-medium text-foreground">{campaign.name}</span>
                </td>
                <td className="py-3 px-4 text-muted-foreground">{campaign.creator}</td>
                <td className="py-3 px-4">
                  <Badge
                    variant="secondary"
                    className={statusStyles[campaign.status as keyof typeof statusStyles]}
                  >
                    {campaign.status}
                  </Badge>
                </td>
                <td className="py-3 px-4 text-foreground">{campaign.budget}</td>
                <td className="py-3 px-4 text-foreground">{campaign.engagement}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
