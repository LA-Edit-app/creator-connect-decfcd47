import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { UserMinus, UserPlus, ShieldCheck, Shield, LayoutGrid, History, Plus, Pencil, Trash2, CheckCircle2, RotateCcw, Link2, Link2Off } from "lucide-react";
import { useXeroConnection, useConnectXero, useDisconnectXero } from "@/hooks/useXeroConnection";
import { ColumnSchemaEditor } from "@/components/agency-settings/ColumnSchemaEditor";
import {
  useAgencySchemas,
  useCreateSchema,
  useUpdateSchema,
  usePublishSchema,
  useDeleteSchema,
} from "@/hooks/useColumnSchemas";
import type { ColumnDefinition, ColumnSchema } from "@/hooks/useColumnSchemas";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  useCurrentAgency,
  useUpdateAgency,
  useAgencyMembers,
  useIsAgencyAdmin,
  useCurrentUserRole,
  useUpdateMemberRole,
  useRemoveMember,
  useInviteMember,
} from "@/hooks/useAgencyMembers";
import { useAuth } from "@/hooks/useAuth";
import type { AgencyMemberWithProfile } from "@/hooks/useAgencyMembers";

const roleBadgeVariant = (role: string) => {
  if (role === "owner") return "default";
  if (role === "admin") return "secondary";
  return "outline";
};

const roleLabel = (role: string) => {
  if (role === "owner") return "Owner";
  if (role === "admin") return "Admin";
  return "Member";
};

const memberInitials = (member: AgencyMemberWithProfile) => {
  const first = member.profiles?.first_name;
  const last = member.profiles?.last_name;
  if (first || last) {
    return [first, last]
      .filter(Boolean)
      .map((n) => n![0].toUpperCase())
      .join("");
  }
  return member.profiles?.email?.[0]?.toUpperCase() ?? "?";
};

const memberDisplayName = (member: AgencyMemberWithProfile) => {
  const first = member.profiles?.first_name;
  const last = member.profiles?.last_name;
  if (first || last) return [first, last].filter(Boolean).join(" ");
  return member.profiles?.email ?? "Unknown User";
};

const XeroSection = () => {
  const { data: connection, isLoading } = useXeroConnection();
  const { buildXeroAuthUrl } = useConnectXero();
  const disconnect = useDisconnectXero();

  if (isLoading) return <Skeleton className="h-20 w-full" />;

  if (connection?.status === "active") {
    return (
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="flex items-center gap-3">
          <Link2 className="h-5 w-5 text-green-500" />
          <div>
            <p className="font-medium text-sm">Connected to Xero</p>
            <p className="text-xs text-muted-foreground">{connection.tenant_name}</p>
          </div>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm">Disconnect</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Disconnect Xero?</AlertDialogTitle>
              <AlertDialogDescription>
                Invoice status sync will stop. Campaign data already synced is kept.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => disconnect.mutate()}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Disconnect
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  if (connection?.status === "error") {
    return (
      <div className="flex items-center justify-between rounded-lg border border-destructive/50 p-4">
        <div className="flex items-center gap-3">
          <Link2Off className="h-5 w-5 text-destructive" />
          <div>
            <p className="font-medium text-sm">Xero connection error</p>
            <p className="text-xs text-muted-foreground">Re-connect to resume sync</p>
          </div>
        </div>
        <Button size="sm" asChild>
          <a href={buildXeroAuthUrl() ?? "#"}>Reconnect Xero</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="flex items-center gap-3">
        <Link2Off className="h-5 w-5 text-muted-foreground" />
        <div>
          <p className="font-medium text-sm">Connect Xero</p>
          <p className="text-xs text-muted-foreground">Sync invoice statuses from your Xero account</p>
        </div>
      </div>
      <Button size="sm" asChild>
        <a href={buildXeroAuthUrl() ?? "#"}>Connect Xero</a>
      </Button>
    </div>
  );
};

const AgencySettings = () => {
  const { user } = useAuth();
  const { data: agency, isLoading: agencyLoading } = useCurrentAgency();
  const { data: members, isLoading: membersLoading } = useAgencyMembers();
  const { data: isAdmin } = useIsAgencyAdmin();
  const { data: currentRole } = useCurrentUserRole();
  const updateAgency = useUpdateAgency();
  const updateMemberRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();
  const inviteMember = useInviteMember();

  // Column schema state
  const { data: schemas = [], isLoading: schemasLoading } = useAgencySchemas();
  const createSchema = useCreateSchema();
  const updateSchema = useUpdateSchema();
  const publishSchema = usePublishSchema();
  const deleteSchema = useDeleteSchema();

  const [schemaView, setSchemaView] = useState<"list" | "edit">("list");
  const [editingSchema, setEditingSchema] = useState<ColumnSchema | null>(null);
  const [editingColumns, setEditingColumns] = useState<ColumnDefinition[]>([]);
  const [editingNotes, setEditingNotes] = useState("");
  const [schemaSavePending, setSchemaSavePending] = useState(false);

  const [agencyName, setAgencyName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");

  // Sync agency name to local state when loaded
  const [agencyNameInitialized, setAgencyNameInitialized] = useState(false);
  if (agency && !agencyNameInitialized) {
    setAgencyName(agency.name);
    setAgencyNameInitialized(true);
  }

  const handleSaveAgencyName = () => {
    if (!agency) return;
    if (!agencyName.trim()) return toast.error("Agency name cannot be empty");
    updateAgency.mutate(
      { id: agency.id, name: agencyName.trim() },
      {
        onSuccess: () => toast.success("Agency name updated"),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleRoleChange = (member: AgencyMemberWithProfile, newRole: "admin" | "member") => {
    updateMemberRole.mutate(
      { agencyId: member.agency_id, userId: member.user_id, role: newRole },
      {
        onSuccess: () => toast.success("Role updated"),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleRemoveMember = (member: AgencyMemberWithProfile) => {
    removeMember.mutate(
      { agencyId: member.agency_id, userId: member.user_id },
      {
        onSuccess: () => toast.success(`${memberDisplayName(member)} removed from agency`),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleInvite = () => {
    if (!agency) return;
    if (!inviteEmail.trim()) return toast.error("Enter an email address");
    const emailSnapshot = inviteEmail.trim();
    inviteMember.mutate(
      { agencyId: agency.id, email: emailSnapshot, role: inviteRole },
      {
        onSuccess: (data) => {
          if (data?.status === 'invited') {
            toast.success(`Invitation email sent to ${emailSnapshot}. They'll join your agency when they sign up.`);
          } else {
            toast.success(`${emailSnapshot} has been added to your agency.`);
          }
          setInviteEmail("");
          setInviteRole("member");
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  if (!isAdmin && currentRole !== null && currentRole !== undefined) {
    return (
      <DashboardLayout title="Agency Settings">
        <div className="max-w-3xl">
          <div className="bg-card rounded-xl border border-border p-8 text-center">
            <ShieldCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Admin Access Required</h3>
            <p className="text-muted-foreground">
              Only agency owners and admins can manage agency settings.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Agency Settings">
      <div className="max-w-3xl space-y-8 animate-fade-in">

        {/* Agency Info */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-6">Agency Details</h3>
          {agencyLoading ? (
            <Skeleton className="h-10 rounded-md" />
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="agencyName">Agency Name</Label>
                <Input
                  id="agencyName"
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  placeholder="Your agency name"
                />
              </div>
              <Button
                onClick={handleSaveAgencyName}
                disabled={updateAgency.isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {updateAgency.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </div>

        {/* Team Members */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-6">Team Members</h3>

          {membersLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-40 rounded" />
                    <Skeleton className="h-3 w-56 rounded" />
                  </div>
                  <Skeleton className="h-8 w-24 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {members?.map((member, idx) => {
                const isCurrentUser = member.user_id === user?.id;
                const isOwner = member.role === "owner";

                return (
                  <div key={member.user_id}>
                    {idx > 0 && <Separator className="my-3" />}
                    <div className="flex items-center gap-4 py-1">
                      <Avatar className="w-10 h-10 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                          {memberInitials(member)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {memberDisplayName(member)}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {member.profiles?.email}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isOwner || isCurrentUser ? (
                          <Badge variant={roleBadgeVariant(member.role)}>
                            {member.role === "owner" && <Shield className="w-3 h-3 mr-1" />}
                            {roleLabel(member.role)}
                          </Badge>
                        ) : (
                          <Select
                            value={member.role}
                            onValueChange={(v) =>
                              handleRoleChange(member, v as "admin" | "member")
                            }
                          >
                            <SelectTrigger className="h-8 w-28 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="member">Member</SelectItem>
                            </SelectContent>
                          </Select>
                        )}

                        {!isOwner && !isCurrentUser && currentRole === "owner" && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                <UserMinus className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Remove <strong>{memberDisplayName(member)}</strong> from your agency? They will lose access to all agency data.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRemoveMember(member)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Grid Columns Configuration */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Campaign Grid Columns</h3>
            </div>
            {schemaView === "list" && (
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => {
                  const published = schemas.find((s) => s.is_published);
                  const baseColumns = published?.columns ?? [];
                  createSchema.mutate(
                    { columns: baseColumns, notes: "" },
                    {
                      onSuccess: (newSchema) => {
                        setEditingSchema(newSchema);
                        setEditingColumns([...newSchema.columns]);
                        setEditingNotes("");
                        setSchemaView("edit");
                      },
                      onError: (err) => toast.error(err.message),
                    }
                  );
                }}
                disabled={createSchema.isPending}
              >
                <Plus className="w-4 h-4" />
                New version
              </Button>
            )}
            {schemaView === "edit" && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSchemaView("list")}
              >
                ← Back to versions
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            {schemaView === "list"
              ? "Configure which columns appear in the campaign tracker grid. Publish a version to make it live for all team members."
              : `Editing Draft v${editingSchema?.version ?? ""} — changes are saved when you click Save.`}
          </p>

          {schemaView === "list" && (
            schemasLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
              </div>
            ) : schemas.length === 0 ? (
              <p className="text-sm text-muted-foreground">No schema versions yet.</p>
            ) : (
              <div className="space-y-2">
                {schemas.map((schema) => (
                  <div
                    key={schema.id}
                    className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
                      schema.is_published
                        ? "border-primary/40 bg-primary/5"
                        : "border-border bg-muted/20"
                    }`}
                  >
                    <History className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Version {schema.version}</span>
                        {schema.is_published && (
                          <Badge className="text-[10px] gap-1 bg-primary text-primary-foreground">
                            <CheckCircle2 className="w-3 h-3" />
                            Published
                          </Badge>
                        )}
                        {!schema.is_published && (
                          <Badge variant="outline" className="text-[10px]">Draft</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {schema.is_published && schema.published_at
                          ? `Published ${format(new Date(schema.published_at), "d MMM yyyy, HH:mm")}`
                          : `Created ${format(new Date(schema.created_at), "d MMM yyyy, HH:mm")}`}
                        {schema.notes ? ` · ${schema.notes}` : ""}
                        {" · "}{schema.columns.filter((c) => c.active).length} active columns
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!schema.is_published && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1 h-8"
                            onClick={() => {
                              setEditingSchema(schema);
                              setEditingColumns([...schema.columns]);
                              setEditingNotes(schema.notes ?? "");
                              setSchemaView("edit");
                            }}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1 h-8 text-primary hover:text-primary"
                            onClick={() =>
                              publishSchema.mutate(schema.id, {
                                onSuccess: () => toast.success(`Version ${schema.version} is now live`),
                                onError: (err) => toast.error(err.message),
                              })
                            }
                            disabled={publishSchema.isPending}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Publish
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1 h-8 text-destructive hover:text-destructive"
                            onClick={() =>
                              deleteSchema.mutate(schema.id, {
                                onSuccess: () => toast.success("Draft deleted"),
                                onError: (err) => toast.error(err.message),
                              })
                            }
                            disabled={deleteSchema.isPending}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                      {schema.is_published && (
                        <Badge variant="secondary" className="text-[10px]">Live</Badge>
                      )}
                      {!schema.is_published && schemas.some((s) => s.is_published && s.version > schema.version) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 h-8 text-xs"
                          onClick={() =>
                            publishSchema.mutate(schema.id, {
                              onSuccess: () => toast.success(`Rolled back to version ${schema.version}`),
                              onError: (err) => toast.error(err.message),
                            })
                          }
                          disabled={publishSchema.isPending}
                        >
                          <RotateCcw className="w-3 h-3" />
                          Rollback
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {schemaView === "edit" && editingSchema && (
            <div className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="schemaVersionNotes">Version notes <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Textarea
                  id="schemaVersionNotes"
                  value={editingNotes}
                  onChange={(e) => setEditingNotes(e.target.value)}
                  placeholder="What changed in this version?"
                  className="h-16 text-sm resize-none"
                />
              </div>

              <ColumnSchemaEditor
                columns={editingColumns}
                onChange={setEditingColumns}
              />

              <div className="flex items-center gap-3 pt-2">
                <Button
                  onClick={() => {
                    setSchemaSavePending(true);
                    updateSchema.mutate(
                      { id: editingSchema.id, columns: editingColumns, notes: editingNotes },
                      {
                        onSuccess: () => {
                          toast.success("Draft saved");
                          setSchemaSavePending(false);
                        },
                        onError: (err) => {
                          toast.error(err.message);
                          setSchemaSavePending(false);
                        },
                      }
                    );
                  }}
                  disabled={updateSchema.isPending || schemaSavePending}
                  variant="outline"
                >
                  {updateSchema.isPending ? "Saving..." : "Save draft"}
                </Button>
                <Button
                  onClick={() => {
                    setSchemaSavePending(true);
                    updateSchema.mutate(
                      { id: editingSchema.id, columns: editingColumns, notes: editingNotes },
                      {
                        onSuccess: () => {
                          publishSchema.mutate(editingSchema.id, {
                            onSuccess: () => {
                              toast.success(`Version ${editingSchema.version} saved and published`);
                              setSchemaSavePending(false);
                              setSchemaView("list");
                            },
                            onError: (err) => {
                              toast.error(err.message);
                              setSchemaSavePending(false);
                            },
                          });
                        },
                        onError: (err) => {
                          toast.error(err.message);
                          setSchemaSavePending(false);
                        },
                      }
                    );
                  }}
                  disabled={updateSchema.isPending || publishSchema.isPending || schemaSavePending}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {publishSchema.isPending ? "Publishing..." : "Save & publish"}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Invite Members */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-2">Invite Team Member</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Add an existing user by email, or send an invitation to someone who hasn't signed up yet.
          </p>

          <div className="flex gap-3">
            <div className="flex-1 space-y-2">
              <Label htmlFor="inviteEmail">Email Address</Label>
              <Input
                id="inviteEmail"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@example.com"
                onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              />
            </div>
            <div className="w-36 space-y-2">
              <Label>Role</Label>
              <Select
                value={inviteRole}
                onValueChange={(v) => setInviteRole(v as "admin" | "member")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleInvite}
            disabled={inviteMember.isPending}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            {inviteMember.isPending ? "Adding..." : "Add Member"}
          </Button>
        </div>

        {/* Integrations */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Integrations</h2>
              <p className="text-sm text-muted-foreground">Connect external tools to Briefly</p>
            </div>
            <XeroSection />
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default AgencySettings;
