import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useAgencyId } from './useDatabase';

type Creator = Database['public']['Tables']['creators']['Row'];
type CreatorInsert = Database['public']['Tables']['creators']['Insert'];
type CreatorUpdate = Database['public']['Tables']['creators']['Update'];

interface CreatorWithPlatforms extends Creator {
  creator_platforms: {
    platform_id: string;
    platform_handle: string | null;
    follower_count: number | null;
    engagement_rate: number | null;
    platforms: {
      name: string;
      icon: string | null;
    } | null;
  }[];
}

// Get all creators with their platforms
export const useCreators = (includeInactive = false) => {
  return useQuery({
    queryKey: ['creators', includeInactive],
    queryFn: async () => {
      let query = supabase
        .from('creators')
        .select(`
          *,
          creator_platforms (
            platform_id,
            platform_handle,
            follower_count,
            engagement_rate,
            platforms (
              name,
              icon
            )
          )
        `)
        .order('name', { ascending: true });

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as CreatorWithPlatforms[];
    },
  });
};

export const useCreatorsCount = () => {
  return useQuery({
    queryKey: ['creators', 'count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('creators')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      if (error) throw error;
      return count ?? 0;
    },
  });
};

// Get a single creator by ID
export const useCreator = (creatorId: string | undefined) => {
  return useQuery({
    queryKey: ['creator', creatorId],
    queryFn: async () => {
      if (!creatorId) throw new Error('Creator ID is required');

      const { data, error } = await supabase
        .from('creators')
        .select(`
          *,
          creator_platforms (
            platform_id,
            platform_handle,
            follower_count,
            engagement_rate,
            platforms (
              name,
              icon
            )
          )
        `)
        .eq('id', creatorId)
        .single();

      if (error) throw error;
      return data as CreatorWithPlatforms;
    },
    enabled: !!creatorId,
  });
};

// Get creator by handle
export const useCreatorByHandle = (handle: string | undefined) => {
  return useQuery({
    queryKey: ['creator', 'handle', handle],
    queryFn: async () => {
      if (!handle) throw new Error('Handle is required');

      const { data, error } = await supabase
        .from('creators')
        .select(`
          *,
          creator_platforms (
            platform_id,
            platform_handle,
            follower_count,
            engagement_rate,
            platforms (
              name,
              icon
            )
          )
        `)
        .eq('handle', handle)
        .single();

      if (error) throw error;
      return data as CreatorWithPlatforms;
    },
    enabled: !!handle,
  });
};

// Create a new creator
export const useCreateCreator = () => {
  const queryClient = useQueryClient();
  const { data: agencyId } = useAgencyId();

  return useMutation({
    mutationFn: async (creator: CreatorInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('creators')
        .insert({
          ...creator,
          agency_id: creator.agency_id ?? agencyId ?? undefined,
          created_by: creator.created_by ?? user?.id ?? undefined,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creators'] });
    },
  });
};

// Update a creator
export const useUpdateCreator = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: CreatorUpdate }) => {
      const { data, error } = await supabase
        .from('creators')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['creators'] });
      queryClient.invalidateQueries({ queryKey: ['creator', variables.id] });
    },
  });
};

// Delete a creator
export const useDeleteCreator = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (creatorId: string) => {
      const { error } = await supabase
        .from('creators')
        .delete()
        .eq('id', creatorId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creators'] });
    },
  });
};

// Add platform to creator
export const useAddCreatorPlatform = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      creatorId,
      platformId,
      platformHandle,
      followerCount,
      engagementRate,
    }: {
      creatorId: string;
      platformId: string;
      platformHandle?: string;
      followerCount?: number;
      engagementRate?: number;
    }) => {
      const { data, error } = await supabase
        .from('creator_platforms')
        .insert({
          creator_id: creatorId,
          platform_id: platformId,
          platform_handle: platformHandle,
          follower_count: followerCount,
          engagement_rate: engagementRate,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['creator', variables.creatorId] });
      queryClient.invalidateQueries({ queryKey: ['creators'] });
    },
  });
};

// Update creator platform metrics
export const useUpdateCreatorPlatform = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      creatorId,
      platformId,
      updates,
    }: {
      creatorId: string;
      platformId: string;
      updates: {
        platform_handle?: string;
        follower_count?: number;
        engagement_rate?: number;
      };
    }) => {
      const { data, error } = await supabase
        .from('creator_platforms')
        .update(updates)
        .eq('creator_id', creatorId)
        .eq('platform_id', platformId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['creator', variables.creatorId] });
      queryClient.invalidateQueries({ queryKey: ['creators'] });
    },
  });
};
