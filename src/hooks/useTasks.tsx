import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAgencyId } from "./useDatabase";

type Task = Database["public"]["Tables"]["tasks"]["Row"];
type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];
type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];

type TaskWithRelations = Task & {
  creator: { id: string; name: string } | null;
  campaign: { id: string; brand: string } | null;
};

export const useTasks = () => {
  return useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          creator:creators!tasks_related_creator_id_fkey (
            id,
            name
          ),
          campaign:campaigns!tasks_related_campaign_id_fkey (
            id,
            brand
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
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: TaskUpdate }) => {
      const { data, error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
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
