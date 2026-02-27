import { useState, useCallback, ReactNode } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { RecentCampaigns } from "@/components/dashboard/RecentCampaigns";
import { CampaignCalendar } from "@/components/dashboard/CampaignCalendar";
import { TaskList } from "@/components/layout/TaskList";
import { SortableSection } from "@/components/dashboard/SortableSection";
import { Megaphone, Users, PoundSterling } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STORAGE_KEY = "dashboard-section-order";

const DEFAULT_ORDER = ["stats", "tasks", "calendar", "revenue", "campaigns"];

function getInitialOrder(): string[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as string[];
      // Ensure all sections are present
      if (DEFAULT_ORDER.every((s) => parsed.includes(s)) && parsed.length === DEFAULT_ORDER.length) {
        return parsed;
      }
    }
  } catch {}
  return DEFAULT_ORDER;
}

const sectionComponents: Record<string, ReactNode> = {
  stats: (
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
  ),
  tasks: (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Tasks</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <TaskList />
      </CardContent>
    </Card>
  ),
  calendar: <CampaignCalendar />,
  revenue: <RevenueChart />,
  campaigns: <RecentCampaigns />,
};

const Index = () => {
  const [sectionOrder, setSectionOrder] = useState<string[]>(getInitialOrder);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSectionOrder((prev) => {
        const oldIndex = prev.indexOf(active.id as string);
        const newIndex = prev.indexOf(over.id as string);
        const newOrder = arrayMove(prev, oldIndex, newIndex);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newOrder));
        return newOrder;
      });
    }
  }, []);

  return (
    <DashboardLayout title="Dashboard">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
          <div className="space-y-6 animate-fade-in">
            {sectionOrder.map((id) => (
              <SortableSection key={id} id={id}>
                {sectionComponents[id]}
              </SortableSection>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </DashboardLayout>
  );
};

export default Index;
