import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const data = [
  { name: "Jan", thisYear: 24000, lastYear: 18000 },
  { name: "Feb", thisYear: 28000, lastYear: 22000 },
  { name: "Mar", thisYear: 32000, lastYear: 25000 },
  { name: "Apr", thisYear: 27000, lastYear: 24000 },
  { name: "May", thisYear: 35000, lastYear: 28000 },
  { name: "Jun", thisYear: 42000, lastYear: 32000 },
  { name: "Jul", thisYear: 38000, lastYear: 35000 },
  { name: "Aug", thisYear: 45000, lastYear: 38000 },
  { name: "Sep", thisYear: 52000, lastYear: 42000 },
  { name: "Oct", thisYear: 48000, lastYear: 45000 },
  { name: "Nov", thisYear: 55000, lastYear: 48000 },
  { name: "Dec", thisYear: 62000, lastYear: 52000 },
];

const formatCurrency = (value: number) => {
  if (value >= 1000) {
    return `£${(value / 1000).toFixed(0)}K`;
  }
  return `£${value}`;
};

export function RevenueChart() {
  const currentYear = new Date().getFullYear();
  const lastYear = currentYear - 1;

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <h3 className="text-lg font-semibold text-foreground mb-6">
        Year on Year Revenue
      </h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(40, 15%, 90%)" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(220, 10%, 45%)", fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(220, 10%, 45%)", fontSize: 12 }}
              tickFormatter={formatCurrency}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                `£${value.toLocaleString()}`,
                name === "thisYear" ? currentYear : lastYear,
              ]}
              contentStyle={{
                backgroundColor: "hsl(0, 0%, 100%)",
                border: "1px solid hsl(40, 15%, 90%)",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
            />
            <Legend
              formatter={(value) =>
                value === "thisYear" ? currentYear : lastYear
              }
            />
            <Bar
              dataKey="lastYear"
              fill="hsl(220, 10%, 75%)"
              radius={[4, 4, 0, 0]}
              maxBarSize={24}
            />
            <Bar
              dataKey="thisYear"
              fill="hsl(38, 92%, 50%)"
              radius={[4, 4, 0, 0]}
              maxBarSize={24}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
