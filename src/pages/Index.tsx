import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";

import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { RecentCampaigns } from "@/components/dashboard/RecentCampaigns";
import { TaskList } from "@/components/layout/TaskList";
import { Megaphone, Users, PoundSterling } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Index = () => {
  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-6 animate-fade-in">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            icon={<PoundSterling className="w-5 h-5" />}
            value="£284K"
            label="Total Revenue"
            trend={{ value: 23, positive: true }}
          />
        </div>

        {/* Tasks Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Tasks</CardTitle>
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
