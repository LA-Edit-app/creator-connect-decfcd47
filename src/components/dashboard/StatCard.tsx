import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: ReactNode;
  value: string | number;
  label: string;
  trend?: {
    value: number;
    positive: boolean;
  };
  className?: string;
}

export function StatCard({ icon, value, label, trend, className }: StatCardProps) {
  return (
    <div className={cn("stat-card", className)}>
      <div className="relative z-10">
        <div className="stat-icon mb-4">
          {icon}
        </div>
        <p className="text-3xl font-bold text-foreground mb-1">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
        {trend && (
          <p
            className={cn(
              "text-xs mt-2 font-medium",
              trend.positive ? "text-green-600" : "text-red-500"
            )}
          >
            {trend.positive ? "+" : ""}{trend.value}% from last month
          </p>
        )}
      </div>
    </div>
  );
}
