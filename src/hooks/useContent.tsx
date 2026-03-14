import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useAgencyId } from './useDatabase';

type ContentItem = Database['public']['Tables']['content_items']['Row'];
type ContentItemInsert = Database['public']['Tables']['content_items']['Insert'];
type ContentItemUpdate = Database['public']['Tables']['content_items']['Update'];

interface ContentItemWithCampaign extends ContentItem {
  campaigns: {
    brand: string;
    creators: {
      name: string;
      handle: string;
    } | null;
  } | null;
}

// Get all content items for a campaign
export const useCampaignContent = (campaignId: string | undefined) => {
  return useQuery({
    queryKey: ['content-items', 'campaign', campaignId],
    queryFn: async () => {
      if (!campaignId) throw new Error('Campaign ID is required');

      const { data, error } = await supabase
        .from('content_items')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as ContentItem[];
    },
    enabled: !!campaignId,
  });
};

// Get content items by status
export const useContentByStatus = (status: ContentItem['status']) => {
  return useQuery({
    queryKey: ['content-items', 'status', status],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content_items')
        .select(`
          *,
          campaigns (
            brand,
            creators (
              name,
              handle
            )
          )
        `)
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ContentItemWithCampaign[];
    },
  });
};

// Get upcoming content items (with due dates)
export const useUpcomingContent = (limit: number = 10) => {
  return useQuery({
    queryKey: ['content-items', 'upcoming', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content_items')
        .select(`
          *,
          campaigns (
            brand,
            creators (
              name,
              handle
            )
          )
        `)
        .not('due_date', 'is', null)
        .gte('due_date', new Date().toISOString())
        .order('due_date', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return data as ContentItemWithCampaign[];
    },
  });
};

// Get a single content item
export const useContentItem = (contentItemId: string | undefined) => {
  return useQuery({
    queryKey: ['content-item', contentItemId],
    queryFn: async () => {
      if (!contentItemId) throw new Error('Content item ID is required');

      const { data, error } = await supabase
        .from('content_items')
        .select('*')
        .eq('id', contentItemId)
        .single();

      if (error) throw error;
      return data as ContentItem;
    },
    enabled: !!contentItemId,
  });
};

// Create a new content item
export const useCreateContentItem = () => {
  const queryClient = useQueryClient();
  const { data: agencyId } = useAgencyId();

  return useMutation({
    mutationFn: async (contentItem: ContentItemInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('content_items')
        .insert({
          ...contentItem,
          agency_id: contentItem.agency_id ?? agencyId ?? undefined,
          created_by: contentItem.created_by ?? user?.id ?? undefined,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['content-items'] });
      queryClient.invalidateQueries({ queryKey: ['content-items', 'campaign', data.campaign_id] });
      queryClient.invalidateQueries({ queryKey: ['campaign', data.campaign_id] });
    },
  });
};

// Update a content item
export const useUpdateContentItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: ContentItemUpdate }) => {
      const { data, error } = await supabase
        .from('content_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['content-items'] });
      queryClient.invalidateQueries({ queryKey: ['content-item', data.id] });
      queryClient.invalidateQueries({ queryKey: ['content-items', 'campaign', data.campaign_id] });
      queryClient.invalidateQueries({ queryKey: ['campaign', data.campaign_id] });
    },
  });
};

// Delete a content item
export const useDeleteContentItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contentItemId: string) => {
      // Get campaign_id before deleting for cache invalidation
      const { data: contentItem } = await supabase
        .from('content_items')
        .select('campaign_id')
        .eq('id', contentItemId)
        .single();

      const { error } = await supabase.from('content_items').delete().eq('id', contentItemId);

      if (error) throw error;

      return contentItem?.campaign_id;
    },
    onSuccess: (campaignId) => {
      queryClient.invalidateQueries({ queryKey: ['content-items'] });
      if (campaignId) {
        queryClient.invalidateQueries({ queryKey: ['content-items', 'campaign', campaignId] });
        queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
      }
    },
  });
};

// Bulk create content items
export const useBulkCreateContentItems = () => {
  const queryClient = useQueryClient();
  const { data: agencyId } = useAgencyId();

  return useMutation({
    mutationFn: async (contentItems: ContentItemInsert[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      const enriched = contentItems.map((item) => ({
        ...item,
        agency_id: item.agency_id ?? agencyId ?? undefined,
        created_by: item.created_by ?? user?.id ?? undefined,
      }));
      const { data, error } = await supabase
        .from('content_items')
        .insert(enriched)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['content-items'] });
      // Invalidate all unique campaign IDs
      const uniqueCampaignIds = [...new Set(data.map((item) => item.campaign_id))];
      uniqueCampaignIds.forEach((campaignId) => {
        queryClient.invalidateQueries({ queryKey: ['content-items', 'campaign', campaignId] });
        queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
      });
    },
  });
};

// Update content item status (common operation)
export const useUpdateContentStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      notes,
    }: {
      id: string;
      status: ContentItem['status'];
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('content_items')
        .update({ status, ...(notes && { notes }) })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['content-items'] });
      queryClient.invalidateQueries({ queryKey: ['content-item', data.id] });
      queryClient.invalidateQueries({ queryKey: ['content-items', 'campaign', data.campaign_id] });
      queryClient.invalidateQueries({ queryKey: ['campaign', data.campaign_id] });
    },
  });
};

// Get content statistics
export const useContentStats = () => {
  return useQuery({
    queryKey: ['content-items', 'stats'],
    queryFn: async () => {
      const { data, error } = await supabase.from('content_items').select('status, type');

      if (error) throw error;

      const stats = {
        total: data.length,
        byStatus: {
          draft: data.filter((c) => c.status === 'draft').length,
          pending: data.filter((c) => c.status === 'pending').length,
          approved: data.filter((c) => c.status === 'approved').length,
          published: data.filter((c) => c.status === 'published').length,
        },
        byType: {
          image: data.filter((c) => c.type === 'image').length,
          video: data.filter((c) => c.type === 'video').length,
          reel: data.filter((c) => c.type === 'reel').length,
          story: data.filter((c) => c.type === 'story').length,
          carousel: data.filter((c) => c.type === 'carousel').length,
        },
      };

      return stats;
    },
  });
};
