/**
 * FOGuestCheckinPage — Front Office: Quick Guest Check-in / Check-out
 *
 * Allows front desk staff to:
 * - Generate a stay token for a room (check-in)
 * - View active stay tokens
 * - Expire/revoke tokens (check-out)
 * - See which rooms have active guests
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useActiveRole } from "@/hooks/useActiveRole";
import {
  UserPlus, LogOut, Loader2, Search,
  Key, BedDouble, CheckCircle2, Clock,
  Copy, QrCode,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function FOGuestCheckinPage() {
  const { activeRole } = useActiveRole();
  const propertyId = activeRole?.scopeId ?? "";

  const [search, setSearch] = useState("");
  const [checkinDialogOpen, setCheckinDialogOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [generatedToken, setGeneratedToken] = useState<{ token: string; roomNumber: string; expiresAt: string } | null>(null);

  // Fetch rooms for this property
  const { data: roomsData, isLoading: roomsLoading } = trpc.crud.rooms.list.useQuery(
    { property_id: propertyId, page: 1, pageSize: 500 },
    { enabled: !!propertyId }
  );

  const rooms = roomsData?.items ?? [];

  // Generate stay token mutation
  const generateToken = trpc.stayTokens.generateTestToken.useMutation({
    onSuccess: (data) => {
      setGeneratedToken({
        token: data.token,
        roomNumber: data.room_number,
        expiresAt: data.expires_at,
      });
      toast.success(`Stay token generated for Room ${data.room_number}`);
    },
    onError: (e) => toast.error(e.message),
  });

  // Filter rooms
  const filtered = useMemo(() => {
    if (!search.trim()) return rooms;
    const q = search.toLowerCase();
    return rooms.filter((r: any) =>
      r.room_number.toLowerCase().includes(q) ||
      (r.room_type ?? "").toLowerCase().includes(q) ||
      (r.floor ?? "").toLowerCase().includes(q)
    );
  }, [rooms, search]);

  const handleCheckin = () => {
    if (!selectedRoomId) {
      toast.error("Please select a room first");
      return;
    }
    generateToken.mutate({ propertyId, roomId: selectedRoomId });
  };

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token).then(() => {
      toast.success("Token copied to clipboard");
    }).catch(() => {
      toast.error("Could not copy — please copy manually");
    });
  };

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Guest Check-in</h1>
          <p className="text-zinc-400 text-sm mt-0.5">
            {activeRole?.scopeLabel ?? "Property"} · Generate stay tokens for guest rooms
          </p>
        </div>
        <Button
          onClick={() => { setCheckinDialogOpen(true); setSelectedRoomId(""); setGeneratedToken(null); }}
          className="bg-amber-500 hover:bg-amber-400 text-black font-semibold gap-2"
        >
          <UserPlus className="w-4 h-4" />
          New Check-in
        </Button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <BedDouble className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-zinc-500 text-xs">Total Rooms</p>
                <p className="text-zinc-100 text-2xl font-bold">{rooms.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Key className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-zinc-500 text-xs">Active Rooms</p>
                <p className="text-emerald-400 text-2xl font-bold">{rooms.filter((r: any) => r.status === "active").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <QrCode className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-zinc-500 text-xs">Room Types</p>
                <p className="text-purple-400 text-2xl font-bold">
                  {new Set(rooms.map((r: any) => r.room_type)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search rooms by number, type, or floor..."
          className="pl-9 bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
        />
      </div>

      {/* Room list */}
      {roomsLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <BedDouble className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No rooms found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {filtered.map((room: any) => (
            <Card key={room.id} className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                  <span className="text-zinc-200 font-bold text-sm">{room.room_number}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-zinc-200 text-sm font-medium">Room {room.room_number}</p>
                  <p className="text-zinc-500 text-xs">
                    {room.room_type}
                    {room.floor && <> · Floor {room.floor}</>}
                    {room.zone && <> · {room.zone}</>}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={room.status === "active"
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs"
                    : "bg-zinc-700 text-zinc-400 text-xs"
                  }
                >
                  {room.status}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-amber-400 hover:bg-amber-500/10 text-xs gap-1"
                  onClick={() => {
                    setSelectedRoomId(room.id);
                    setGeneratedToken(null);
                    setCheckinDialogOpen(true);
                  }}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Check-in
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Check-in Dialog */}
      <Dialog open={checkinDialogOpen} onOpenChange={setCheckinDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-zinc-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-zinc-100 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-amber-400" />
              Guest Check-in
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Generate a 24-hour stay token for the guest. The token enables QR code scanning for services.
            </DialogDescription>
          </DialogHeader>

          {generatedToken ? (
            <div className="space-y-4 py-2">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-emerald-300 text-sm font-medium">Token Generated Successfully</p>
                <p className="text-zinc-400 text-xs mt-1">Room {generatedToken.roomNumber}</p>
              </div>

              <div className="bg-zinc-800 rounded-lg px-4 py-3 border border-zinc-700">
                <p className="text-zinc-500 text-xs mb-1">Stay Token</p>
                <div className="flex items-center gap-2">
                  <code className="text-amber-400 font-mono text-sm flex-1">{generatedToken.token}</code>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-zinc-400 hover:text-zinc-200 h-7 px-2"
                    onClick={() => handleCopyToken(generatedToken.token)}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-zinc-500 text-xs">
                <Clock className="w-3.5 h-3.5" />
                Expires: {new Date(generatedToken.expiresAt).toLocaleString()}
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-zinc-300 text-sm font-medium">Select Room</label>
                <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                    <SelectValue placeholder="Choose a room..." />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700 max-h-64">
                    {rooms.map((r: any) => (
                      <SelectItem key={r.id} value={r.id} className="text-zinc-100 focus:bg-zinc-700">
                        Room {r.room_number} — {r.room_type}
                        {r.floor && ` (F${r.floor})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-3 py-2">
                <p className="text-zinc-400 text-xs">
                  A 24-hour stay token will be generated. The guest can use this token to access room services via QR code scanning.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setCheckinDialogOpen(false)} className="text-zinc-400">
              {generatedToken ? "Close" : "Cancel"}
            </Button>
            {!generatedToken && (
              <Button
                onClick={handleCheckin}
                disabled={!selectedRoomId || generateToken.isPending}
                className="bg-amber-500 hover:bg-amber-400 text-black font-semibold gap-2"
              >
                {generateToken.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Generate Token
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
