import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgencyId } from "./useDatabase";
import { useCreateNotification } from "./useNotifications";

// Types for custom events
export interface CustomEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string; // YYYY-MM-DD format
  event_time: string | null; // HH:MM format
  color: string;
  all_day: boolean;
  agency_id: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type CustomEventInsert = Omit<CustomEvent, "id" | "created_at" | "updated_at" | "agency_id" | "created_by"> & {
  agency_id?: string;
  created_by?: string;
};

export type CustomEventUpdate = Partial<CustomEventInsert>;

// Hook to fetch custom events
export const useCustomEvents = () => {
  return useQuery({
    queryKey: ["custom-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_events")
        .select("*")
        .order("event_date", { ascending: true });

      if (error) throw error;
      return data as CustomEvent[];
    },
  });
};

// Hook to create custom events
export const useCreateCustomEvent = () => {
  const queryClient = useQueryClient();
  const { data: agencyId } = useAgencyId();
  const createNotification = useCreateNotification();

  return useMutation({
    mutationFn: async (event: CustomEventInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("custom_events")
        .insert({
          ...event,
          agency_id: event.agency_id ?? agencyId ?? undefined,
          created_by: event.created_by ?? user?.id ?? undefined,
        })
        .select()
        .single();

      if (error) throw error;
      return data as CustomEvent;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["custom-events"] });
      queryClient.invalidateQueries({ queryKey: ["all-calendar-events"] });
      
      // Trigger notification for custom event creation
      createNotification.mutate({
        type: 'custom_event',
        title: 'New Calendar Event Added',
        message: `A new event "${data.title}" has been added to the calendar${data.event_date ? ` for ${new Date(data.event_date).toLocaleDateString()}` : ''}.`,
        data: {
          eventId: data.id,
          eventTitle: data.title,
          eventDate: data.event_date,
          allDay: data.all_day,
          action: 'created'
        }
      });
    },
  });
};

// Hook to update custom events
export const useUpdateCustomEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: CustomEventUpdate }) => {
      const { data, error } = await supabase
        .from("custom_events")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as CustomEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-events"] });
      queryClient.invalidateQueries({ queryKey: ["all-calendar-events"] });
    },
  });
};

// Hook to delete custom events
export const useDeleteCustomEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("custom_events")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-events"] });
      queryClient.invalidateQueries({ queryKey: ["all-calendar-events"] });
    },
  });
};

// Combined interface for calendar events (both campaign and custom)
export interface CalendarEvent {
  id: string;
  type: "campaign" | "custom";
  date: string; // YYYY-MM-DD format
  title: string;
  description?: string;
  color?: string;
  all_day?: boolean;
  time?: string;
  
  // Campaign-specific fields (when type === "campaign")
  campaignId?: string;
  eventType?: "launch" | "live";
  brand?: string;
  creatorName?: string;
  creatorEmail?: string | null;
  campaignStatus?: string;
}