import { useState } from "react";
import { Plus, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface Task {
  id: string;
  text: string;
  completed: boolean;
}

export function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([
    { id: "1", text: "Review campaign briefs", completed: false },
    { id: "2", text: "Send creator contracts", completed: true },
    { id: "3", text: "Update analytics report", completed: false },
    { id: "4", text: "Schedule content review meeting", completed: false },
    { id: "5", text: "Approve influencer posts", completed: false },
    { id: "6", text: "Follow up with brand partners", completed: true },
  ]);
  const [newTask, setNewTask] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const addTask = () => {
    if (newTask.trim()) {
      setTasks([
        ...tasks,
        { id: Date.now().toString(), text: newTask.trim(), completed: false },
      ]);
      setNewTask("");
      setIsAdding(false);
    }
  };

  const toggleTask = (id: string) => {
    setTasks(
      tasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const removeTask = (id: string) => {
    setTasks(tasks.filter((task) => task.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      addTask();
    } else if (e.key === "Escape") {
      setIsAdding(false);
      setNewTask("");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-end mb-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setIsAdding(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {isAdding && (
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
              onClick={addTask}
            >
              <Check className="h-3 w-3" />
            </Button>
          </div>
        )}

        {tasks.map((task) => (
          <div
            key={task.id}
            className={cn(
              "flex items-center gap-2 p-2 rounded-lg group hover:bg-muted transition-colors",
              task.completed && "opacity-60"
            )}
          >
            <Checkbox
              checked={task.completed}
              onCheckedChange={() => toggleTask(task.id)}
              className="h-4 w-4"
            />
            <span
              className={cn(
                "text-sm flex-1 truncate text-foreground",
                task.completed && "line-through"
              )}
            >
              {task.text}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              onClick={() => removeTask(task.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}

        {tasks.length === 0 && !isAdding && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No tasks yet
          </p>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-border">
        <p className="text-sm text-muted-foreground">
          {tasks.filter((t) => !t.completed).length} remaining
        </p>
      </div>
    </div>
  );
}
