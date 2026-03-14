import { Badge } from "@/components/ui/badge";
import { useRecentCampaigns } from "@/hooks/useCampaigns";

const statusStyles = {
  active: "bg-green-100 text-green-700 hover:bg-green-100",
  pending: "bg-amber-100 text-amber-700 hover:bg-amber-100",
  completed: "bg-slate-100 text-slate-700 hover:bg-slate-100",
  awaiting_details: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
};

export function RecentCampaigns() {
  const { data: campaigns = [], isLoading, error } = useRecentCampaigns(5);

  const getStatus = (campaign: {
    complete: boolean;
    campaign_status: string;
    completion_status: string | null;
    live_date: string | null;
    launch_date: string | null;
  }) => {
    if (campaign.completion_status === "awaiting_details") return "awaiting_details" as const;
    if (campaign.campaign_status === "completed") return "completed" as const;
    if (campaign.campaign_status === "active") return "active" as const;
    if (campaign.campaign_status === "pending") return "pending" as const;
    if (campaign.complete) return "completed" as const;
    if (campaign.live_date) return "active" as const;
    if (campaign.launch_date) return "pending" as const;
    return "pending" as const;
  };

  const getStatusLabel = (status: keyof typeof statusStyles) => {
    if (status === "awaiting_details") return "AWAITING DETAILS";
    return status;
  };

  const formatBudget = (value: number | null, currency: string) => {
    if (!value) return "-";
    const symbol = currency === "GBP" ? "£" : `${currency} `;
    return `${symbol}${value.toLocaleString()}`;
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold tracking-tight text-foreground">Recent Campaigns</h3>
        <a href="/campaign-tracker" className="text-sm text-primary hover:underline">
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
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={4} className="py-6 px-4 text-center text-muted-foreground">
                  Loading campaigns...
                </td>
              </tr>
            )}

            {!isLoading && error && (
              <tr>
                <td colSpan={4} className="py-6 px-4 text-center text-destructive">
                  Failed to load campaigns
                </td>
              </tr>
            )}

            {!isLoading && !error && campaigns.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 px-4 text-center text-muted-foreground">
                  No campaigns yet
                </td>
              </tr>
            )}

            {!isLoading && !error && campaigns.map((campaign) => {
              const status = getStatus(campaign);

              return (
              <tr
                key={campaign.id}
                className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
              >
                <td className="py-3 px-4">
                  <span className="font-medium text-foreground">{campaign.brand}</span>
                </td>
                <td className="py-3 px-4 text-muted-foreground">{campaign.creators?.name || "-"}</td>
                <td className="py-3 px-4">
                  <Badge
                    variant="secondary"
                    className={statusStyles[status]}
                  >
                    {getStatusLabel(status)}
                  </Badge>
                </td>
                <td className="py-3 px-4 text-foreground">{formatBudget(campaign.ag_price, campaign.currency)}</td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}