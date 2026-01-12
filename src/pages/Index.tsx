import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { CampaignChart } from "@/components/dashboard/CampaignChart";
import { RecentCampaigns } from "@/components/dashboard/RecentCampaigns";
import { Megaphone, Users, DollarSign, TrendingUp } from "lucide-react";

const Index = () => {
  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-6 animate-fade-in">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon={<Megaphone className="w-5 h-5" />}
            value={24}
            label="Active Campaigns"
            trend={{ value: 12, positive: true }}
          />
          <StatCard
            icon={<Users className="w-5 h-5" />}
            value={156}
            label="Total Creators"
            trend={{ value: 8, positive: true }}
          />
          <StatCard
            icon={<DollarSign className="w-5 h-5" />}
            value="$284K"
            label="Total Revenue"
            trend={{ value: 23, positive: true }}
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            value="4.8%"
            label="Avg. Engagement"
            trend={{ value: 5, positive: true }}
          />
        </div>

        {/* Chart */}
        <CampaignChart />

        {/* Recent Campaigns */}
        <RecentCampaigns />
      </div>
    </DashboardLayout>
  );
};

export default Index;
