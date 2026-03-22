import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCreateNotification, useNotifications, useUnreadNotificationCount } from "@/hooks/useNotifications";
import { useAgencyId, useProfile } from "@/hooks/useDatabase";
import { toast } from "sonner";

export function NotificationDebug() {
  const { data: profile } = useProfile();
  const { data: agencyId } = useAgencyId();
  const { data: notifications, isLoading: notificationsLoading } = useNotifications();
  const { data: unreadCount } = useUnreadNotificationCount();
  const createNotification = useCreateNotification();
  const [isCreating, setIsCreating] = useState(false);

  const handleTestNotification = async () => {
    if (!profile?.id) {
      toast.error("No profile found");
      return;
    }

    setIsCreating(true);
    try {
      await createNotification.mutateAsync({
        type: 'task_assignment',
        title: 'Test Notification',
        message: 'This is a test notification to check if the system is working.',
        userIds: [profile.id], // Only send to current user
        data: {
          test: true,
          timestamp: new Date().toISOString()
        }
      });
      toast.success("Test notification created!");
    } catch (error: any) {
      console.error("Failed to create test notification:", error);
      toast.error(`Failed to create notification: ${error.message}`);
    }
    setIsCreating(false);
  };

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Notification Debug Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>User ID:</strong> {profile?.id || "Not found"}
            </div>
            <div>
              <strong>Agency ID:</strong> {agencyId || "Not found"}
            </div>
            <div>
              <strong>Email Notifications:</strong> {profile?.email_notifications ? "✅" : "❌"}
            </div>
            <div>
              <strong>Campaign Alerts:</strong> {profile?.campaign_alerts ? "✅" : "❌"}
            </div>
            <div>
              <strong>Creator Updates:</strong> {profile?.creator_updates ? "✅" : "❌"}
            </div>
            <div>
              <strong>Weekly Reports:</strong> {profile?.weekly_reports ? "✅" : "❌"}
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="flex justify-between items-center mb-2">
              <strong>Notifications:</strong>
              <span className="text-sm text-muted-foreground">
                Total: {notifications?.length || 0} | Unread: {unreadCount || 0}
              </span>
            </div>
            
            <Button 
              onClick={handleTestNotification}
              disabled={isCreating || !profile?.id}
              className="w-full"
            >
              {isCreating ? "Creating..." : "Create Test Notification"}
            </Button>

            <div className="mt-4 max-h-48 overflow-y-auto">
              {notificationsLoading ? (
                <p className="text-muted-foreground">Loading notifications...</p>
              ) : notifications && notifications.length > 0 ? (
                <div className="space-y-2">
                  {notifications.slice(0, 5).map((notification) => (
                    <div key={notification.id} className="p-2 bg-muted rounded text-xs">
                      <div className="font-medium">{notification.title}</div>
                      <div className="text-muted-foreground">{notification.message}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {notification.type} | {notification.read ? "Read" : "Unread"} | 
                        {new Date(notification.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No notifications found</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}