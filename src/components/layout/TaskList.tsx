import { useState } from "react";
import { Plus, X, Check, Pencil, ArrowUp, ArrowDown, UserCheck } from "lucide-react";
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
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useIsAgencyAdmin, useAgencyMembers } from "@/hooks/useAgencyMembers";
import { useAuth } from "@/hooks/useAuth";

interface Task {
  id: string;
  title: string;
  completed: boolean;
  sort_order: number;
  assigned_to: string | null;
  assignee?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

export function TaskList() {
  const navigate = useNavigate();
  const { data: tasks = [], isLoading, error } = useTasks();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const swapTaskOrder = useSwapTaskOrder();

  const { data: isAdmin } = useIsAgencyAdmin();
  const { data: agencyMembersData } = useAgencyMembers();
  const { user } = useAuth();

  const memberOptions = (agencyMembersData ?? [])
    .filter((m) => m.profiles)
    .map((m) => ({
      id: m.user_id,
      name: [m.profiles?.first_name, m.profiles?.last_name].filter(Boolean).join(' ') || m.profiles?.email || 'Unknown',
    }));

  const [newTask, setNewTask] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editAssigneeId, setEditAssigneeId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");





  const addTask = async () => {
    if (newTask.trim()) {
      try {
        const nextSortOrder = tasks.length > 0
          ? Math.max(...tasks.map((task) => task.sort_order)) + 1
          : 0;

        await createTask.mutateAsync({
          title: newTask.trim(),
          completed: false,
          sort_order: nextSortOrder,
          assigned_to: isAdmin ? (assigneeId || null) : (user?.id ?? null),
        });
        setNewTask("");
        setIsAdding(false);
        setAssigneeId("");
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
    setEditAssigneeId(task.assigned_to || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
    setEditAssigneeId("");
  };

  const saveEdit = async () => {
    if (editingId && editText.trim()) {
      try {
        await updateTask.mutateAsync({
          id: editingId,
          updates: {
            title: editText.trim(),
            ...(isAdmin ? { assigned_to: editAssigneeId || null } : {}),
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
      setAssigneeId("");
    }
  };



  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Tasks ({tasks.length})</span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => {
            setIsAdding(true);
            setAssigneeId("");
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
              {isAdmin && memberOptions.length > 0 && (
                <Select
                  value={assigneeId || "__unassigned__"}
                  onValueChange={(v) => setAssigneeId(v === "__unassigned__" ? "" : v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Assign to (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__unassigned__">Unassigned</SelectItem>
                    {memberOptions.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        )}

        {tasks.map((task, index) => {
          const isFirst = index === 0;
          const isLast = index === tasks.length - 1;

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
                  {isAdmin && memberOptions.length > 0 && (
                    <Select
                      value={editAssigneeId || "__unassigned__"}
                      onValueChange={(v) => setEditAssigneeId(v === "__unassigned__" ? "" : v)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Assign to" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__unassigned__">Unassigned</SelectItem>
                        {memberOptions.map((m) => (
                          <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
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
                {task.assignee && (
                  <Badge
                    variant="outline"
                    className="mt-0.5 text-[10px] font-medium inline-flex items-center gap-1"
                  >
                    <UserCheck className="h-3 w-3" />
                    Assigned to: {[task.assignee.first_name, task.assignee.last_name].filter(Boolean).join(' ') || task.assignee.email || 'Unknown'}
                  </Badge>
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
                    onClick={() => void moveTask(task, "up", tasks)}
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
                    onClick={() => void moveTask(task, "down", tasks)}
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

        {tasks.length === 0 && !isAdding && !isLoading && !error && (
          <div className="rounded-lg border border-dashed border-border py-6 text-center">
            <p className="text-sm text-muted-foreground">No tasks yet</p>
            <p className="text-xs text-muted-foreground/80 mt-1">Click the + button to add your first task</p>
          </div>
        )}
      </div>

      <div className="mt-2 pt-2 border-t border-border">
        <p className="text-sm text-muted-foreground">
          {tasks.filter((t) => !t.completed).length} remaining • {tasks.length} total
        </p>
      </div>
    </div>
  );
}
