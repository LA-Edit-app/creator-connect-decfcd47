import { useState, useMemo, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Search, Filter, Plus, Trash2, ArrowLeft, Eye, Upload, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EditableCell } from "@/components/campaign-tracker/EditableCell";
import { StatusSelect } from "@/components/campaign-tracker/StatusSelect";
import { CreatorSelector } from "@/components/campaign-tracker/CreatorSelector";
import { CampaignDetailModal } from "@/components/campaign-tracker/CampaignDetailModal";
import { CampaignData, Creator, initialCampaignData, creators } from "@/data/campaignTrackerData";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import * as XLSX from "xlsx";

const completeOptions = [
  { value: "✓", label: "✓" },
  { value: "AWAITING DETAILS", label: "AWAITING DETAILS" },
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

const CampaignTracker = () => {
  const [campaigns, setCampaigns] = useState<CampaignData[]>(initialCampaignData);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignData | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const creatorCampaigns = useMemo(() => {
    if (!selectedCreator) return [];
    return campaigns.filter((c) => c.creatorId === selectedCreator.id);
  }, [campaigns, selectedCreator]);

  const updateCampaign = (id: number, field: keyof CampaignData, value: string) => {
    setCampaigns((prev) =>
      prev.map((campaign) => {
        if (campaign.id !== id) return campaign;

        if (field === "agPrice" || field === "creatorFee") {
          const numValue = value === "" ? null : parseFloat(value);
          return { ...campaign, [field]: numValue };
        }

        return { ...campaign, [field]: value };
      })
    );
    toast.success("Campaign updated");
  };

  const updateFullCampaign = (updatedCampaign: CampaignData) => {
    setCampaigns((prev) =>
      prev.map((c) => (c.id === updatedCampaign.id ? updatedCampaign : c))
    );
    setSelectedCampaign(updatedCampaign);
  };

  const openCampaignDetail = (campaign: CampaignData) => {
    setSelectedCampaign(campaign);
    setDetailModalOpen(true);
  };

  const addNewRow = () => {
    if (!selectedCreator) return;
    const newId = Math.max(...campaigns.map((c) => c.id)) + 1;
    const newCampaign: CampaignData = {
      id: newId,
      creatorId: selectedCreator.id,
      brand: "",
      launchDate: "",
      activity: "",
      liveDate: "",
      agPrice: null,
      creatorFee: null,
      shot: "",
      complete: "",
      invoiceNo: "",
      paid: "",
      includesVat: "",
      currency: "",
      brandPOs: "",
      paymentTerms: "",
      content: [],
    };
    setCampaigns((prev) => [...prev, newCampaign]);
    toast.success("New row added");
  };

  const deleteRow = (id: number) => {
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
    toast.success("Row deleted");
  };

  const handleExcelUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedCreator) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const maxId = Math.max(...campaigns.map((c) => c.id), 0);
        
        const newCampaigns: CampaignData[] = jsonData.map((row: any, index: number) => ({
          id: maxId + index + 1,
          creatorId: selectedCreator.id,
          brand: row.Brand || row.brand || "",
          launchDate: row["Launch Date"] || row.launchDate || "",
          activity: row.Activity || row.activity || "",
          liveDate: row["Live Date"] || row.liveDate || "",
          agPrice: parseFloat(row["AG Price"] || row.agPrice) || null,
          creatorFee: parseFloat(row["Creator Fee"] || row.creatorFee) || null,
          shot: row.Shot || row.shot || "",
          complete: row.Complete || row.complete || "",
          invoiceNo: row["Invoice No"] || row.invoiceNo || "",
          paid: row.Paid || row.paid || "",
          includesVat: row["Includes VAT"] || row.includesVat || "",
          currency: row.Currency || row.currency || "GBP",
          brandPOs: row["Brand POs"] || row.brandPOs || "",
          paymentTerms: row["Payment Terms"] || row.paymentTerms || "",
          content: [],
        }));

        setCampaigns((prev) => [...prev, ...newCampaigns]);
        toast.success(`Imported ${newCampaigns.length} campaigns from Excel`);
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

  const getCompleteStyle = (complete: string) => {
    if (complete === "✓") return "bg-green-500 text-white hover:bg-green-600";
    if (complete === "AWAITING DETAILS") return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
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
  if (!selectedCreator) {
    return (
      <DashboardLayout title="Campaign Tracker">
        <CreatorSelector creators={creators} onSelect={setSelectedCreator} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Campaign Tracker">
      <div className="space-y-6 animate-fade-in">
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
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-3">
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
          <div className="flex gap-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleExcelUpload}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />
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
          <div className="overflow-x-auto overflow-y-visible" style={{ overflowX: 'auto', overscrollBehaviorX: 'contain' }}>
            <Table style={{ fontSize: `${zoomLevel}rem` }} className="transition-all duration-200">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold text-foreground whitespace-nowrap w-10"></TableHead>
                  <TableHead className="font-semibold text-foreground whitespace-nowrap w-10"></TableHead>
                  <TableHead className="font-semibold text-foreground whitespace-nowrap">Brand</TableHead>
                  <TableHead className="font-semibold text-foreground whitespace-nowrap">Launch Date</TableHead>
                  <TableHead className="font-semibold text-foreground min-w-[200px]">Activity</TableHead>
                  <TableHead className="font-semibold text-foreground whitespace-nowrap">Live Date</TableHead>
                  <TableHead className="font-semibold text-foreground whitespace-nowrap text-right">AG Price</TableHead>
                  <TableHead className="font-semibold text-foreground whitespace-nowrap text-right">{selectedCreator.name.split(" ")[0]} Fee</TableHead>
                  <TableHead className="font-semibold text-foreground whitespace-nowrap">Shot</TableHead>
                  <TableHead className="font-semibold text-foreground whitespace-nowrap">Complete</TableHead>
                  <TableHead className="font-semibold text-foreground whitespace-nowrap">Invoice No</TableHead>
                  <TableHead className="font-semibold text-foreground whitespace-nowrap">Paid</TableHead>
                  <TableHead className="font-semibold text-foreground whitespace-nowrap">Includes VAT</TableHead>
                  <TableHead className="font-semibold text-foreground whitespace-nowrap">Currency</TableHead>
                  <TableHead className="font-semibold text-foreground whitespace-nowrap">Brand POs</TableHead>
                  <TableHead className="font-semibold text-foreground whitespace-nowrap">Payment Terms</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCampaigns.map((campaign) => (
                  <TableRow key={campaign.id} className="hover:bg-muted/30 transition-colors group">
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
                        onClick={() => deleteRow(campaign.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">
                      <EditableCell
                        value={campaign.brand}
                        onChange={(v) => updateCampaign(campaign.id, "brand", v)}
                        displayClassName="font-medium text-foreground"
                      />
                    </TableCell>
                    <TableCell>
                      <EditableCell
                        value={campaign.launchDate}
                        onChange={(v) => updateCampaign(campaign.id, "launchDate", v)}
                        displayClassName="text-muted-foreground"
                      />
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      <EditableCell
                        value={campaign.activity}
                        onChange={(v) => updateCampaign(campaign.id, "activity", v)}
                        type="textarea"
                        displayClassName="text-sm text-muted-foreground"
                      />
                    </TableCell>
                    <TableCell>
                      <EditableCell
                        value={campaign.liveDate}
                        onChange={(v) => updateCampaign(campaign.id, "liveDate", v)}
                        displayClassName="text-muted-foreground"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <EditableCell
                        value={campaign.agPrice}
                        onChange={(v) => updateCampaign(campaign.id, "agPrice", v)}
                        type="number"
                        displayClassName="font-medium text-foreground justify-end"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <EditableCell
                        value={campaign.creatorFee}
                        onChange={(v) => updateCampaign(campaign.id, "creatorFee", v)}
                        type="number"
                        displayClassName="text-muted-foreground justify-end"
                      />
                    </TableCell>
                    <TableCell>
                      <EditableCell
                        value={campaign.shot}
                        onChange={(v) => updateCampaign(campaign.id, "shot", v)}
                        displayClassName="text-muted-foreground"
                      />
                    </TableCell>
                    <TableCell>
                      <StatusSelect
                        value={campaign.complete}
                        onChange={(v) => updateCampaign(campaign.id, "complete", v)}
                        options={completeOptions}
                        getStyle={getCompleteStyle}
                        placeholder="Status"
                      />
                    </TableCell>
                    <TableCell>
                      <EditableCell
                        value={campaign.invoiceNo}
                        onChange={(v) => updateCampaign(campaign.id, "invoiceNo", v)}
                        displayClassName="text-muted-foreground"
                      />
                    </TableCell>
                    <TableCell>
                      <StatusSelect
                        value={campaign.paid}
                        onChange={(v) => updateCampaign(campaign.id, "paid", v)}
                        options={paidOptions}
                        getStyle={getPaidStyle}
                        placeholder="Payment"
                      />
                    </TableCell>
                    <TableCell>
                      <StatusSelect
                        value={campaign.includesVat}
                        onChange={(v) => updateCampaign(campaign.id, "includesVat", v)}
                        options={vatOptions}
                        getStyle={getVatStyle}
                        placeholder="VAT"
                      />
                    </TableCell>
                    <TableCell>
                      <StatusSelect
                        value={campaign.currency}
                        onChange={(v) => updateCampaign(campaign.id, "currency", v)}
                        options={currencyOptions}
                        getStyle={getCurrencyStyle}
                        placeholder="Currency"
                      />
                    </TableCell>
                    <TableCell>
                      <EditableCell
                        value={campaign.brandPOs}
                        onChange={(v) => updateCampaign(campaign.id, "brandPOs", v)}
                        displayClassName="text-muted-foreground"
                      />
                    </TableCell>
                    <TableCell>
                      <EditableCell
                        value={campaign.paymentTerms}
                        onChange={(v) => updateCampaign(campaign.id, "paymentTerms", v)}
                        displayClassName="text-muted-foreground"
                      />
                    </TableCell>
                  </TableRow>
                ))}
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
          onOpenChange={setDetailModalOpen}
          onUpdateCampaign={updateFullCampaign}
        />
      )}
    </DashboardLayout>
  );
};

export default CampaignTracker;
