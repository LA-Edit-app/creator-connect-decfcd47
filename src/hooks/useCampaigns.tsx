import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { parse as dateFnsParse, format as dateFnsFormat, isValid } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useAgencyId } from './useDatabase';
import { useCustomEvents, type CalendarEvent } from './useCustomEvents';
import { useCreateNotification } from './useNotifications';

// Attempt to parse any date string the campaign tracker might store, and
// return a canonical YYYY-MM-DD string. Returns null when genuinely unparseable.
const parseCampaignDate = (raw: string): string | null => {
  if (!raw) return null;
  // Fast path: already ISO YYYY-MM-DD (with optional time / timezone)
  const isoMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];
  // DatePickerCell stores as "dd MMM yyyy" or "d MMM yyyy"
  const formats = ['dd MMM yyyy', 'd MMM yyyy', 'dd/MM/yyyy', 'd/M/yyyy'];
  for (const fmt of formats) {
    try {
      const parsed = dateFnsParse(raw, fmt, new Date());
      if (isValid(parsed)) return dateFnsFormat(parsed, 'yyyy-MM-dd');
    } catch { /* try next */ }
  }
  return null;
};

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

export interface CampaignEvent {
  id: string;           // unique key: `${campaign_id}-${type}`
  campaignId: string;
  type: 'launch' | 'live';
  date: string;         // ISO date string
  brand: string;
  creatorName: string;
  creatorEmail: string | null;
  campaignStatus: string;
}

export const useUpcomingCampaignEvents = () => {
  return useQuery({
    queryKey: ['campaigns', 'upcoming-events'],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayIso = today.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          id,
          brand,
          campaign_status,
          launch_date,
          live_date,
          creators (
            name,
            email
          )
        `)
        // Fetch all campaigns — filter by date client-side because dates may be
        // stored in "dd MMM yyyy" text format which Supabase can't reliably compare
        // against an ISO string.
        .order('created_at', { ascending: false });

      if (error) throw error;

      const events: CampaignEvent[] = [];

      for (const c of data) {
        const creatorName = (c.creators as { name: string; email: string | null } | null)?.name ?? 'Unknown Creator';
        const creatorEmail = (c.creators as { name: string; email: string | null } | null)?.email ?? null;

        const launchIso = c.launch_date ? parseCampaignDate(c.launch_date) : null;
        const liveIso   = c.live_date   ? parseCampaignDate(c.live_date)   : null;

        if (launchIso && launchIso >= todayIso) {
          events.push({
            id: `${c.id}-launch`,
            campaignId: c.id,
            type: 'launch',
            date: launchIso,
            brand: c.brand,
            creatorName,
            creatorEmail,
            campaignStatus: c.campaign_status,
          });
        }
        if (liveIso && liveIso >= todayIso) {
          events.push({
            id: `${c.id}-live`,
            campaignId: c.id,
            type: 'live',
            date: liveIso,
            brand: c.brand,
            creatorName,
            creatorEmail,
            campaignStatus: c.campaign_status,
          });
        }
      }

      return events.sort((a, b) => a.date.localeCompare(b.date));
    },
  });
};

// Combined hook that returns both campaign events and custom events for the calendar
export const useAllCalendarEvents = () => {
  const campaignEventsQuery = useUpcomingCampaignEvents();
  const customEventsQuery = useCustomEvents();

  return useQuery({
    queryKey: ["all-calendar-events", campaignEventsQuery.data, customEventsQuery.data],
    queryFn: async (): Promise<CalendarEvent[]> => {
      // Use the data from both queries
      const campaignEvents = campaignEventsQuery.data ?? [];
      const customEvents = customEventsQuery.data ?? [];

      const allEvents: CalendarEvent[] = [];

      // Add campaign events
      campaignEvents.forEach((event) => {
        allEvents.push({
          id: event.id,
          type: "campaign",
          date: event.date,
          title: `${event.brand} (${event.type === 'launch' ? 'Launch' : 'Live'})`,
          color: event.type === 'launch' ? '#3b82f6' : '#6b7280',
          all_day: true,
          // Campaign-specific fields
          campaignId: event.campaignId,
          eventType: event.type,
          brand: event.brand,
          creatorName: event.creatorName,
          creatorEmail: event.creatorEmail,
          campaignStatus: event.campaignStatus,
        });
      });

      // Add custom events
      customEvents.forEach((event) => {
        allEvents.push({
          id: event.id,
          type: "custom",
          date: event.event_date,
          title: event.title,
          description: event.description || undefined,
          color: event.color,
          all_day: event.all_day,
          time: event.event_time || undefined,
        });
      });

      // Sort by date
      return allEvents.sort((a, b) => a.date.localeCompare(b.date));
    },
    enabled: campaignEventsQuery.isSuccess && customEventsQuery.isSuccess,
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
  const createNotification = useCreateNotification();

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
      
      // Trigger notification for campaign creation
      createNotification.mutate({
        type: 'campaign_alert',
        title: 'New Campaign Created',
        message: `Campaign "${data.brand}" has been created${data.creators?.name ? ` for creator ${data.creators.name}` : ''}.`,
        data: {
          campaignId: data.id,
          brand: data.brand,
          creatorName: data.creators?.name,
          action: 'created'
        }
      });
    },
  });
};

// Update a campaign
export const useUpdateCampaign = () => {
  const queryClient = useQueryClient();
  const createNotification = useCreateNotification();

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
      
      // Trigger notification for significant campaign updates
      let notificationTitle = 'Campaign Updated';
      let notificationMessage = `Campaign "${data.brand}" has been updated.`;
      
      // Check for specific important updates
      if (updates.complete !== undefined) {
        if (updates.complete) {
          notificationTitle = 'Campaign Completed';
          notificationMessage = `Campaign "${data.brand}" has been marked as completed.`;
        } else {
          notificationTitle = 'Campaign Reopened';
          notificationMessage = `Campaign "${data.brand}" has been reopened.`;
        }
      } else if (updates.live_date || updates.launch_date) {
        notificationTitle = 'Campaign Scheduled';
        notificationMessage = `Campaign "${data.brand}" dates have been updated.`;
      }
      
      createNotification.mutate({
        type: 'campaign_alert',
        title: notificationTitle,
        message: notificationMessage,
        data: {
          campaignId: data.id,
          brand: data.brand,
          creatorName: data.creators?.name,
          action: 'updated',
          updates: updates
        }
      });
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
