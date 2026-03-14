import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useAgencyId } from './useDatabase';

type Campaign = Database['public']['Tables']['campaigns']['Row'];
type CampaignInsert = Database['public']['Tables']['campaigns']['Insert'];
type CampaignUpdate = Database['public']['Tables']['campaigns']['Update'];

interface CampaignWithRelations extends Campaign {
  creators: {
    id: string;
    name: string;
    handle: string;
    avatar: string | null;
  } | null;
  content_items: Database['public']['Tables']['content_items']['Row'][];
}

interface RecentCampaign {
  id: string;
  brand: string;
  complete: boolean;
  campaign_status: string;
  completion_status: string | null;
  live_date: string | null;
  launch_date: string | null;
  ag_price: number | null;
  currency: string;
  creators: {
    name: string;
  } | null;
}

type XeroSyncResponse = {
  synced: number;
  skipped: number;
  warning?: string;
  message?: string;
};

// Get all campaigns with creator info
export const useCampaigns = () => {
  return useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          creators (
            id,
            name,
            handle,
            avatar
          ),
          content_items (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CampaignWithRelations[];
    },
  });
};

// Get campaigns for a specific creator
export const useCreatorCampaigns = (creatorId: string | undefined) => {
  return useQuery({
    queryKey: ['campaigns', 'creator', creatorId],
    queryFn: async () => {
      if (!creatorId) throw new Error('Creator ID is required');

      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          creators (
            id,
            name,
            handle,
            avatar
          ),
          content_items (*)
        `)
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CampaignWithRelations[];
    },
    enabled: !!creatorId,
  });
};

// Get a single campaign by ID
export const useCampaign = (campaignId: string | undefined) => {
  return useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: async () => {
      if (!campaignId) throw new Error('Campaign ID is required');

      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          creators (
            id,
            name,
            handle,
            avatar,
            email
          ),
          content_items (*)
        `)
        .eq('id', campaignId)
        .single();

      if (error) throw error;
      return data as CampaignWithRelations;
    },
    enabled: !!campaignId,
  });
};

// Get campaigns by brand
export const useCampaignsByBrand = (brand: string | undefined) => {
  return useQuery({
    queryKey: ['campaigns', 'brand', brand],
    queryFn: async () => {
      if (!brand) throw new Error('Brand is required');

      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          creators (
            id,
            name,
            handle,
            avatar
          ),
          content_items (*)
        `)
        .ilike('brand', `%${brand}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CampaignWithRelations[];
    },
    enabled: !!brand,
  });
};

// Get campaign statistics
export const useCampaignStats = () => {
  return useQuery({
    queryKey: ['campaigns', 'stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('id, campaign_status, creator_id, ag_price, currency');

      if (error) throw error;

      const stats = {
        total: data.length,
        active: data.filter((c) => c.campaign_status === 'active').length,
        completed: data.filter((c) => c.campaign_status === 'completed').length,
        pending: data.filter((c) => c.campaign_status === 'pending').length,
        uniqueCreators: new Set(data.map((c) => c.creator_id)).size,
        totalRevenue: data
          .filter((c) => c.campaign_status === 'completed' && c.ag_price)
          .reduce((sum, c) => sum + (c.ag_price || 0), 0),
      };

      return stats;
    },
  });
};

export const useRevenueByMonth = () => {
  return useQuery({
    queryKey: ['campaigns', 'revenue-by-month'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('created_at, ag_price, complete');

      if (error) throw error;

      return data;
    },
  });
};

export const useRecentCampaigns = (limit = 5) => {
  return useQuery({
    queryKey: ['campaigns', 'recent', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          id,
          brand,
          complete,
          campaign_status,
          completion_status,
          live_date,
          launch_date,
          ag_price,
          currency,
          creators (
            name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data as RecentCampaign[];
    },
  });
};

// Create a new campaign
export const useCreateCampaign = () => {
  const queryClient = useQueryClient();
  const { data: agencyId } = useAgencyId();

  return useMutation({
    mutationFn: async (campaign: CampaignInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('campaigns')
        .insert({
          ...campaign,
          agency_id: campaign.agency_id ?? agencyId ?? undefined,
          created_by: campaign.created_by ?? user?.id ?? undefined,
        })
        .select(`
          *,
          creators (
            id,
            name,
            handle,
            avatar
          )
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns', 'creator', data.creator_id] });
      queryClient.invalidateQueries({ queryKey: ['campaigns', 'stats'] });
    },
  });
};

// Update a campaign
export const useUpdateCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: CampaignUpdate }) => {
      const { data, error } = await supabase
        .from('campaigns')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          creators (
            id,
            name,
            handle,
            avatar
          ),
          content_items (*)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaign', data.id] });
      queryClient.invalidateQueries({ queryKey: ['campaigns', 'creator', data.creator_id] });
      queryClient.invalidateQueries({ queryKey: ['campaigns', 'stats'] });
    },
  });
};

// Delete a campaign
export const useDeleteCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaignId: string) => {
      const { error } = await supabase.from('campaigns').delete().eq('id', campaignId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns', 'stats'] });
    },
  });
};

export const useSyncCampaignsFromXero = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ creatorId }: { creatorId?: string } = {}) => {
      const { data, error } = await supabase.functions.invoke<XeroSyncResponse>(
        'xero-sync-campaigns',
        {
          body: creatorId ? { creatorId } : {},
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns', 'stats'] });
    },
  });
};

// Subscribe to campaign updates
export const useSubscribeToCampaigns = (onUpdate: (campaign: Campaign) => void) => {
  return useQuery({
    queryKey: ['campaigns', 'subscription'],
    queryFn: async () => {
      const subscription = supabase
        .channel('campaigns-channel')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'campaigns',
          },
          (payload) => {
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              onUpdate(payload.new as Campaign);
            }
          }
        )
        .subscribe();

      return subscription;
    },
    enabled: !!onUpdate,
  });
};
