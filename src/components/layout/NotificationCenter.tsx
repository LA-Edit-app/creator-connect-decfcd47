import { useState } from "react";
import { Bell, Check, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
  type Notification,
} from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now.getTime() - time.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return time.toLocaleDateString();
}

function NotificationItem({ notification }: { notification: Notification }) {
  const markAsRead = useMarkNotificationRead();
  const deleteNotification = useDeleteNotification();

  const handleMarkAsRead = async () => {
    if (notification.read) return;
    
    try {
      await markAsRead.mutateAsync(notification.id);
    } catch (error: any) {
      toast.error("Failed to mark notification as read");
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      await deleteNotification.mutateAsync(notification.id);
      toast.success("Notification deleted");
    } catch (error: any) {
      toast.error("Failed to delete notification");
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'campaign_alert':
        return '📢';
      case 'creator_update':
        return '👤';
      case 'task_assignment':
        return '📋';
      case 'weekly_report':
        return '📊';
      case 'custom_event':
        return '📅';
      default:
        return '🔔';
    }
  };

  return (
    <div
      className={cn(
        "group p-3 hover:bg-muted/50 cursor-pointer border-b border-border last:border-b-0 transition-colors",
        !notification.read && "bg-primary/5 border-l-2 border-l-primary"
      )}
      onClick={handleMarkAsRead}
    >
      <div className="flex items-start gap-3">
        <div className="text-lg shrink-0 mt-0.5">
          {getNotificationIcon(notification.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className={cn(
              "text-sm truncate",
              !notification.read ? "font-semibold text-foreground" : "font-medium text-muted-foreground"
            )}>
              {notification.title}
            </h4>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-xs text-muted-foreground">
                {formatRelativeTime(notification.created_at)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handleDelete}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {notification.message}
          </p>
          {!notification.read && (
            <div className="flex items-center gap-1 mt-2">
              <div className="w-2 h-2 bg-primary rounded-full" />
              <span className="text-xs text-primary font-medium">New</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: notifications = [], isLoading } = useNotifications();
  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const markAllAsRead = useMarkAllNotificationsRead();

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    
    try {
      await markAllAsRead.mutateAsync();
      toast.success("All notifications marked as read");
    } catch (error: any) {
      toast.error("Failed to mark notifications as read");
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-80 p-0 max-h-[500px] overflow-hidden"
        sideOffset={8}
      >
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Notifications</h3>
              <p className="text-xs text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
              </p>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="text-xs h-7"
              >
                <Check className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </div>
        
        <ScrollArea className="relative max-h-96">
          {isLoading ? (
            <div className="p-4 text-center">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mx-auto mb-2" />
                <div className="h-3 bg-muted rounded w-1/2 mx-auto" />
              </div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground mb-1">
                No notifications yet
              </p>
              <p className="text-xs text-muted-foreground">
                We'll notify you when something important happens
              </p>
            </div>
          ) : (
            <div className="group">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}