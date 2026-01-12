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

const revenueData = [
  { name: "Jan", revenue: 45000 },
  { name: "Feb", revenue: 52000 },
  { name: "Mar", revenue: 48000 },
  { name: "Apr", revenue: 61000 },
  { name: "May", revenue: 55000 },
  { name: "Jun", revenue: 67000 },
  { name: "Jul", revenue: 72000 },
  { name: "Aug", revenue: 69000 },
  { name: "Sep", revenue: 78000 },
  { name: "Oct", revenue: 82000 },
  { name: "Nov", revenue: 91000 },
  { name: "Dec", revenue: 95000 },
];

const platformData = [
  { name: "Instagram", value: 45 },
  { name: "YouTube", value: 30 },
  { name: "TikTok", value: 15 },
  { name: "Twitter", value: 10 },
];

const campaignData = [
  { name: "Mon", completed: 5, pending: 3 },
  { name: "Tue", completed: 7, pending: 2 },
  { name: "Wed", completed: 4, pending: 4 },
  { name: "Thu", completed: 8, pending: 1 },
  { name: "Fri", completed: 6, pending: 3 },
  { name: "Sat", completed: 9, pending: 2 },
  { name: "Sun", completed: 5, pending: 2 },
];

const COLORS = ["hsl(262, 83%, 58%)", "hsl(280, 70%, 55%)", "hsl(328, 75%, 55%)", "hsl(200, 70%, 55%)"];

const Analytics = () => {
  return (
    <DashboardLayout title="Analytics">
      <div className="space-y-6 animate-fade-in">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon={<Megaphone className="w-5 h-5" />}
            value="148"
            label="Total Campaigns"
            trend={{ value: 18, positive: true }}
          />
          <StatCard
            icon={<Users className="w-5 h-5" />}
            value="52"
            label="Active Creators"
            trend={{ value: 12, positive: true }}
          />
          <StatCard
            icon={<FileCheck className="w-5 h-5" />}
            value="89%"
            label="Completion Rate"
            trend={{ value: 8, positive: true }}
          />
          <StatCard
            icon={<DollarSign className="w-5 h-5" />}
            value="$815K"
            label="Total Revenue"
            trend={{ value: 15, positive: true }}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Chart */}
          <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-6">Revenue Overview</h3>
            <div className="h-72">
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
            </div>
          </div>

          {/* Platform Distribution */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-6">Platform Distribution</h3>
            <div className="h-72">
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
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {platformData.map((item, index) => (
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
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Analytics;