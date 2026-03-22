import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgencyId, useProfile } from "./useDatabase";
import type { Database } from "@/integrations/supabase/types";

// Types for notifications
export type Notification = Database['public']['Tables']['notifications']['Row'];
export type NotificationInsert = Database['public']['Tables']['notifications']['Insert'];
export type NotificationUpdate = Database['public']['Tables']['notifications']['Update'];

export type NotificationType = 
  | 'campaign_alert' 
  | 'creator_update' 
  | 'weekly_report' 
  | 'email_notification' 
  | 'task_assignment' 
  | 'custom_event';

export interface CreateNotificationParams {
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  userIds?: string[]; // If provided, create notifications for specific users, otherwise for all agency members
}

// Helper functions for managing client-side deleted notifications
const getDeletedNotificationIds = (): string[] => {
  try {
    const stored = localStorage.getItem('deletedNotificationIds');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const addDeletedNotificationId = (id: string) => {
  try {
    const current = getDeletedNotificationIds();
    const updated = [...current.filter(i => i !== id), id]; // Remove if exists, then add
    localStorage.setItem('deletedNotificationIds', JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save deleted notification:', error);
  }
};

// Hook to fetch notifications for the current user
export const useNotifications = (limit = 50) => {
  const { data: profile } = useProfile();
  
  return useQuery({
    queryKey: ["notifications", profile?.id, limit],
    queryFn: async () => {
      if (!profile?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      
      // Filter out client-side deleted notifications
      const deletedIds = getDeletedNotificationIds();
      const filteredData = (data as Notification[]).filter(
        notification => !deletedIds.includes(notification.id)
      );
      
      return filteredData;
    },
    enabled: !!profile?.id,
  });
};

// Hook to get unread notification count
export const useUnreadNotificationCount = () => {
  const { data: profile } = useProfile();
  
  return useQuery({
    queryKey: ["notifications", "unread-count", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return 0;

      const { data, error } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", profile.id)
        .eq("read", false);

      if (error) throw error;
      
      // Filter out client-side deleted notifications
      const deletedIds = getDeletedNotificationIds();
      const filteredData = (data || []).filter(
        notification => !deletedIds.includes(notification.id)
      );
      
      return filteredData.length;
    },
    enabled: !!profile?.id,
  });
};

// Hook to create notifications
export const useCreateNotification = () => {
  const queryClient = useQueryClient();
  const { data: agencyId } = useAgencyId();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async (params: CreateNotificationParams) => {
      if (!agencyId) throw new Error("Agency ID not found");

      let targetUserIds: string[] = [];

      if (params.userIds) {
        // Use specified user IDs
        targetUserIds = params.userIds;
      } else {
        // Get all agency members
        const { data: members, error: membersError } = await supabase
          .from("agency_members")
          .select("user_id")
          .eq("agency_id", agencyId);

        if (membersError) throw membersError;
        targetUserIds = members.map(m => m.user_id);
      }

      // Create notifications for each user, but check their preferences first
      const notifications: NotificationInsert[] = [];
      
      for (const userId of targetUserIds) {
        // Get user's notification preferences
        const { data: userProfile, error: profileError } = await supabase
          .from("profiles")
          .select("email_notifications, campaign_alerts, weekly_reports, creator_updates")
          .eq("id", userId)
          .single();

        if (profileError) {
          console.error("Error fetching user notification preferences:", profileError);
          continue; // Skip this user if we can't get their preferences
        }

        // Check if user wants this type of notification
        let shouldNotify = true;
        switch (params.type) {
          case 'campaign_alert':
            shouldNotify = userProfile.campaign_alerts;
            break;
          case 'creator_update':
            shouldNotify = userProfile.creator_updates;
            break;
          case 'weekly_report':
            shouldNotify = userProfile.weekly_reports;
            break;
          case 'email_notification':
            shouldNotify = userProfile.email_notifications;
            break;
          // task_assignment and custom_event always notify
          case 'task_assignment':
          case 'custom_event':
          default:
            shouldNotify = true;
            break;
        }

        if (shouldNotify) {
          notifications.push({
            user_id: userId,
            agency_id: agencyId,
            type: params.type,
            title: params.title,
            message: params.message,
            data: params.data || null,
          });
        }
      }

      if (notifications.length === 0) {
        return []; // No users to notify
      }

      const { data, error } = await supabase
        .from("notifications")
        .insert(notifications)
        .select();

      if (error) throw error;
      return data as Notification[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
};

// Hook to mark notification as read
export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { data, error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId)
        .select()
        .single();

      if (error) throw error;
      return data as Notification;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
};

// Hook to mark all notifications as read
export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", profile.id)
        .eq("read", false)
        .select();

      if (error) throw error;
      return data as Notification[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
};

// Hook to delete notification (client-side for now)
export const useDeleteNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      // Since RLS policy for DELETE might not be set up, we'll handle this client-side
      // Add the notification ID to localStorage as "deleted"
      addDeletedNotificationId(notificationId);
      return notificationId;
    },
    onSuccess: () => {
      // Invalidate queries to trigger a refetch with the deleted notification filtered out
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
};