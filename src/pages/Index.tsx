import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";

import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { RecentCampaigns } from "@/components/dashboard/RecentCampaigns";
import { TaskList } from "@/components/layout/TaskList";
import { Megaphone, Users, PoundSterling } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCampaignStats } from "@/hooks/useCampaigns";
import { useCreatorsCount } from "@/hooks/useCreators";

const Index = () => {
  const { data: campaignStats, isLoading: isLoadingCampaignStats } = useCampaignStats();
  const { data: creatorsCount, isLoading: isLoadingCreatorsCount } = useCreatorsCount();

  const activeCampaigns = campaignStats?.active ?? 0;
  const totalCreators = creatorsCount ?? 0;
  const totalRevenue = campaignStats?.totalRevenue ?? 0;

  const formatRevenue = (value: number) => {
    if (value >= 1000) {
      return `£${Math.round(value / 1000)}K`;
    }
    return `£${Math.round(value)}`;
  };

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-5 lg:space-y-6 animate-fade-in">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
          <StatCard
            icon={<Megaphone className="w-5 h-5" />}
            value={isLoadingCampaignStats ? "..." : activeCampaigns}
            label="Active Campaigns"
          />
          <StatCard
            icon={<Users className="w-5 h-5" />}
            value={isLoadingCreatorsCount ? "..." : totalCreators}
            label="Total Creators"
          />
          <StatCard
            icon={<PoundSterling className="w-5 h-5" />}
            value={isLoadingCampaignStats ? "..." : formatRevenue(totalRevenue)}
            label="Total Revenue"
          />
        </div>

        {/* Tasks Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold tracking-tight">Tasks</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <TaskList />
          </CardContent>
        </Card>

        {/* Revenue Chart */}
        <RevenueChart />

        {/* Recent Campaigns */}
        <RecentCampaigns />
      </div>
    </DashboardLayout>
  );
};

export default Index;
