import { useEffect, useMemo, useRef, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Search, Filter, Plus, Trash2, ArrowLeft, Eye, Upload, ZoomIn, ZoomOut, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EditableCell } from "@/components/campaign-tracker/EditableCell";
import { DatePickerCell } from "@/components/campaign-tracker/DatePickerCell";
import { StatusSelect } from "@/components/campaign-tracker/StatusSelect";
import { CreatorSelector } from "@/components/campaign-tracker/CreatorSelector";
import { CampaignDetailModal } from "@/components/campaign-tracker/CampaignDetailModal";
import { CampaignData, Creator } from "@/data/campaignTrackerData";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  useCampaigns,
  useCreateCampaign,
  useDeleteCampaign,
  useSyncCampaignsFromXero,
  useUpdateCampaign,
} from "@/hooks/useCampaigns";
import { useCreators } from "@/hooks/useCreators";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const statusOptions = [
  { value: "Pending", label: "Pending" },
  { value: "Active", label: "Active" },
  { value: "Completed", label: "Completed" },
];

const secondaryStatusOptions = [
  { value: "None", label: "None" },
  { value: "Awaiting details", label: "Awaiting details" },
];

const paidOptions = [
  { value: "CHASED", label: "CHASED" },
  { value: "17 Oct", label: "17 Oct" },
  { value: "OCT", label: "OCT" },
  { value: "NOV", label: "NOV" },
  { value: "DEC", label: "DEC" },
];

const vatOptions = [
  { value: "VAT", label: "VAT" },
  { value: "NO VAT", label: "NO VAT" },
];

const currencyOptions = [
  { value: "GBP", label: "GBP" },
  { value: "EUR", label: "EUR" },
];

const ZOOM_LEVELS = [0.7, 0.85, 1, 1.15, 1.3];
const DEFAULT_ZOOM_INDEX = 2;

const normalizeCampaignStatus = (value: string | null | undefined): "pending" | "active" | "completed" => {
  const normalized = (value || "").trim().toLowerCase();
  if (normalized === "active") return "active";
  if (normalized === "completed") return "completed";
  return "pending";
};

type TrackerView = "all" | "active" | "pending" | "history";

type TrackerNavigationState = {
  campaignId?: string;
  creatorId?: string;
  openDetailReadonly?: boolean;
};

const TRACKER_VIEW_LABELS: Record<TrackerView, string> = {
  all: "All",
  active: "Active",
  pending: "Pending",
  history: "History",
};

const CampaignTracker = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: campaignsRaw = [], isLoading: isLoadingCampaigns } = useCampaigns();
  const { data: creatorsRaw = [], isLoading: isLoadingCreators } = useCreators();
  const createCampaign = useCreateCampaign();
  const updateCampaignMutation = useUpdateCampaign();
  const deleteCampaignMutation = useDeleteCampaign();
  const syncCampaignsFromXero = useSyncCampaignsFromXero();

  const [searchQuery, setSearchQuery] = useState("");
  const [trackerView, setTrackerView] = useState<TrackerView>("all");
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignData | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [isDetailReadOnly, setIsDetailReadOnly] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX);
  const [highlightedCampaignId, setHighlightedCampaignId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const highlightedRowRef = useRef<HTMLTableRowElement | null>(null);
  const syncedCreatorIdsRef = useRef<Set<string>>(new Set());

  const creators = useMemo<Creator[]>(() => {
    return creatorsRaw.map((creator) => ({
      id: creator.id,
      name: creator.name,
      avatar: creator.avatar || "",
      handle: creator.handle,
      platforms: creator.creator_platforms
        .map((entry) => entry.platforms?.name)
        .filter((name): name is string => Boolean(name)),
    }));
  }, [creatorsRaw]);

  const campaigns = useMemo<CampaignData[]>(() => {
    return campaignsRaw.map((campaign) => ({
      id: campaign.id,
      creatorId: campaign.creator_id,
      brand: campaign.brand,
      launchDate: campaign.launch_date || "",
      activity: campaign.activity || "",
      liveDate: campaign.live_date || "",
      agPrice: campaign.ag_price,
      creatorFee: campaign.creator_fee,
      shot: campaign.shot || "",
      complete: campaign.campaign_status
        ? `${campaign.campaign_status.charAt(0).toUpperCase()}${campaign.campaign_status.slice(1)}`
        : campaign.complete
          ? "Completed"
          : campaign.live_date
            ? "Active"
            : "Pending",
      secondaryStatus: campaign.completion_status === "awaiting_details" ? "Awaiting details" : "",
      invoiceNo: campaign.invoice_no || "",
      paid: campaign.paid_date || "",
      includesVat: campaign.includes_vat || "",
      currency: campaign.currency || "GBP",
      brandPOs: campaign.brand_pos || "",
      paymentTerms: campaign.payment_terms || "",
      notes: campaign.notes || "",
      content: [],
    }));
  }, [campaignsRaw]);

  const getCampaignStatus = (campaign: CampaignData): "active" | "pending" | "completed" => {
    if (campaign.complete === "Completed") return "completed";
    if (campaign.complete === "Active") return "active";
    return "pending";
  };

  const isCampaignInCurrentView = (campaign: CampaignData) => {
    if (trackerView === "all") {
      return true;
    }
    const status = getCampaignStatus(campaign);
    if (trackerView === "active") {
      return status === "active";
    }
    if (trackerView === "pending") {
      return status === "pending";
    }
    return status === "completed";
  };

  const activeCampaignCount = useMemo(
    () => campaigns.filter((campaign) => getCampaignStatus(campaign) === "active").length,
    [campaigns]
  );

  const allCampaignCount = campaigns.length;

  const historyCampaignCount = useMemo(
    () =>
      campaigns.filter((campaign) => {
        const status = getCampaignStatus(campaign);
        return status === "completed";
      }).length,
    [campaigns]
  );

  const pendingCampaignCount = useMemo(
    () => campaigns.filter((campaign) => getCampaignStatus(campaign) === "pending").length,
    [campaigns]
  );

  const creatorCampaigns = useMemo(() => {
    if (!selectedCreator) return [];
    return campaigns.filter(
      (campaign) => campaign.creatorId === selectedCreator.id && isCampaignInCurrentView(campaign)
    );
  }, [campaigns, selectedCreator, trackerView]);

  const syncFromXero = async (creatorId: string, mode: "auto" | "manual") => {
    try {
      const result = await syncCampaignsFromXero.mutateAsync({ creatorId });

      if (result?.warning) {
        toast.warning(result.warning);
      }

      if (mode === "manual") {
        toast.success(`Xero sync complete: ${result?.synced ?? 0} updated, ${result?.skipped ?? 0} skipped`);
        return;
      }

      if ((result?.synced ?? 0) > 0) {
        toast.success(`Xero auto-sync updated ${result?.synced} campaign${result?.synced === 1 ? "" : "s"}`);
      }
    } catch (syncError: any) {
      if (mode === "manual") {
        toast.error(syncError?.message || "Failed to sync campaigns from Xero");
      }
    }
  };

  useEffect(() => {
    const navigationState = (location.state ?? {}) as TrackerNavigationState;
    const targetCampaignId = navigationState.campaignId;
    const targetCreatorId = navigationState.creatorId;
    const shouldOpenReadOnly = navigationState.openDetailReadonly === true;

    if ((!targetCampaignId && !targetCreatorId) || isLoadingCampaigns || isLoadingCreators || campaigns.length === 0) {
      return;
    }

    if (targetCreatorId && !targetCampaignId) {
      const targetCreator = creators.find((creator) => creator.id === targetCreatorId);
      if (targetCreator) {
        setSelectedCreator(targetCreator);
        setTrackerView("all");
      }
      navigate(location.pathname, { replace: true, state: null });
      return;
    }

    const targetCampaign = campaigns.find((campaign) => String(campaign.id) === targetCampaignId);
    if (!targetCampaign) {
      navigate(location.pathname, { replace: true, state: null });
      return;
    }

    const targetCreator = creators.find((creator) => creator.id === targetCampaign.creatorId);
    if (targetCreator && (!selectedCreator || selectedCreator.id !== targetCreator.id)) {
      setSelectedCreator(targetCreator);
    }

    const targetStatus = getCampaignStatus(targetCampaign);
    setTrackerView(targetStatus === "completed" ? "history" : targetStatus);

    setSearchQuery(targetCampaign.brand || "");
    setSelectedCampaign(targetCampaign);
    setIsDetailReadOnly(shouldOpenReadOnly);
    setDetailModalOpen(true);
    setHighlightedCampaignId(targetCampaignId);

    navigate(location.pathname, { replace: true, state: null });
  }, [
    campaigns,
    creators,
    isLoadingCampaigns,
    isLoadingCreators,
    location.pathname,
    location.state,
    navigate,
    selectedCreator,
  ]);

  useEffect(() => {
    if (!highlightedCampaignId || !selectedCreator) {
      return;
    }

    const scrollTimer = window.setTimeout(() => {
      highlightedRowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);

    const clearTimer = window.setTimeout(() => {
      setHighlightedCampaignId(null);
    }, 2200);

    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(clearTimer);
    };
  }, [highlightedCampaignId, selectedCreator]);

  useEffect(() => {
    if (!selectedCreator?.id) {
      return;
    }

    if (syncedCreatorIdsRef.current.has(selectedCreator.id)) {
      return;
    }

    syncedCreatorIdsRef.current.add(selectedCreator.id);
    void syncFromXero(selectedCreator.id, "auto");
  }, [selectedCreator?.id]);

  const creatorsWithActiveCampaigns = useMemo(() => {
    return creators.filter((creator) =>
      campaigns.some(
        (campaign) => campaign.creatorId === creator.id && getCampaignStatus(campaign) === "active"
      )
    );
  }, [campaigns, creators]);

  const creatorsWithHistoryCampaigns = useMemo(() => {
    return creators.filter((creator) =>
      campaigns.some(
        (campaign) =>
          campaign.creatorId === creator.id &&
          getCampaignStatus(campaign) === "completed"
      )
    );
  }, [campaigns, creators]);

  const creatorsWithPendingCampaigns = useMemo(() => {
    return creators.filter((creator) =>
      campaigns.some(
        (campaign) => campaign.creatorId === creator.id && getCampaignStatus(campaign) === "pending"
      )
    );
  }, [campaigns, creators]);

  const creatorsWithAnyCampaigns = useMemo(() => {
    return creators.filter((creator) =>
      campaigns.some((campaign) => campaign.creatorId === creator.id)
    );
  }, [campaigns, creators]);

  const creatorsForCurrentView =
    trackerView === "all"
      ? creatorsWithAnyCampaigns
      : trackerView === "active"
      ? creatorsWithActiveCampaigns
      : trackerView === "pending"
        ? creatorsWithPendingCampaigns
        : creatorsWithHistoryCampaigns;

  const updateCampaign = async (id: string | number, field: keyof CampaignData, value: string) => {
    const campaignId = String(id);

    const updates: Record<string, string | number | boolean | null> = {};

    if (field === "brand") updates.brand = value;
    if (field === "launchDate") updates.launch_date = value || null;
    if (field === "activity") updates.activity = value || null;
    if (field === "liveDate") updates.live_date = value || null;
    if (field === "agPrice") updates.ag_price = value === "" ? null : parseFloat(value);
    if (field === "creatorFee") updates.creator_fee = value === "" ? null : parseFloat(value);
    if (field === "shot") updates.shot = value || null;
    if (field === "complete") {
      updates.campaign_status = normalizeCampaignStatus(value);
      updates.complete = value === "Completed";
      if (value !== "Pending") {
        updates.completion_status = null;
      }
    }
    if (field === "secondaryStatus") {
      updates.completion_status = value === "Awaiting details" ? "awaiting_details" : null;
    }
    if (field === "invoiceNo") updates.invoice_no = value || null;
    if (field === "paid") updates.paid_date = value || null;
    if (field === "includesVat") updates.includes_vat = value || null;
    if (field === "currency") updates.currency = value || "GBP";
    if (field === "brandPOs") updates.brand_pos = value || null;
    if (field === "paymentTerms") updates.payment_terms = value || null;

    try {
      await updateCampaignMutation.mutateAsync({
        id: campaignId,
        updates,
      });
      toast.success("Campaign updated");
    } catch (mutationError: any) {
      toast.error(mutationError?.message || "Failed to update campaign");
    }
  };

  const updateFullCampaign = async (updatedCampaign: CampaignData) => {
    try {
      await updateCampaignMutation.mutateAsync({
        id: String(updatedCampaign.id),
        updates: {
          brand: updatedCampaign.brand,
          launch_date: updatedCampaign.launchDate || null,
          activity: updatedCampaign.activity || null,
          live_date: updatedCampaign.liveDate || null,
          ag_price: updatedCampaign.agPrice,
          creator_fee: updatedCampaign.creatorFee,
          shot: updatedCampaign.shot || null,
          complete: updatedCampaign.complete === "Completed",
          campaign_status: normalizeCampaignStatus(updatedCampaign.complete),
          completion_status: updatedCampaign.complete === "Pending" && updatedCampaign.secondaryStatus === "Awaiting details"
            ? "awaiting_details"
            : null,
          invoice_no: updatedCampaign.invoiceNo || null,
          paid_date: updatedCampaign.paid || null,
          includes_vat: updatedCampaign.includesVat || null,
          currency: updatedCampaign.currency || "GBP",
          brand_pos: updatedCampaign.brandPOs || null,
          payment_terms: updatedCampaign.paymentTerms || null,
          notes: updatedCampaign.notes || null,
        },
      });
      setSelectedCampaign(updatedCampaign);
    } catch (mutationError: any) {
      toast.error(mutationError?.message || "Failed to update campaign");
    }
  };

  const openCampaignDetail = (campaign: CampaignData) => {
    setIsDetailReadOnly(false);
    setSelectedCampaign(campaign);
    setDetailModalOpen(true);
  };

  const addNewRow = async () => {
    if (!selectedCreator) return;

    try {
      await createCampaign.mutateAsync({
        creator_id: selectedCreator.id,
        brand: "Untitled Campaign",
        currency: "GBP",
        campaign_status: trackerView === "history" ? "completed" : normalizeCampaignStatus(trackerView),
      });
      toast.success("New row added");
    } catch (mutationError: any) {
      toast.error(mutationError?.message || "Failed to add campaign");
    }
  };

  const deleteRow = async (id: string | number) => {
    try {
      await deleteCampaignMutation.mutateAsync(String(id));
      toast.success("Row deleted");
    } catch (mutationError: any) {
      toast.error(mutationError?.message || "Failed to delete campaign");
    }
  };

  const handleExcelUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedCreator) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const XLSX = await import("xlsx");
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        for (const row of jsonData as any[]) {
          const importedStatus = normalizeCampaignStatus(String(row.Status || row.status || "Pending"));

          await createCampaign.mutateAsync({
            creator_id: selectedCreator.id,
            brand: row.Brand || row.brand || "Untitled Campaign",
            launch_date: row["Launch Date"] || row.launchDate || null,
            activity: row.Activity || row.activity || null,
            live_date: row["Live Date"] || row.liveDate || null,
            ag_price: parseFloat(row["AG Price"] || row.agPrice) || null,
            creator_fee: parseFloat(row["Creator Fee"] || row.creatorFee) || null,
            shot: row.Shot || row.shot || null,
            complete: importedStatus === "completed",
            campaign_status: importedStatus,
            completion_status: String(
              row["Detail Status"] ||
              row.detailStatus ||
              row["Secondary Status"] ||
              row.secondaryStatus ||
              ""
            ).toLowerCase() === "awaiting details"
              ? "awaiting_details"
              : null,
            invoice_no: row["Invoice No"] || row.invoiceNo || null,
            paid_date: row.Paid || row.paid || null,
            includes_vat: row["Includes VAT"] || row.includesVat || null,
            currency: row.Currency || row.currency || "GBP",
            brand_pos: row["Brand POs"] || row.brandPOs || null,
            payment_terms: row["Payment Terms"] || row.paymentTerms || null,
          });
        }

        toast.success(`Imported ${jsonData.length} campaigns from Excel`);
      } catch (error) {
        console.error("Error parsing Excel file:", error);
        toast.error("Failed to parse Excel file. Please check the format.");
      }
    };
    reader.readAsArrayBuffer(file);
    
    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getStatusStyle = (status: string) => {
    if (status === "Completed") return "bg-green-500 text-white hover:bg-green-600";
    if (status === "Active") return "bg-blue-100 text-blue-800 hover:bg-blue-200";
    if (status === "Pending") return "bg-amber-100 text-amber-800 hover:bg-amber-200";
    return "bg-muted text-muted-foreground";
  };

  const getSecondaryStatusStyle = (status: string) => {
    if (status === "Awaiting details") return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
    if (status === "None") return "bg-muted text-muted-foreground";
    return "bg-muted text-muted-foreground";
  };

  const getPaidStyle = (paid: string) => {
    if (paid.includes("Oct") || paid.includes("OCT")) return "bg-purple-200 text-purple-900 hover:bg-purple-300";
    if (paid === "CHASED") return "bg-purple-500 text-white hover:bg-purple-600";
    if (paid === "NOV") return "bg-blue-200 text-blue-900 hover:bg-blue-300";
    if (paid === "DEC") return "bg-teal-200 text-teal-900 hover:bg-teal-300";
    return "bg-muted text-muted-foreground";
  };

  const getVatStyle = () => "bg-slate-100 text-slate-700 hover:bg-slate-200";
  const getCurrencyStyle = () => "bg-blue-100 text-blue-700 hover:bg-blue-200";

  const filteredCampaigns = creatorCampaigns.filter((campaign) =>
    campaign.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
    campaign.activity.toLowerCase().includes(searchQuery.toLowerCase()) ||
    campaign.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const zoomLevel = ZOOM_LEVELS[zoomIndex];

  const handleZoomIn = () => {
    if (zoomIndex < ZOOM_LEVELS.length - 1) {
      setZoomIndex((prev) => prev + 1);
    }
  };

  const handleZoomOut = () => {
    if (zoomIndex > 0) {
      setZoomIndex((prev) => prev - 1);
    }
  };

  // Show creator selector if no creator is selected
  if (isLoadingCampaigns || isLoadingCreators) {
    return (
      <DashboardLayout title="Campaign Tracker">
        <div className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
          Loading campaign tracker...
        </div>
      </DashboardLayout>
    );
  }

  if (!selectedCreator) {
    return (
      <DashboardLayout title="Campaign Tracker">
        <div className="mb-3 lg:mb-4 flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">View</span>
          <Select value={trackerView} onValueChange={(value) => setTrackerView(value as TrackerView)}>
            <SelectTrigger className="h-8 w-[190px] text-xs">
              <SelectValue placeholder="Select view" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ({allCampaignCount})</SelectItem>
              <SelectItem value="active">Active ({activeCampaignCount})</SelectItem>
              <SelectItem value="pending">Pending ({pendingCampaignCount})</SelectItem>
              <SelectItem value="history">History ({historyCampaignCount})</SelectItem>
            </SelectContent>
          </Select>
          {trackerView !== "all" && (
            <Badge variant="secondary" className="text-[10px] font-medium">
              Showing {TRACKER_VIEW_LABELS[trackerView].toLowerCase()} campaigns
            </Badge>
          )}
        </div>
        <CreatorSelector
          creators={creatorsForCurrentView}
          onSelect={setSelectedCreator}
          emptyStateMessage={
            trackerView === "all"
              ? "No creators with campaigns"
              : trackerView === "active"
              ? "No creators with active campaigns"
              : trackerView === "pending"
                ? "No creators with pending campaigns"
                : "No creators with completed campaigns"
          }
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Campaign Tracker">
      <div className="space-y-5 lg:space-y-6 animate-fade-in">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">View</span>
          <Select
            value={trackerView}
            onValueChange={(value) => {
              setTrackerView(value as TrackerView);
              setSelectedCreator(null);
              setSearchQuery("");
            }}
          >
            <SelectTrigger className="h-8 w-[190px] text-xs">
              <SelectValue placeholder="Select view" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ({allCampaignCount})</SelectItem>
              <SelectItem value="active">Active ({activeCampaignCount})</SelectItem>
              <SelectItem value="pending">Pending ({pendingCampaignCount})</SelectItem>
              <SelectItem value="history">History ({historyCampaignCount})</SelectItem>
            </SelectContent>
          </Select>
          {trackerView !== "all" && (
            <Badge variant="secondary" className="text-[10px] font-medium">
              Showing {TRACKER_VIEW_LABELS[trackerView].toLowerCase()} campaigns
            </Badge>
          )}
        </div>

        {/* Creator Header */}
        <div className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedCreator(null)}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Avatar className="w-12 h-12 ring-2 ring-primary/20">
            <AvatarImage src={selectedCreator.avatar} alt={selectedCreator.name} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {selectedCreator.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-foreground">{selectedCreator.name}</h2>
            <p className="text-sm text-muted-foreground">{selectedCreator.handle}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total Campaigns</p>
            <p className="text-2xl font-bold text-primary">{creatorCampaigns.length}</p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-3 lg:gap-4 justify-between">
          <div className="flex gap-2 sm:gap-3">
            <div className="relative flex-1 sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search campaigns..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-1 border border-border rounded-md">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomOut}
                disabled={zoomIndex === 0}
                className="h-9 w-9"
                title="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground min-w-[50px] text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomIn}
                disabled={zoomIndex === ZOOM_LEVELS.length - 1}
                className="h-9 w-9"
                title="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="flex gap-2 sm:gap-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleExcelUpload}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => selectedCreator && void syncFromXero(selectedCreator.id, "manual")}
              className="gap-2"
              disabled={syncCampaignsFromXero.isPending}
            >
              <RefreshCw className={`w-4 h-4 ${syncCampaignsFromXero.isPending ? "animate-spin" : ""}`} />
              {syncCampaignsFromXero.isPending ? "Syncing Xero..." : "Sync Xero"}
            </Button>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              Import Excel
            </Button>
            <Button onClick={addNewRow} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Add Row
            </Button>
          </div>
        </div>

        {/* Campaigns Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto" style={{ transform: 'scaleY(-1)' }}>
            <Table style={{ fontSize: `${zoomLevel}rem`, transform: 'scaleY(-1)' }} className="transition-all duration-200">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold text-foreground whitespace-nowrap w-10"></TableHead>
                  <TableHead className="font-semibold text-foreground whitespace-nowrap w-10"></TableHead>
                  <TableHead className="font-semibold text-foreground whitespace-nowrap">Brand</TableHead>
                  <TableHead className="font-semibold text-foreground whitespace-nowrap">Launch Date</TableHead>
                  <TableHead className="font-semibold text-foreground min-w-[200px]">Activity</TableHead>
                  <TableHead className="font-semibold text-foreground whitespace-nowrap">Live Date</TableHead>
                  <TableHead className="font-semibold text-foreground whitespace-nowrap text-right">AG Price</TableHead>
                  <TableHead className="font-semibold text-foreground whitespace-nowrap text-right">Lauren Fee</TableHead>
                  <TableHead className="font-semibold text-foreground whitespace-nowrap">Shot</TableHead>
                  <TableHead className="font-semibold text-foreground whitespace-nowrap">Status</TableHead>
                  <TableHead className="font-semibold text-foreground whitespace-nowrap">Detail Status</TableHead>
                  <TableHead className="font-semibold text-foreground whitespace-nowrap">Invoice No</TableHead>
                  <TableHead className="font-semibold text-foreground whitespace-nowrap">Paid</TableHead>
                  <TableHead className="font-semibold text-foreground whitespace-nowrap">Includes VAT</TableHead>
                  <TableHead className="font-semibold text-foreground whitespace-nowrap">Currency</TableHead>
                  <TableHead className="font-semibold text-foreground whitespace-nowrap">Brand POs</TableHead>
                  <TableHead className="font-semibold text-foreground whitespace-nowrap">Payment Terms</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCampaigns.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={17} className="py-8 text-center text-sm text-muted-foreground">
                      No campaigns found for this creator in the selected view
                    </TableCell>
                  </TableRow>
                )}
                {filteredCampaigns.map((campaign) => {
                  const isHighlighted = highlightedCampaignId === String(campaign.id);

                  return (
                  <TableRow
                    key={campaign.id}
                    ref={isHighlighted ? highlightedRowRef : null}
                    className={`hover:bg-muted/30 transition-colors group ${isHighlighted ? "bg-primary/10" : ""}`}
                  >
                    <TableCell className="w-10">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                        onClick={() => openCampaignDetail(campaign)}
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                    <TableCell className="w-10">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => void deleteRow(campaign.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">
                      <EditableCell
                        value={campaign.brand}
                        onChange={(v) => void updateCampaign(campaign.id, "brand", v)}
                        displayClassName="font-medium text-foreground"
                      />
                    </TableCell>
                    <TableCell>
                      <DatePickerCell
                        value={campaign.launchDate}
                        onChange={(v) => void updateCampaign(campaign.id, "launchDate", v)}
                        displayClassName="text-muted-foreground"
                      />
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      <EditableCell
                        value={campaign.activity}
                        onChange={(v) => void updateCampaign(campaign.id, "activity", v)}
                        type="textarea"
                        displayClassName="text-sm text-muted-foreground"
                      />
                    </TableCell>
                    <TableCell>
                      <DatePickerCell
                        value={campaign.liveDate}
                        onChange={(v) => void updateCampaign(campaign.id, "liveDate", v)}
                        displayClassName="text-muted-foreground"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <EditableCell
                        value={campaign.agPrice}
                        onChange={(v) => void updateCampaign(campaign.id, "agPrice", v)}
                        type="number"
                        formatAsCurrency
                        displayClassName="font-medium text-foreground justify-end"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-muted-foreground">
                        {campaign.agPrice != null ? `£${(campaign.agPrice * 0.8).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <EditableCell
                        value={campaign.shot}
                        onChange={(v) => void updateCampaign(campaign.id, "shot", v)}
                        displayClassName="text-muted-foreground"
                      />
                    </TableCell>
                    <TableCell>
                      <StatusSelect
                        value={campaign.complete}
                        onChange={(v) => void updateCampaign(campaign.id, "complete", v)}
                        options={statusOptions}
                        getStyle={getStatusStyle}
                        placeholder="Status"
                      />
                    </TableCell>
                    <TableCell>
                      <StatusSelect
                        value={campaign.secondaryStatus || ""}
                        onChange={(v) => void updateCampaign(campaign.id, "secondaryStatus", v)}
                        options={secondaryStatusOptions}
                        getStyle={getSecondaryStatusStyle}
                        placeholder="Status"
                      />
                    </TableCell>
                    <TableCell>
                      <EditableCell
                        value={campaign.invoiceNo}
                        onChange={(v) => void updateCampaign(campaign.id, "invoiceNo", v)}
                        displayClassName="text-muted-foreground"
                      />
                    </TableCell>
                    <TableCell>
                      <StatusSelect
                        value={campaign.paid}
                        onChange={(v) => void updateCampaign(campaign.id, "paid", v)}
                        options={paidOptions}
                        getStyle={getPaidStyle}
                        placeholder="Payment"
                      />
                    </TableCell>
                    <TableCell>
                      <StatusSelect
                        value={campaign.includesVat}
                        onChange={(v) => void updateCampaign(campaign.id, "includesVat", v)}
                        options={vatOptions}
                        getStyle={getVatStyle}
                        placeholder="VAT"
                      />
                    </TableCell>
                    <TableCell>
                      <StatusSelect
                        value={campaign.currency}
                        onChange={(v) => void updateCampaign(campaign.id, "currency", v)}
                        options={currencyOptions}
                        getStyle={getCurrencyStyle}
                        placeholder="Currency"
                      />
                    </TableCell>
                    <TableCell>
                      <EditableCell
                        value={campaign.brandPOs}
                        onChange={(v) => void updateCampaign(campaign.id, "brandPOs", v)}
                        displayClassName="text-muted-foreground"
                      />
                    </TableCell>
                    <TableCell>
                      <EditableCell
                        value={campaign.paymentTerms}
                        onChange={(v) => void updateCampaign(campaign.id, "paymentTerms", v)}
                        displayClassName="text-muted-foreground"
                      />
                    </TableCell>
                  </TableRow>
                )})}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Campaign Detail Modal */}
      {selectedCreator && (
        <CampaignDetailModal
          campaign={selectedCampaign}
          creator={selectedCreator}
          open={detailModalOpen}
          onOpenChange={(open) => {
            setDetailModalOpen(open);
            if (!open) {
              setIsDetailReadOnly(false);
            }
          }}
          onUpdateCampaign={(campaign) => void updateFullCampaign(campaign)}
          readOnly={isDetailReadOnly}
        />
      )}
    </DashboardLayout>
  );
};

export default CampaignTracker;
