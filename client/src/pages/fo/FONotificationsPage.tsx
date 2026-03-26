/**
 * FONotificationsPage — In-app notification feed for Front Office staff.
 *
 * Displays all notifications received during the session with mark-as-read
 * and dismiss actions. Uses the same useNotifications hook as the TopBar bell.
 */
import { Bell, CheckCheck, Trash2, Info, AlertTriangle, CheckCircle } from "lucide-react";
import { useNotifications } from "@/components/NotificationCenter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function FONotificationsPage() {
  const { notifications, markRead, markAllRead, dismiss } = useNotifications();

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getIcon = (type?: string) => {
    if (type === "warning") return <AlertTriangle className="w-4 h-4 text-amber-400" />;
    if (type === "success") return <CheckCircle className="w-4 h-4 text-green-400" />;
    return <Info className="w-4 h-4 text-blue-400" />;
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Bell className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Notifications</h1>
            <p className="text-sm text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={markAllRead}
            className="gap-1.5 text-xs"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Notification list */}
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Bell className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">No notifications yet</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            New service requests, status updates, and alerts will appear here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {notifications.map((n, idx) => (
            <div
              key={idx}
              className={cn(
                "flex items-start gap-3 p-4 rounded-xl border transition-colors",
                n.read
                  ? "bg-card border-border opacity-70"
                  : "bg-amber-500/5 border-amber-500/20"
              )}
            >
              <div className="mt-0.5 flex-shrink-0">{getIcon((n as any).type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={cn("text-sm font-medium leading-snug", n.read ? "text-muted-foreground" : "text-foreground")}>
                    {n.message}
                  </p>
                  {!n.read && (
                    <Badge className="bg-amber-500 text-black border-0 text-[10px] px-1.5 py-0 leading-4 flex-shrink-0">
                      New
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {!n.read && (
                  <button
                    onClick={() => markRead(n.id)}
                    title="Mark as read"
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => dismiss(n.id)}
                  title="Dismiss"
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
