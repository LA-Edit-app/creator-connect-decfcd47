import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, ChevronLeft } from "lucide-react";
import { useCreateCampaign } from "@/hooks/useCampaigns";
import type { ColumnDefinition } from "@/hooks/useColumnSchemas";
import { SYSTEM_COLUMN_KEYS } from "@/hooks/useColumnSchemas";
import type { Creator } from "@/data/campaignTrackerData";
import { DatePickerCell } from "@/components/campaign-tracker/DatePickerCell";
import { toast } from "sonner";

// ── Static select options for built-in system columns ────────────────────────
const SYSTEM_SELECT_OPTIONS: Record<string, { value: string; label: string }[]> = {
  complete: [
    { value: "Pending", label: "Pending" },
    { value: "Active", label: "Active" },
    { value: "Completed", label: "Completed" },
  ],
  detailStatus: [
    { value: "None", label: "None" },
    { value: "Awaiting details", label: "Awaiting details" },
  ],
  paid: [
    { value: "CHASED", label: "CHASED" },
    { value: "17 Oct", label: "17 Oct" },
    { value: "OCT", label: "OCT" },
    { value: "NOV", label: "NOV" },
    { value: "DEC", label: "DEC" },
  ],
  includesVat: [
    { value: "VAT", label: "VAT" },
    { value: "NO VAT", label: "NO VAT" },
  ],
  currency: [
    { value: "GBP", label: "GBP" },
    { value: "EUR", label: "EUR" },
  ],
};

const normalizeCampaignStatus = (value: string): "pending" | "active" | "completed" => {
  const n = (value || "").trim().toLowerCase();
  if (n === "active") return "active";
  if (n === "completed") return "completed";
  return "pending";
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creators: Creator[];
  activeColumns: ColumnDefinition[];
  /** If provided the dialog skips the creator selection step. */
  preselectedCreatorId?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const CreateCampaignDialog = ({
  open,
  onOpenChange,
  creators,
  activeColumns,
  preselectedCreatorId,
}: Props) => {
  const createCampaign = useCreateCampaign();

  const [step, setStep] = useState<"creator" | "form">("creator");
  const [selectedCreatorId, setSelectedCreatorId] = useState<string>("");
  const [creatorSearch, setCreatorSearch] = useState("");
  const [values, setValues] = useState<Record<string, string>>({
    currency: "GBP",
    complete: "Pending",
  });

  // Sync state whenever the dialog opens/closes or the preselected creator changes
  useEffect(() => {
    if (open) {
      if (preselectedCreatorId) {
        setStep("form");
        setSelectedCreatorId(preselectedCreatorId);
      } else {
        setStep("creator");
        setSelectedCreatorId("");
      }
      setCreatorSearch("");
      setValues({ currency: "GBP", complete: "Pending" });
    }
  }, [open, preselectedCreatorId]);

  const selectedCreator = creators.find((c) => c.id === selectedCreatorId);

  const filteredCreators = creators.filter(
    (c) =>
      c.name.toLowerCase().includes(creatorSearch.toLowerCase()) ||
      c.handle.toLowerCase().includes(creatorSearch.toLowerCase())
  );

  const setValue = (key: string, value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const handleSelectCreator = (creatorId: string) => {
    setSelectedCreatorId(creatorId);
    setStep("form");
  };

  const handleSubmit = async () => {
    if (!selectedCreatorId) {
      toast.error("Please select a creator");
      return;
    }
    if (!values.brand?.trim()) {
      toast.error("Brand is required");
      return;
    }

    // Collect custom (non-system) column values
    const customFields: Record<string, unknown> = {};
    for (const col of activeColumns) {
      if (!SYSTEM_COLUMN_KEYS.has(col.key) && values[col.key] !== undefined && values[col.key] !== "") {
        customFields[col.key] =
          col.type === "number" || col.type === "currency"
            ? parseFloat(values[col.key]) || null
            : values[col.key];
      }
    }

    try {
      await createCampaign.mutateAsync({
        creator_id: selectedCreatorId,
        brand: values.brand.trim(),
        launch_date: values.launchDate || null,
        activity: values.activity || null,
        live_date: values.liveDate || null,
        ag_price: values.agPrice ? parseFloat(values.agPrice) : null,
        creator_fee: values.creatorFee ? parseFloat(values.creatorFee) : null,
        shot: values.shot || null,
        complete: values.complete === "Completed",
        campaign_status: normalizeCampaignStatus(values.complete || "Pending"),
        completion_status:
          values.detailStatus === "Awaiting details" ? "awaiting_details" : null,
        invoice_no: values.invoiceNo || null,
        paid_date: values.paid || null,
        includes_vat: values.includesVat || null,
        currency: values.currency || "GBP",
        brand_pos: values.brandPOs || null,
        payment_terms: values.paymentTerms || null,
        notes: values.notes || null,
      });

      toast.success("Campaign created");
      onOpenChange(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create campaign";
      toast.error(message);
    }
  };

  const renderField = (col: ColumnDefinition) => {
    // Use col.options from the schema if non-empty; otherwise fall back to the
    // hardcoded system defaults (covers the case where a published schema has
    // options: [] for a system column due to the admin not setting them).
    const schemaOptions = Array.isArray(col.options) && col.options.length > 0
      ? col.options
      : (SYSTEM_SELECT_OPTIONS[col.key] ?? []);
    // Mirror StatusSelect logic: if value is "" fall back to label (legacy schemas
    // stored options with value:"" and label:"Instagram" before the editor was
    // updated to keep them in sync). Then filter any remaining empty values since
    // Radix UI v2 throws on <SelectItem value="">.
    const options = schemaOptions
      .map((opt) => (opt.value === "" || opt.value == null) ? { ...opt, value: opt.label } : opt)
      .filter((opt) => opt.value != null && opt.value !== "");

    switch (col.type) {
      case "select":
        return (
          <Select
            value={values[col.key] ?? ""}
            onValueChange={(val) => setValue(col.key, val)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder={`Select ${col.label}`} />
            </SelectTrigger>
            <SelectContent>
              {options.length === 0 ? (
                <SelectItem value="_no_options_" disabled>
                  No options configured
                </SelectItem>
              ) : (
                options.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        );

      case "boolean":
        return (
          <Select
            value={values[col.key] ?? ""}
            onValueChange={(val) => setValue(col.key, val)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Yes">Yes</SelectItem>
              <SelectItem value="No">No</SelectItem>
            </SelectContent>
          </Select>
        );

      case "date":
        return (
          <DatePickerCell
            value={values[col.key] ?? ""}
            onChange={(v) => setValue(col.key, v)}
            displayClassName="h-9 w-full border border-input rounded-md bg-background hover:bg-accent/50"
          />
        );

      case "currency":
      case "number":
        return (
          <Input
            className="h-9"
            type="number"
            placeholder={col.type === "currency" ? "0.00" : "0"}
            step={col.type === "currency" ? "0.01" : "1"}
            min="0"
            value={values[col.key] ?? ""}
            onChange={(e) => setValue(col.key, e.target.value)}
          />
        );

      default:
        return (
          <Input
            className="h-9"
            placeholder={col.label}
            value={values[col.key] ?? ""}
            onChange={(e) => setValue(col.key, e.target.value)}
          />
        );
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-w-2xl flex flex-col max-h-[88vh]">
        {/* ── Step indicator ───────────────────────────────────────────────── */}
        {!preselectedCreatorId && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
            <span
              className={`flex items-center gap-1 ${
                step === "creator" ? "text-primary font-medium" : ""
              }`}
            >
              <span
                className={`inline-flex w-5 h-5 rounded-full items-center justify-center text-[10px] font-bold ${
                  step === "creator"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                1
              </span>
              Select creator
            </span>
            <span className="h-px w-6 bg-border" />
            <span
              className={`flex items-center gap-1 ${
                step === "form" ? "text-primary font-medium" : ""
              }`}
            >
              <span
                className={`inline-flex w-5 h-5 rounded-full items-center justify-center text-[10px] font-bold ${
                  step === "form"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                2
              </span>
              Campaign details
            </span>
          </div>
        )}

        <DialogHeader>
          <DialogTitle>
            {step === "creator" ? "Select Creator" : "Create Campaign"}
          </DialogTitle>
        </DialogHeader>

        {/* ── Step 1: creator picker ──────────────────────────────────────── */}
        {step === "creator" && (
          <div className="flex flex-col gap-3 min-h-0 flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search creators..."
                className="pl-9 h-9"
                value={creatorSearch}
                onChange={(e) => setCreatorSearch(e.target.value)}
              />
            </div>

            <div className="overflow-y-auto flex-1 space-y-1.5 pr-1">
              {filteredCreators.map((creator) => (
                <button
                  key={creator.id}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 hover:border-primary/40 transition-colors text-left"
                  onClick={() => handleSelectCreator(creator.id)}
                >
                  <Avatar className="w-9 h-9 shrink-0">
                    <AvatarImage src={creator.avatar} alt={creator.name} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {creator.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground">{creator.name}</p>
                    <p className="text-xs text-muted-foreground">{creator.handle}</p>
                  </div>
                  {creator.platforms.length > 0 && (
                    <p className="text-xs text-muted-foreground shrink-0">
                      {creator.platforms.join(" · ")}
                    </p>
                  )}
                </button>
              ))}

              {filteredCreators.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No creators found
                </p>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* ── Step 2: campaign form ───────────────────────────────────────── */}
        {step === "form" && (
          <>
            {/* Creator badge */}
            {selectedCreator && (
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/40 border border-border">
                <Avatar className="w-7 h-7 shrink-0">
                  <AvatarImage src={selectedCreator.avatar} alt={selectedCreator.name} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {selectedCreator.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground leading-none">
                    {selectedCreator.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{selectedCreator.handle}</p>
                </div>
                {!preselectedCreatorId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setStep("creator")}
                  >
                    Change
                  </Button>
                )}
              </div>
            )}

            {/* Fields grid */}
            <div className="overflow-y-auto flex-1 min-h-0 pr-1">
              <div className="grid grid-cols-2 gap-x-5 gap-y-3 py-1">
                {activeColumns.map((col) => (
                  <div
                    key={col.key}
                    className={`space-y-1.5 ${col.width === "wide" ? "col-span-2" : ""}`}
                  >
                    <Label className="text-xs font-medium text-muted-foreground">
                      {col.label}
                      {col.required && (
                        <span className="text-destructive ml-0.5">*</span>
                      )}
                    </Label>
                    {renderField(col)}
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="border-t pt-4 mt-1">
              {!preselectedCreatorId && (
                <Button
                  variant="outline"
                  onClick={() => setStep("creator")}
                  className="mr-auto"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              )}
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => void handleSubmit()}
                disabled={createCampaign.isPending}
              >
                {createCampaign.isPending ? "Creating..." : "Create Campaign"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
