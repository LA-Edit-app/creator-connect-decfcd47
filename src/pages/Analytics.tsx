import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { DollarSign, FileCheck, Megaphone, Users } from "lucide-react";
import { useCampaignStats, useRevenueByMonth } from "@/hooks/useCampaigns";
import { useCreators } from "@/hooks/useCreators";

const COLORS = ["hsl(262, 83%, 58%)", "hsl(280, 70%, 55%)", "hsl(328, 75%, 55%)", "hsl(200, 70%, 55%)"];
const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const Analytics = () => {
  const { data: campaignStats, isLoading: isLoadingCampaignStats } = useCampaignStats();
  const { data: revenueRows = [], isLoading: isLoadingRevenue } = useRevenueByMonth();
  const { data: creators = [], isLoading: isLoadingCreators } = useCreators();

  const revenueData = monthLabels.map((name, monthIndex) => {
    const total = revenueRows
      .filter((row) => {
        if (!row.created_at || !row.ag_price || !row.complete) return false;
        return new Date(row.created_at).getMonth() === monthIndex;
      })
      .reduce((sum, row) => sum + (row.ag_price || 0), 0);

    return { name, revenue: total };
  });

  const platformCounts = creators
    .flatMap((creator) => creator.creator_platforms)
    .reduce<Record<string, number>>((acc, entry) => {
      const name = entry.platforms?.name || "Unknown";
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {});

  const totalPlatformLinks = Object.values(platformCounts).reduce((sum, value) => sum + value, 0);
  const platformData = Object.entries(platformCounts)
    .map(([name, count]) => ({
      name,
      value: totalPlatformLinks > 0 ? Math.round((count / totalPlatformLinks) * 100) : 0,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 4);

  const campaignData = weekdayLabels.map((name, weekday) => {
    const dayRows = revenueRows.filter((row) => {
      if (!row.created_at) return false;
      return new Date(row.created_at).getDay() === weekday;
    });

    return {
      name,
      completed: dayRows.filter((row) => row.complete).length,
      pending: dayRows.filter((row) => !row.complete).length,
    };
  });

  const totalCampaigns = campaignStats?.total ?? 0;
  const activeCreators = campaignStats?.uniqueCreators ?? 0;
  const completionRate = totalCampaigns > 0
    ? Math.round(((campaignStats?.completed ?? 0) / totalCampaigns) * 100)
    : 0;
  const totalRevenue = campaignStats?.totalRevenue ?? 0;
  const hasRevenueData = revenueData.some((item) => item.revenue > 0);
  const hasPlatformData = platformData.length > 0 && platformData.some((item) => item.value > 0);
  const hasCampaignActivity = campaignData.some((item) => item.completed > 0 || item.pending > 0);

  return (
    <DashboardLayout title="Analytics">
      <div className="space-y-6 animate-fade-in">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon={<Megaphone className="w-5 h-5" />}
            value={isLoadingCampaignStats ? "..." : totalCampaigns}
            label="Total Campaigns"
          />
          <StatCard
            icon={<Users className="w-5 h-5" />}
            value={isLoadingCampaignStats ? "..." : activeCreators}
            label="Active Creators"
          />
          <StatCard
            icon={<FileCheck className="w-5 h-5" />}
            value={isLoadingCampaignStats ? "..." : `${completionRate}%`}
            label="Completion Rate"
          />
          <StatCard
            icon={<DollarSign className="w-5 h-5" />}
            value={isLoadingCampaignStats ? "..." : `£${Math.round(totalRevenue).toLocaleString()}`}
            label="Total Revenue"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Chart */}
          <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-6">Revenue Overview</h3>
            <div className="h-72">
              {isLoadingRevenue ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  Loading revenue...
                </div>
              ) : !hasRevenueData ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  No revenue data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(260, 15%, 90%)" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "hsl(260, 10%, 45%)", fontSize: 12 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "hsl(260, 10%, 45%)", fontSize: 12 }}
                      tickFormatter={(value) => `$${value / 1000}k`}
                    />
                    <Tooltip
                      formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
                      contentStyle={{
                        backgroundColor: "hsl(0, 0%, 100%)",
                        border: "1px solid hsl(260, 15%, 90%)",
                        borderRadius: "8px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(262, 83%, 58%)"
                      strokeWidth={2}
                      fill="url(#revenueGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Platform Distribution */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-6">Platform Distribution</h3>
            <div className="h-72">
              {isLoadingCreators ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  Loading platform data...
                </div>
              ) : !hasPlatformData ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  No platform data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={platformData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {platformData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [`${value}%`, "Share"]}
                      contentStyle={{
                        backgroundColor: "hsl(0, 0%, 100%)",
                        border: "1px solid hsl(260, 15%, 90%)",
                        borderRadius: "8px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {hasPlatformData && platformData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2 text-sm">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index] }}
                  />
                  <span className="text-muted-foreground">{item.name}</span>
                  <span className="font-medium text-foreground">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Campaign Activity Chart */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-6">Weekly Campaign Activity</h3>
          <div className="h-72">
            {isLoadingRevenue ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                Loading campaign activity...
              </div>
            ) : !hasCampaignActivity ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                No campaign activity yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={campaignData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(260, 15%, 90%)" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(260, 10%, 45%)", fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(260, 10%, 45%)", fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value: number) => [value, ""]}
                    contentStyle={{
                      backgroundColor: "hsl(0, 0%, 100%)",
                      border: "1px solid hsl(260, 15%, 90%)",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="completed" name="Completed" fill="hsl(262, 83%, 58%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pending" name="Pending" fill="hsl(262, 60%, 80%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Analytics;