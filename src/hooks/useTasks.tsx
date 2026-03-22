import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAgencyId } from "./useDatabase";
import { useCreateNotification } from "./useNotifications";

type Task = Database["public"]["Tables"]["tasks"]["Row"];
type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];
type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];

type TaskWithRelations = Task & {
  assignee: { id: string; first_name: string | null; last_name: string | null; email: string | null } | null;
};

export const useTasks = () => {
  return useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          assignee:profiles!tasks_assigned_to_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as TaskWithRelations[];
    },
  });
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();
  const { data: agencyId } = useAgencyId();
  const createNotification = useCreateNotification();

  return useMutation({
    mutationFn: async (task: TaskInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          ...task,
          agency_id: task.agency_id ?? agencyId ?? undefined,
          created_by: task.created_by ?? user?.id ?? undefined,
        })
        .select(`
          *,
          assignee:profiles!tasks_assigned_to_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      
      // Trigger notification if task is assigned to someone
      if (data.assigned_to) {
        const assigneeName = data.assignee?.first_name && data.assignee?.last_name 
          ? `${data.assignee.first_name} ${data.assignee.last_name}`
          : data.assignee?.email || 'Team member';
        
        createNotification.mutate({
          type: 'task_assignment',
          title: 'New Task Assigned',
          message: `You have been assigned a new task: "${data.title}".`,
          userIds: [data.assigned_to], // Only notify the assigned user
          data: {
            taskId: data.id,
            taskTitle: data.title,
            dueDate: data.due_date,
            action: 'assigned'
          }
        });
      }
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  const createNotification = useCreateNotification();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: TaskUpdate }) => {
      // Get the current task data to compare changes
      const { data: currentTask } = await supabase
        .from("tasks")
        .select(`
          *,
          assignee:profiles!tasks_assigned_to_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq("id", id)
        .single();
      
      const { data, error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", id)
        .select(`
          *,
          assignee:profiles!tasks_assigned_to_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .single();

      if (error) throw error;
      return { data, currentTask, updates };
    },
    onSuccess: ({ data, currentTask, updates }) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      
      // Check if task was newly assigned or reassigned
      if (updates.assigned_to && updates.assigned_to !== currentTask?.assigned_to) {
        createNotification.mutate({
          type: 'task_assignment',
          title: 'Task Assigned to You',
          message: `You have been assigned the task: "${data.title}".`,
          userIds: [updates.assigned_to],
          data: {
            taskId: data.id,
            taskTitle: data.title,
            dueDate: data.due_date,
            action: 'reassigned'
          }
        });
      }
      
      // Check if task was completed
      if (updates.completed && !currentTask?.completed) {
        // Notify team that task was completed
        createNotification.mutate({
          type: 'task_assignment',
          title: 'Task Completed',
          message: `Task "${data.title}" has been completed.`,
          data: {
            taskId: data.id,
            taskTitle: data.title,
            completedBy: data.assignee?.first_name && data.assignee?.last_name 
              ? `${data.assignee.first_name} ${data.assignee.last_name}`
              : data.assignee?.email || 'Team member',
            action: 'completed'
          }
        });
      }
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
};

export const useSwapTaskOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sourceId,
      sourceOrder,
      targetId,
      targetOrder,
    }: {
      sourceId: string;
      sourceOrder: number;
      targetId: string;
      targetOrder: number;
    }) => {
      const { error: sourceError } = await supabase
        .from("tasks")
        .update({ sort_order: targetOrder })
        .eq("id", sourceId);

      if (sourceError) throw sourceError;

      const { error: targetError } = await supabase
        .from("tasks")
        .update({ sort_order: sourceOrder })
        .eq("id", targetId);

      if (targetError) throw targetError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
};
