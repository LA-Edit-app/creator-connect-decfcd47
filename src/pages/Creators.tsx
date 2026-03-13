import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Filter, Instagram, Youtube, Twitter, Pencil, Trash2, UserCheck, UserX } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useCreateCreator, useCreators, useDeleteCreator, useUpdateCreator } from "@/hooks/useCreators";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const platformIcons = {
  instagram: Instagram,
  youtube: Youtube,
  twitter: Twitter,
};

const categoryColors: Record<string, string> = {
  General: "bg-slate-100 text-slate-700",
  Fashion: "bg-pink-100 text-pink-700",
  Tech: "bg-blue-100 text-blue-700",
  Fitness: "bg-green-100 text-green-700",
  Lifestyle: "bg-purple-100 text-purple-700",
  Gaming: "bg-violet-100 text-violet-700",
  Beauty: "bg-rose-100 text-rose-700",
};

const Creators = () => {
  const { data: creators = [], isLoading, error } = useCreators(true);
  const createCreator = useCreateCreator();
  const updateCreator = useUpdateCreator();
  const deleteCreator = useDeleteCreator();

  const [isAddCreatorOpen, setIsAddCreatorOpen] = useState(false);
  const [isEditCreatorOpen, setIsEditCreatorOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newCreatorName, setNewCreatorName] = useState("");
  const [newCreatorHandle, setNewCreatorHandle] = useState("");
  const [newCreatorEmail, setNewCreatorEmail] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [editingCreatorId, setEditingCreatorId] = useState<string | null>(null);
  const [editCreatorName, setEditCreatorName] = useState("");
  const [editCreatorHandle, setEditCreatorHandle] = useState("");
  const [editCreatorEmail, setEditCreatorEmail] = useState("");

  const normalizeHandle = (value: string) => {
    const clean = value.trim().replace(/^@+/, "").toLowerCase();
    return clean ? `@${clean}` : "";
  };

  const autoHandleFromName = (name: string) => {
    const base = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 18);

    if (!base) return "";
    return `@${base}${Date.now().toString().slice(-4)}`;
  };

  const handleAddCreator = async () => {
    if (!newCreatorName.trim() || !newCreatorEmail.trim()) {
      toast.error("Please fill in name and email");
      return;
    }

    const handle = normalizeHandle(newCreatorHandle) || autoHandleFromName(newCreatorName);

    if (!handle) {
      toast.error("Please provide a valid handle");
      return;
    }

    try {
      await createCreator.mutateAsync({
        name: newCreatorName.trim(),
        handle,
        email: newCreatorEmail.trim(),
      });

      setNewCreatorName("");
      setNewCreatorHandle("");
      setNewCreatorEmail("");
      setIsAddCreatorOpen(false);
      toast.success("Creator saved to database");
    } catch (mutationError: any) {
      toast.error(mutationError?.message || "Failed to save creator");
    }
  };

  const openEditCreator = (creator: {
    id: string;
    name: string;
    handle: string;
    email: string | null;
  }) => {
    setEditingCreatorId(creator.id);
    setEditCreatorName(creator.name);
    setEditCreatorHandle(creator.handle);
    setEditCreatorEmail(creator.email || "");
    setIsEditCreatorOpen(true);
  };

  const handleSaveCreatorEdits = async () => {
    if (!editingCreatorId) return;
    if (!editCreatorName.trim() || !editCreatorEmail.trim()) {
      toast.error("Please fill in name and email");
      return;
    }

    const handle = normalizeHandle(editCreatorHandle);
    if (!handle) {
      toast.error("Please provide a valid handle");
      return;
    }

    try {
      await updateCreator.mutateAsync({
        id: editingCreatorId,
        updates: {
          name: editCreatorName.trim(),
          handle,
          email: editCreatorEmail.trim(),
        },
      });

      setIsEditCreatorOpen(false);
      setEditingCreatorId(null);
      toast.success("Creator updated");
    } catch (mutationError: any) {
      toast.error(mutationError?.message || "Failed to update creator");
    }
  };

  const handleToggleCreatorActive = async (creatorId: string, isActive: boolean) => {
    try {
      await updateCreator.mutateAsync({
        id: creatorId,
        updates: { is_active: !isActive },
      });
      toast.success(!isActive ? "Creator reactivated" : "Creator deactivated");
    } catch (mutationError: any) {
      toast.error(mutationError?.message || "Failed to update creator status");
    }
  };

  const handleDeleteCreator = async (creatorId: string, creatorName: string) => {
    const confirmed = window.confirm(
      `Delete ${creatorName}? This will also remove linked campaigns and platform data.`
    );
    if (!confirmed) return;

    try {
      await deleteCreator.mutateAsync(creatorId);
      toast.success("Creator deleted");
    } catch (mutationError: any) {
      toast.error(mutationError?.message || "Failed to delete creator");
    }
  };

  const filteredCreators = useMemo(() => {
    return creators.filter((creator) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? creator.is_active : !creator.is_active);

      if (!matchesStatus) return false;

      if (!searchQuery.trim()) return true;

      const query = searchQuery.toLowerCase();
      return (
        creator.name.toLowerCase().includes(query) ||
        creator.email?.toLowerCase().includes(query) ||
        creator.handle.toLowerCase().includes(query)
      );
    });
  }, [creators, searchQuery, statusFilter]);

  if (isLoading) {
    return (
      <DashboardLayout title="Creators">
        <div className="text-muted-foreground">Loading creators...</div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Creators">
        <div className="text-destructive">Failed to load creators</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Creators">
      <div className="space-y-6 animate-fade-in">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-3">
            <div className="relative flex-1 sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search creators..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as "all" | "active" | "inactive")}
              >
                <SelectTrigger className="h-10 w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All creators</SelectItem>
                  <SelectItem value="active">Active only</SelectItem>
                  <SelectItem value="inactive">Inactive only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => setIsAddCreatorOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Creator
          </Button>
        </div>

        {/* Creators Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">
                    Creator
                  </th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">
                    Category
                  </th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">
                    Followers
                  </th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">
                    Campaigns
                  </th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">
                    Platforms
                  </th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCreators.map((creator) => {
                  const totalFollowers = creator.creator_platforms.reduce(
                    (sum, cp) => sum + (cp.follower_count || 0),
                    0
                  );

                  return (
                  <tr
                    key={creator.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {creator.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">{creator.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {creator.email || creator.handle}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <Badge variant="secondary" className={categoryColors.General}>
                        General
                      </Badge>
                    </td>
                    <td className="py-4 px-6 font-medium text-foreground">
                      {totalFollowers > 0 ? totalFollowers.toLocaleString() : "-"}
                    </td>
                    <td className="py-4 px-6 text-foreground">-</td>
                    <td className="py-4 px-6">
                      <div className="flex gap-2">
                        {creator.creator_platforms.map((platform) => {
                          const key = platform.platforms?.name?.toLowerCase() as keyof typeof platformIcons;
                          const Icon = platformIcons[key];

                          if (!Icon) return null;

                          return (
                            <Icon
                              key={`${creator.id}-${platform.platform_id}`}
                              className="w-4 h-4 text-muted-foreground"
                            />
                          );
                        })}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <Badge
                        variant="secondary"
                        className={creator.is_active ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-700"}
                      >
                        {creator.is_active ? "active" : "inactive"}
                      </Badge>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => openEditCreator(creator)}
                          title="Edit creator"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => void handleToggleCreatorActive(creator.id, creator.is_active)}
                          title={creator.is_active ? "Deactivate creator" : "Reactivate creator"}
                        >
                          {creator.is_active ? (
                            <UserX className="w-4 h-4" />
                          ) : (
                            <UserCheck className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => void handleDeleteCreator(creator.id, creator.name)}
                          title="Delete creator"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <Dialog open={isAddCreatorOpen} onOpenChange={setIsAddCreatorOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Creator</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="creator-name">Name</Label>
                <Input
                  id="creator-name"
                  value={newCreatorName}
                  onChange={(e) => setNewCreatorName(e.target.value)}
                  placeholder="Creator name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="creator-email">Email</Label>
                <Input
                  id="creator-email"
                  type="email"
                  value={newCreatorEmail}
                  onChange={(e) => setNewCreatorEmail(e.target.value)}
                  placeholder="creator@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="creator-handle">Handle</Label>
                <Input
                  id="creator-handle"
                  value={newCreatorHandle}
                  onChange={(e) => setNewCreatorHandle(e.target.value)}
                  placeholder="@creatorhandle"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddCreatorOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddCreator} disabled={createCreator.isPending}>
                {createCreator.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={isEditCreatorOpen}
          onOpenChange={(open) => {
            setIsEditCreatorOpen(open);
            if (!open) setEditingCreatorId(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Creator</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-creator-name">Name</Label>
                <Input
                  id="edit-creator-name"
                  value={editCreatorName}
                  onChange={(e) => setEditCreatorName(e.target.value)}
                  placeholder="Creator name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-creator-email">Email</Label>
                <Input
                  id="edit-creator-email"
                  type="email"
                  value={editCreatorEmail}
                  onChange={(e) => setEditCreatorEmail(e.target.value)}
                  placeholder="creator@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-creator-handle">Handle</Label>
                <Input
                  id="edit-creator-handle"
                  value={editCreatorHandle}
                  onChange={(e) => setEditCreatorHandle(e.target.value)}
                  placeholder="@creatorhandle"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditCreatorOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveCreatorEdits} disabled={updateCreator.isPending}>
                {updateCreator.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Creators;