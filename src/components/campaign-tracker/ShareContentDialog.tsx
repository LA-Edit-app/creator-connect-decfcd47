import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ContentItem, CampaignData, Creator } from "@/data/campaignTrackerData";
import { Mail, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ShareContentDialogProps {
  content: ContentItem | null;
  campaign: CampaignData;
  creator: Creator;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ShareContentDialog = ({
  content,
  campaign,
  creator,
  open,
  onOpenChange,
}: ShareContentDialogProps) => {
  const [recipientEmail, setRecipientEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Set default values when content changes
  const resetForm = () => {
    if (content && campaign) {
      setSubject(`${campaign.brand} Campaign Content: ${content.title}`);
      setMessage(
        `Hi,\n\nPlease find the content details for the ${campaign.brand} campaign below:\n\n` +
          `Content: ${content.title}\n` +
          `Type: ${content.type.charAt(0).toUpperCase() + content.type.slice(1)}\n` +
          `Platform: ${content.platform}\n` +
          `Status: ${content.status}\n` +
          (content.url ? `Link: ${content.url}\n` : "") +
          `\nCreator: ${creator.name} (${creator.handle})\n` +
          `\nBest regards,\nTalentHub Team`
      );
    }
  };

  // Reset form when dialog opens
  if (open && !subject && content) {
    resetForm();
  }

  const handleSendEmail = async () => {
    if (!recipientEmail) {
      toast.error("Please enter a recipient email");
      return;
    }

    if (!recipientEmail.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    setSending(true);

    // Simulate sending email (in production, this would call an edge function)
    // For now, we'll use mailto as a fallback
    try {
      const mailtoLink = `mailto:${recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
      window.open(mailtoLink, "_blank");
      
      toast.success("Email client opened with content details");
      onOpenChange(false);
      setRecipientEmail("");
      setSubject("");
      setMessage("");
    } catch (error) {
      toast.error("Failed to open email client");
    } finally {
      setSending(false);
    }
  };

  if (!content) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Share Content via Email
          </DialogTitle>
          <DialogDescription>
            Send content details for "{content.title}" to a recipient
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="recipient">Recipient Email</Label>
            <Input
              id="recipient"
              type="email"
              placeholder="brand@example.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              className="min-h-[150px] resize-none"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendEmail} disabled={sending}>
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Email
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
