import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { CampaignData, ContentItem, Creator } from "@/data/campaignTrackerData";
import {
  Calendar,
  PoundSterling,
  FileText,
  Image,
  Video,
  Plus,
  ExternalLink,
  Instagram,
  Trash2,
  Mail,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ShareContentDialog } from "./ShareContentDialog";

interface CampaignDetailModalProps {
  campaign: CampaignData | null;
  creator: Creator;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateCampaign: (campaign: CampaignData) => void;
}

const contentTypeIcons = {
  image: Image,
  video: Video,
  reel: Video,
  story: Instagram,
  carousel: Image,
};

const statusColors = {
  draft: "bg-slate-100 text-slate-700",
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-blue-100 text-blue-700",
  published: "bg-green-100 text-green-700",
};

export const CampaignDetailModal = ({
  campaign,
  creator,
  open,
  onOpenChange,
  onUpdateCampaign,
}: CampaignDetailModalProps) => {
  const [activeTab, setActiveTab] = useState("details");
  const [notes, setNotes] = useState(campaign?.notes || "");

  useEffect(() => {
    setNotes(campaign?.notes || "");
  }, [campaign?.id]);
  const [showAddContent, setShowAddContent] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [newContent, setNewContent] = useState<Partial<ContentItem>>({
    type: "reel",
    title: "",
    platform: "Instagram",
    status: "draft",
    source: "LA Edit app",
  });

  if (!campaign) return null;

  const handleNotesChange = (value: string) => {
    setNotes(value);
    onUpdateCampaign({ ...campaign, notes: value });
  };

  const handleAddContent = () => {
    if (!newContent.title) {
      toast.error("Please enter a title for the content");
      return;
    }

    const contentItem: ContentItem = {
      id: `content-${Date.now()}`,
      type: newContent.type as ContentItem["type"],
      title: newContent.title,
      platform: newContent.platform || "Instagram",
      status: newContent.status as ContentItem["status"],
      url: newContent.url,
      dueDate: newContent.dueDate,
      notes: newContent.notes,
      source: newContent.source || "LA Edit app",
    };

    const updatedContent = [...(campaign.content || []), contentItem];
    onUpdateCampaign({ ...campaign, content: updatedContent });
    setNewContent({
      type: "reel",
      title: "",
      platform: "Instagram",
      status: "draft",
      source: "LA Edit app",
    });
    setShowAddContent(false);
    toast.success("Content added");
  };

  const handleDeleteContent = (contentId: string) => {
    const updatedContent = (campaign.content || []).filter(
      (c) => c.id !== contentId
    );
    onUpdateCampaign({ ...campaign, content: updatedContent });
    toast.success("Content removed");
  };

  const handleUpdateContentStatus = (
    contentId: string,
    status: ContentItem["status"]
  ) => {
    const updatedContent = (campaign.content || []).map((c) =>
      c.id === contentId ? { ...c, status } : c
    );
    onUpdateCampaign({ ...campaign, content: updatedContent });
    toast.success("Status updated");
  };

  const handleShareContent = (content: ContentItem) => {
    setSelectedContent(content);
    setShareDialogOpen(true);
  };

  const getCompleteStyle = (complete: string) => {
    if (complete === "✓") return "bg-green-100 text-green-700";
    if (complete === "AWAITING DETAILS")
      return "bg-yellow-100 text-yellow-700";
    return "bg-slate-100 text-slate-700";
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-xl font-bold text-foreground">
                  {campaign.brand}
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {creator.name} • {campaign.launchDate}
                </p>
              </div>
              {campaign.complete && (
                <Badge className={getCompleteStyle(campaign.complete)}>
                  {campaign.complete === "✓" ? "Complete" : campaign.complete}
                </Badge>
              )}
            </div>
          </DialogHeader>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 overflow-hidden flex flex-col"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="content">
                Content ({campaign.content?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4">
              <TabsContent value="details" className="m-0 space-y-6">
                {/* Activity */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Activity
                  </h4>
                  <p className="text-foreground whitespace-pre-wrap bg-muted/50 rounded-lg p-3">
                    {campaign.activity || "No activity description"}
                  </p>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Launch Date
                    </h4>
                    <p className="text-foreground font-medium">
                      {campaign.launchDate || "-"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Live Date
                    </h4>
                    <p className="text-foreground font-medium">
                      {campaign.liveDate || "-"}
                    </p>
                  </div>
                </div>

                {/* Pricing */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <PoundSterling className="w-4 h-4" />
                      AG Price
                    </h4>
                    <p className="text-foreground font-medium text-lg">
                      {campaign.agPrice !== null
                        ? `${campaign.currency || ""} ${campaign.agPrice.toLocaleString()}`
                        : "-"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <PoundSterling className="w-4 h-4" />
                      Creator Fee
                    </h4>
                    <p className="text-foreground font-medium text-lg">
                      {campaign.creatorFee !== null
                        ? `${campaign.currency || ""} ${campaign.creatorFee.toLocaleString()}`
                        : "-"}
                    </p>
                  </div>
                </div>

                {/* Payment Info */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">Invoice No</p>
                    <p className="text-sm font-medium text-foreground">
                      {campaign.invoiceNo || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Paid</p>
                    <p className="text-sm font-medium text-foreground">
                      {campaign.paid || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">VAT</p>
                    <p className="text-sm font-medium text-foreground">
                      {campaign.includesVat || "-"}
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="content" className="m-0 space-y-4">
                {/* Add Content Button */}
                {!showAddContent ? (
                  <Button
                    variant="outline"
                    className="w-full border-dashed"
                    onClick={() => setShowAddContent(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Content
                  </Button>
                ) : (
                  <div className="p-4 border border-border rounded-lg space-y-4 bg-muted/30">
                    <h4 className="font-medium text-foreground">Add New Content</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                          Title
                        </label>
                        <Input
                          placeholder="Content title"
                          value={newContent.title}
                          onChange={(e) =>
                            setNewContent({ ...newContent, title: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                          Type
                        </label>
                        <Select
                          value={newContent.type}
                          onValueChange={(v) =>
                            setNewContent({
                              ...newContent,
                              type: v as ContentItem["type"],
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="reel">Reel</SelectItem>
                            <SelectItem value="story">Story</SelectItem>
                            <SelectItem value="carousel">Carousel</SelectItem>
                            <SelectItem value="image">Image</SelectItem>
                            <SelectItem value="video">Video</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                          Platform
                        </label>
                        <Select
                          value={newContent.platform}
                          onValueChange={(v) =>
                            setNewContent({ ...newContent, platform: v })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Instagram">Instagram</SelectItem>
                            <SelectItem value="TikTok">TikTok</SelectItem>
                            <SelectItem value="YouTube">YouTube</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                          URL (optional)
                        </label>
                        <Input
                          placeholder="https://..."
                          value={newContent.url || ""}
                          onChange={(e) =>
                            setNewContent({ ...newContent, url: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAddContent(false)}
                      >
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleAddContent}>
                        Add Content
                      </Button>
                    </div>
                  </div>
                )}

                {/* Content List */}
                {campaign.content && campaign.content.length > 0 ? (
                  <div className="space-y-3">
                    {campaign.content.map((item) => {
                      const Icon = contentTypeIcons[item.type] || FileText;
                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg group"
                        >
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Icon className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {item.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.type.charAt(0).toUpperCase() +
                                item.type.slice(1)}{" "}
                              • {item.platform}
                              {item.source && ` • Added from: ${item.source}`}
                            </p>
                          </div>
                          <Select
                            value={item.status}
                            onValueChange={(v) =>
                              handleUpdateContentStatus(
                                item.id,
                                v as ContentItem["status"]
                              )
                            }
                          >
                            <SelectTrigger className="w-28">
                              <Badge
                                variant="secondary"
                                className={statusColors[item.status]}
                              >
                                {item.status}
                              </Badge>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="approved">Approved</SelectItem>
                              <SelectItem value="published">Published</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0 text-primary hover:text-primary hover:bg-primary/10"
                            onClick={() => handleShareContent(item)}
                            title="Share via email"
                          >
                            <Mail className="w-4 h-4" />
                          </Button>
                          {item.url && (
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                              className="shrink-0"
                            >
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteContent(item.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  !showAddContent && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Image className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No content added yet</p>
                      <p className="text-sm">
                        Add content items to track deliverables for this campaign
                      </p>
                    </div>
                  )
                )}
              </TabsContent>

              <TabsContent value="notes" className="m-0">
                <Textarea
                  placeholder="Add notes about this campaign..."
                  className="min-h-[200px] resize-none"
                  value={notes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Notes are saved automatically
                </p>
              </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Share Content Dialog */}
      <ShareContentDialog
        content={selectedContent}
        campaign={campaign}
        creator={creator}
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
      />
    </>
  );
};
