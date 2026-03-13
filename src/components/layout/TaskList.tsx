import { useMemo, useState } from "react";
import { Plus, X, Check, Pencil, ArrowUp, ArrowDown, User, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useCreateTask, useDeleteTask, useSwapTaskOrder, useTasks, useUpdateTask } from "@/hooks/useTasks";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreators } from "@/hooks/useCreators";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

interface Task {
  id: string;
  title: string;
  completed: boolean;
  sort_order: number;
  related_creator_id: string | null;
  related_campaign_id: string | null;
  creator?: {
    id: string;
    name: string;
  } | null;
  campaign?: {
    id: string;
    brand: string;
  } | null;
}

type TaskRelationFilter = "all" | "creator" | "campaign";

export function TaskList() {
  const navigate = useNavigate();
  const { data: tasks = [], isLoading, error } = useTasks();
  const { data: creators = [] } = useCreators();
  const { data: campaigns = [] } = useCampaigns();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const swapTaskOrder = useSwapTaskOrder();

  const [newTask, setNewTask] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editRelationType, setEditRelationType] = useState<"none" | "creator" | "campaign">("none");
  const [editRelatedCreatorId, setEditRelatedCreatorId] = useState("");
  const [editRelatedCampaignId, setEditRelatedCampaignId] = useState("");
  const [relationType, setRelationType] = useState<"none" | "creator" | "campaign">("none");
  const [relatedCreatorId, setRelatedCreatorId] = useState("");
  const [relatedCampaignId, setRelatedCampaignId] = useState("");
  const [taskRelationFilter, setTaskRelationFilter] = useState<TaskRelationFilter>("all");

  const getRelationTypeFromTask = (task: Task): "none" | "creator" | "campaign" => {
    if (task.related_creator_id) return "creator";
    if (task.related_campaign_id) return "campaign";
    return "none";
  };

  const getTaskRelationType = (task: Task): TaskRelationFilter => {
    if (task.related_creator_id) return "creator";
    if (task.related_campaign_id) return "campaign";
    return "all";
  };

  const filteredTasks = useMemo(() => {
    if (taskRelationFilter === "all") return tasks;
    return tasks.filter((task) => getTaskRelationType(task) === taskRelationFilter);
  }, [tasks, taskRelationFilter]);

  const getFilterLabel = (filter: TaskRelationFilter) => {
    if (filter === "creator") return "Creator-related";
    if (filter === "campaign") return "Campaign-related";
    return "All";
  };

  const addTask = async () => {
    if (newTask.trim()) {
      if (relationType === "creator" && !relatedCreatorId) {
        toast.error("Select a creator for this task relation");
        return;
      }

      if (relationType === "campaign" && !relatedCampaignId) {
        toast.error("Select a campaign for this task relation");
        return;
      }

      try {
        const nextSortOrder = tasks.length > 0
          ? Math.max(...tasks.map((task) => task.sort_order)) + 1
          : 0;

        await createTask.mutateAsync({
          title: newTask.trim(),
          completed: false,
          sort_order: nextSortOrder,
          related_creator_id: relationType === "creator" ? relatedCreatorId : null,
          related_campaign_id: relationType === "campaign" ? relatedCampaignId : null,
        });
        setNewTask("");
        setIsAdding(false);
        setRelationType("none");
        setRelatedCreatorId("");
        setRelatedCampaignId("");
      } catch (mutationError: any) {
        toast.error(mutationError?.message || "Failed to create task");
      }
    }
  };

  const toggleTask = async (task: Task) => {
    try {
      await updateTask.mutateAsync({
        id: task.id,
        updates: { completed: !task.completed },
      });
    } catch (mutationError: any) {
      toast.error(mutationError?.message || "Failed to update task");
    }
  };

  const removeTask = async (id: string) => {
    try {
      await deleteTask.mutateAsync(id);
    } catch (mutationError: any) {
      toast.error(mutationError?.message || "Failed to delete task");
    }
  };

  const moveTask = async (task: Task, direction: "up" | "down", visibleTasks: Task[]) => {
    const currentIndex = visibleTasks.findIndex((item) => item.id === task.id);
    if (currentIndex < 0) return;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= visibleTasks.length) return;

    const targetTask = visibleTasks[targetIndex];

    try {
      await swapTaskOrder.mutateAsync({
        sourceId: task.id,
        sourceOrder: task.sort_order,
        targetId: targetTask.id,
        targetOrder: targetTask.sort_order,
      });
    } catch (mutationError: any) {
      toast.error(mutationError?.message || "Failed to reorder task");
    }
  };

  const startEditing = (task: Task) => {
    setEditingId(task.id);
    setEditText(task.title);
    setEditRelationType(getRelationTypeFromTask(task));
    setEditRelatedCreatorId(task.related_creator_id || "");
    setEditRelatedCampaignId(task.related_campaign_id || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
    setEditRelationType("none");
    setEditRelatedCreatorId("");
    setEditRelatedCampaignId("");
  };

  const saveEdit = async () => {
    if (editingId && editText.trim()) {
      if (editRelationType === "creator" && !editRelatedCreatorId) {
        toast.error("Select a creator for this task relation");
        return;
      }

      if (editRelationType === "campaign" && !editRelatedCampaignId) {
        toast.error("Select a campaign for this task relation");
        return;
      }

      try {
        await updateTask.mutateAsync({
          id: editingId,
          updates: {
            title: editText.trim(),
            related_creator_id: editRelationType === "creator" ? editRelatedCreatorId : null,
            related_campaign_id: editRelationType === "campaign" ? editRelatedCampaignId : null,
          },
        });
      } catch (mutationError: any) {
        toast.error(mutationError?.message || "Failed to update task");
      }
    }
    cancelEdit();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      void addTask();
    } else if (e.key === "Escape") {
      setIsAdding(false);
      setNewTask("");
      setRelationType("none");
      setRelatedCreatorId("");
      setRelatedCampaignId("");
    }
  };

  const getTaskRelationMeta = (task: Task) => {
    if (task.creator) {
      return {
        label: `Creator: ${task.creator.name}`,
        icon: User,
        badgeClassName: "bg-blue-100 text-blue-700 hover:bg-blue-100",
        onClick: () => {
          navigate("/campaign-tracker", {
            state: {
              creatorId: task.creator?.id,
            },
          });
        },
      };
    }

    if (task.campaign) {
      return {
        label: `Campaign: ${task.campaign.brand}`,
        icon: Megaphone,
        badgeClassName: "bg-violet-100 text-violet-700 hover:bg-violet-100",
        onClick: () => {
          navigate("/campaign-tracker", {
            state: {
              campaignId: task.campaign?.id,
              openDetailReadonly: true,
            },
          });
        },
      };
    }

    return null;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Filter</span>
          <Select
            value={taskRelationFilter}
            onValueChange={(value) => setTaskRelationFilter(value as TaskRelationFilter)}
          >
            <SelectTrigger className="h-8 w-[170px] text-xs">
              <SelectValue placeholder="Filter tasks" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ({tasks.length})</SelectItem>
              <SelectItem value="creator">
                Creator-related ({tasks.filter((task) => getTaskRelationType(task) === "creator").length})
              </SelectItem>
              <SelectItem value="campaign">
                Campaign-related ({tasks.filter((task) => getTaskRelationType(task) === "campaign").length})
              </SelectItem>
            </SelectContent>
          </Select>

          {taskRelationFilter !== "all" && (
            <Badge variant="secondary" className="text-[10px] font-medium">
              Showing {getFilterLabel(taskRelationFilter).toLowerCase()}
            </Badge>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => {
            setIsAdding(true);
            setRelationType("none");
            setRelatedCreatorId("");
            setRelatedCampaignId("");
          }}
          title="Add task"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
        {isLoading && (
          <div className="rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
            Loading tasks...
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-dashed border-destructive/30 py-6 text-center text-sm text-destructive">
            Failed to load tasks
          </div>
        )}

        {isAdding && (
          <div className="space-y-2 rounded-lg border border-border bg-card p-2.5">
            <div className="flex items-center gap-2">
              <Input
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add a task..."
                className="h-8 text-sm"
                autoFocus
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => void addTask()}
              >
                <Check className="h-3 w-3" />
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Select
                value={relationType}
                onValueChange={(value: "none" | "creator" | "campaign") => {
                  setRelationType(value);
                  if (value !== "creator") setRelatedCreatorId("");
                  if (value !== "campaign") setRelatedCampaignId("");
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Task relation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No relation</SelectItem>
                  <SelectItem value="creator">Related to creator</SelectItem>
                  <SelectItem value="campaign">Related to campaign</SelectItem>
                </SelectContent>
              </Select>

              {relationType === "creator" && (
                <Select value={relatedCreatorId} onValueChange={setRelatedCreatorId}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select creator" />
                  </SelectTrigger>
                  <SelectContent>
                    {creators.map((creator) => (
                      <SelectItem key={creator.id} value={creator.id}>
                        {creator.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {relationType === "campaign" && (
                <Select value={relatedCampaignId} onValueChange={setRelatedCampaignId}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select campaign" />
                  </SelectTrigger>
                  <SelectContent>
                    {campaigns.map((campaign) => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        {campaign.brand}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        )}

        {filteredTasks.map((task, index) => {
          const isFirst = index === 0;
          const isLast = index === filteredTasks.length - 1;
          const taskRelationMeta = getTaskRelationMeta(task);

          return (
          <div
            key={task.id}
            className={cn(
              "flex gap-2 p-2 rounded-lg border border-transparent group hover:bg-muted/60 hover:border-border transition-colors",
              editingId === task.id ? "items-start" : "items-center",
              task.completed && "opacity-60"
            )}
          >
            <Checkbox
              checked={task.completed}
              onCheckedChange={() => void toggleTask(task)}
              className="h-4 w-4"
            />
            {editingId === task.id ? (
              <div className="flex-1 min-w-0 space-y-1.5">
                <Input
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void saveEdit();
                    if (e.key === "Escape") {
                      cancelEdit();
                    }
                  }}
                  className="h-7 text-sm"
                  autoFocus
                />
                <div className="grid grid-cols-1 gap-2">
                  <Select
                    value={editRelationType}
                    onValueChange={(value: "none" | "creator" | "campaign") => {
                      setEditRelationType(value);
                      if (value !== "creator") setEditRelatedCreatorId("");
                      if (value !== "campaign") setEditRelatedCampaignId("");
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Task relation" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No relation</SelectItem>
                      <SelectItem value="creator">Related to creator</SelectItem>
                      <SelectItem value="campaign">Related to campaign</SelectItem>
                    </SelectContent>
                  </Select>

                  {editRelationType === "creator" && (
                    <Select value={editRelatedCreatorId} onValueChange={setEditRelatedCreatorId}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select creator" />
                      </SelectTrigger>
                      <SelectContent>
                        {creators.map((creator) => (
                          <SelectItem key={creator.id} value={creator.id}>
                            {creator.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {editRelationType === "campaign" && (
                    <Select value={editRelatedCampaignId} onValueChange={setEditRelatedCampaignId}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select campaign" />
                      </SelectTrigger>
                      <SelectContent>
                        {campaigns.map((campaign) => (
                          <SelectItem key={campaign.id} value={campaign.id}>
                            {campaign.brand}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 min-w-0">
                <span
                  className={cn(
                    "text-sm block truncate text-foreground cursor-pointer",
                    task.completed && "line-through"
                  )}
                  onClick={() => !task.completed && startEditing(task)}
                >
                  {task.title}
                </span>
                {taskRelationMeta && (
                  <button
                    type="button"
                    className="text-left"
                    onClick={taskRelationMeta.onClick}
                  >
                    <Badge
                      variant="secondary"
                      className={cn("mt-0.5 text-[10px] font-medium inline-flex items-center gap-1", taskRelationMeta.badgeClassName)}
                    >
                      <taskRelationMeta.icon className="h-3 w-3" />
                      {taskRelationMeta.label}
                    </Badge>
                  </button>
                )}
              </div>
            )}
            {editingId !== task.id && (
              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                {!isFirst && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => void moveTask(task, "up", filteredTasks)}
                    title="Move up"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                )}
                {!isLast && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => void moveTask(task, "down", filteredTasks)}
                    title="Move down"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => startEditing(task)}
                  title="Edit task"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
            )}
            {editingId === task.id ? (
              <div className="flex items-center gap-1 shrink-0 pt-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => void saveEdit()}
                >
                  <Check className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={cancelEdit}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                onClick={() => void removeTask(task.id)}
                title="Delete task"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          );
        })}

        {filteredTasks.length === 0 && !isAdding && !isLoading && !error && (
          <div className="rounded-lg border border-dashed border-border py-6 text-center">
            <p className="text-sm text-muted-foreground">No tasks for this filter</p>
            <p className="text-xs text-muted-foreground/80 mt-1">Try switching filter or add a new task</p>
          </div>
        )}
      </div>

      <div className="mt-2 pt-2 border-t border-border">
        <p className="text-sm text-muted-foreground">
          {tasks.filter((t) => !t.completed).length} remaining • {filteredTasks.length} shown
        </p>
      </div>
    </div>
  );
}
