/**
 * FORoomStatusPage — Front Office: Room Status Board
 *
 * Visual grid showing all rooms for the active property with:
 * - Occupancy indicator (has active stay token = occupied)
 * - Active service request count per room
 * - Room type and floor info
 * - Click to view room requests
 */
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useActiveRole } from "@/hooks/useActiveRole";
import {
  BedDouble, Loader2, Search, Filter,
  Wifi, WifiOff, CheckCircle2, AlertTriangle,
  ClipboardList, DoorOpen, DoorClosed,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type RoomStatus = "vacant" | "occupied" | "service_active" | "service_urgent";

const STATUS_STYLES: Record<RoomStatus, { bg: string; border: string; dot: string; label: string }> = {
  vacant:         { bg: "bg-zinc-800/50",   border: "border-zinc-700/50", dot: "bg-zinc-500",   label: "Vacant" },
  occupied:       { bg: "bg-emerald-500/8", border: "border-emerald-500/20", dot: "bg-emerald-400", label: "Occupied" },
  service_active: { bg: "bg-amber-500/8",   border: "border-amber-500/20", dot: "bg-amber-400",  label: "Service Active" },
  service_urgent: { bg: "bg-red-500/8",     border: "border-red-500/20",  dot: "bg-red-400",    label: "SLA Breached" },
};

interface RoomWithStatus {
  id: string;
  roomNumber: string;
  floor: string | null;
  zone: string | null;
  roomType: string;
  status: RoomStatus;
  activeRequests: number;
  hasGuest: boolean;
  urgentRequests: number;
}

export default function FORoomStatusPage() {
  const { activeRole } = useActiveRole();
  const propertyId = activeRole?.scopeId ?? "";

  const [search, setSearch] = useState("");
  const [floorFilter, setFloorFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch rooms for this property
  const { data: roomsData, isLoading: roomsLoading } = trpc.crud.rooms.list.useQuery(
    { property_id: propertyId, page: 1, pageSize: 500 },
    { enabled: !!propertyId }
  );

  // Fetch active requests for this property
  const { data: requests = [] } = trpc.requests.listByProperty.useQuery(
    { propertyId, limit: 200 },
    { enabled: !!propertyId, refetchInterval: 15_000 }
  );

  const rooms = roomsData?.items ?? [];

  // Build room status map
  const roomStatusMap = useMemo(() => {
    const now = new Date();
    const map = new Map<string, { activeCount: number; urgentCount: number }>();

    const activeStatuses = ["SUBMITTED", "PENDING_MATCH", "DISPATCHED", "SP_ACCEPTED",
      "SP_REJECTED", "PENDING_PAYMENT", "PAYMENT_CONFIRMED", "IN_PROGRESS"];

    for (const req of requests) {
      if (!activeStatuses.includes(req.status)) continue;
      const existing = map.get(req.roomId) ?? { activeCount: 0, urgentCount: 0 };
      existing.activeCount++;
      if (req.slaDeadline && new Date(req.slaDeadline) < now) {
        existing.urgentCount++;
      }
      map.set(req.roomId, existing);
    }
    return map;
  }, [requests]);

  // Combine rooms with status
  const enrichedRooms: RoomWithStatus[] = useMemo(() => {
    return rooms.map((r: any) => {
      const reqInfo = roomStatusMap.get(r.id);
      const activeRequests = reqInfo?.activeCount ?? 0;
      const urgentRequests = reqInfo?.urgentCount ?? 0;
      // For now, consider a room "occupied" if it has any active requests
      const hasGuest = activeRequests > 0;

      let status: RoomStatus = "vacant";
      if (urgentRequests > 0) status = "service_urgent";
      else if (activeRequests > 0) status = "service_active";
      else if (hasGuest) status = "occupied";

      return {
        id: r.id,
        roomNumber: r.room_number,
        floor: r.floor,
        zone: r.zone,
        roomType: r.room_type,
        status,
        activeRequests,
        hasGuest,
        urgentRequests,
      };
    });
  }, [rooms, roomStatusMap]);

  // Get unique floors for filter
  const floors = useMemo(() => {
    const set = new Set(enrichedRooms.map(r => r.floor ?? "Unknown").filter(Boolean));
    return Array.from(set).sort();
  }, [enrichedRooms]);

  // Filter rooms
  const filtered = useMemo(() => {
    let list = enrichedRooms;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r => r.roomNumber.toLowerCase().includes(q) || (r.zone ?? "").toLowerCase().includes(q));
    }
    if (floorFilter !== "all") {
      list = list.filter(r => (r.floor ?? "Unknown") === floorFilter);
    }
    if (statusFilter !== "all") {
      list = list.filter(r => r.status === statusFilter);
    }
    return list.sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }));
  }, [enrichedRooms, search, floorFilter, statusFilter]);

  // Stats
  const stats = useMemo(() => ({
    total: enrichedRooms.length,
    vacant: enrichedRooms.filter(r => r.status === "vacant").length,
    occupied: enrichedRooms.filter(r => r.status === "occupied").length,
    serviceActive: enrichedRooms.filter(r => r.status === "service_active").length,
    serviceUrgent: enrichedRooms.filter(r => r.status === "service_urgent").length,
  }), [enrichedRooms]);

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Room Status Board</h1>
          <p className="text-zinc-400 text-sm mt-0.5">
            {activeRole?.scopeLabel ?? "Property"} · {stats.total} rooms · auto-refreshes
          </p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-zinc-300", dotColor: "bg-zinc-400" },
          { label: "Vacant", value: stats.vacant, color: "text-zinc-400", dotColor: "bg-zinc-500" },
          { label: "Occupied", value: stats.occupied, color: "text-emerald-400", dotColor: "bg-emerald-400" },
          { label: "Service Active", value: stats.serviceActive, color: "text-amber-400", dotColor: "bg-amber-400" },
          { label: "SLA Breached", value: stats.serviceUrgent, color: "text-red-400", dotColor: "bg-red-400" },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5">
            <div className={`w-2 h-2 rounded-full ${s.dotColor}`} />
            <span className="text-zinc-500 text-xs">{s.label}</span>
            <span className={`ml-auto text-lg font-bold ${s.color}`}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search room number or zone..."
            className="pl-9 bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
          />
        </div>
        <Select value={floorFilter} onValueChange={setFloorFilter}>
          <SelectTrigger className="w-36 bg-zinc-800 border-zinc-700 text-zinc-100">
            <SelectValue placeholder="Floor" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700">
            <SelectItem value="all" className="text-zinc-100 focus:bg-zinc-700">All Floors</SelectItem>
            {floors.map(f => (
              <SelectItem key={f} value={f} className="text-zinc-100 focus:bg-zinc-700">Floor {f}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700 text-zinc-100">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700">
            <SelectItem value="all" className="text-zinc-100 focus:bg-zinc-700">All Status</SelectItem>
            <SelectItem value="vacant" className="text-zinc-100 focus:bg-zinc-700">Vacant</SelectItem>
            <SelectItem value="occupied" className="text-zinc-100 focus:bg-zinc-700">Occupied</SelectItem>
            <SelectItem value="service_active" className="text-zinc-100 focus:bg-zinc-700">Service Active</SelectItem>
            <SelectItem value="service_urgent" className="text-zinc-100 focus:bg-zinc-700">SLA Breached</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Room Grid */}
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
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2">
          {filtered.map(room => {
            const style = STATUS_STYLES[room.status];
            return (
              <Link key={room.id} href={`/admin/rooms/${room.id}`}>
                <div
                  className={`relative rounded-lg border p-3 cursor-pointer transition-all hover:scale-[1.03] hover:shadow-lg ${style.bg} ${style.border}`}
                >
                  {/* Status dot */}
                  <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${style.dot}`} />

                  {/* Room number */}
                  <p className="text-zinc-100 font-bold text-lg leading-tight">{room.roomNumber}</p>

                  {/* Room type */}
                  <p className="text-zinc-500 text-[10px] uppercase tracking-wide mt-0.5 truncate">
                    {room.roomType}
                  </p>

                  {/* Floor */}
                  {room.floor && (
                    <p className="text-zinc-600 text-[10px] mt-0.5">F{room.floor}</p>
                  )}

                  {/* Active requests badge */}
                  {room.activeRequests > 0 && (
                    <div className="mt-1.5 flex items-center gap-1">
                      <ClipboardList className="w-3 h-3 text-amber-400" />
                      <span className="text-amber-400 text-[10px] font-medium">
                        {room.activeRequests} req{room.activeRequests > 1 ? "s" : ""}
                      </span>
                    </div>
                  )}

                  {/* Urgent indicator */}
                  {room.urgentRequests > 0 && (
                    <div className="mt-0.5 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-red-400" />
                      <span className="text-red-400 text-[10px] font-medium">
                        {room.urgentRequests} SLA
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 pt-2 border-t border-zinc-800">
        {Object.entries(STATUS_STYLES).map(([key, style]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
            <span className="text-zinc-500 text-xs">{style.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
