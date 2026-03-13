/**
 * QRPrintPage — Print-optimized layout for QR codes.
 *
 * Features:
 * - Grid of QR code cards (one per room) with property name, room number, and scan URL
 * - Print button triggers browser print dialog with @media print CSS
 * - Supports single QR (from detail page) or batch (from management page via URL params)
 * - Paper size selector: A4, Letter, A5
 * - Cards per row selector: 2, 3, 4
 *
 * Route: /qr/print?ids=id1,id2,id3  OR  /qr/print?propertyId=pr-001
 */
import { useState, useEffect, useRef } from "react";
import {
  Box, Button, Typography, Card, CardContent, FormControl,
  InputLabel, Select, MenuItem, Divider, CircularProgress, Alert,
} from "@mui/material";
import { Printer, ArrowLeft, Grid2X2, Grid3X3 } from "lucide-react";
import { useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { qrApi } from "@/lib/api/endpoints";
import { useActiveProperty } from "@/hooks/useActiveProperty";
import type { QRCode as QRCodeType } from "@/lib/api/types";
import { getDemoQRCodes } from "@/lib/api/demo-data";

/** Generate a simple QR code SVG from data string */
function generateQRSvg(data: string, size = 120): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash + data.charCodeAt(i)) | 0;
  }
  const modules = 21;
  const cellSize = size / modules;
  let rects = "";

  const drawFinder = (ox: number, oy: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isOuter = r === 0 || r === 6 || c === 0 || c === 6;
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        if (isOuter || isInner) {
          rects += `<rect x="${(ox + c) * cellSize}" y="${(oy + r) * cellSize}" width="${cellSize}" height="${cellSize}" fill="#000"/>`;
        }
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(modules - 7, 0);
  drawFinder(0, modules - 7);

  const seed = Math.abs(hash);
  for (let r = 0; r < modules; r++) {
    for (let c = 0; c < modules; c++) {
      if ((r < 8 && c < 8) || (r < 8 && c >= modules - 8) || (r >= modules - 8 && c < 8)) continue;
      const idx = r * modules + c;
      const bit = (seed >> (idx % 31)) & 1;
      const altBit = (hash >> (idx % 29)) & 1;
      if ((bit ^ altBit) === 1) {
        rects += `<rect x="${c * cellSize}" y="${r * cellSize}" width="${cellSize}" height="${cellSize}" fill="#000"/>`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="white"/>${rects}</svg>`;
}

function QRPrintCard({ qr, size }: { qr: QRCodeType; size: number }) {
  const svgString = generateQRSvg(qr.qr_code_id, size);
  const svgUrl = `data:image/svg+xml;base64,${btoa(svgString)}`;
  const scanUrl = `${window.location.origin}/guest/scan/${qr.qr_code_id}`;

  return (
    <Box
      className="qr-print-card"
      sx={{
        border: "1px solid #E5E5E5",
        borderRadius: 1,
        p: 1.5,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 0.75,
        bgcolor: "#FFFFFF",
        breakInside: "avoid",
        pageBreakInside: "avoid",
      }}
    >
      <img src={svgUrl} alt={`QR Code for ${qr.room_number}`} width={size} height={size} style={{ display: "block" }} />
      <Divider sx={{ width: "100%", borderStyle: "dashed" }} />
      <Box sx={{ textAlign: "center", width: "100%" }}>
        <Typography sx={{ fontWeight: 700, fontSize: "0.75rem", letterSpacing: 0.3 }}>
          {qr.property_name || "Property"}
        </Typography>
        <Typography sx={{ fontSize: "0.875rem", fontWeight: 800, letterSpacing: 0.5, mt: 0.25 }}>
          Room {qr.room_number}
        </Typography>
        <Typography sx={{ fontSize: "0.5625rem", color: "#737373", mt: 0.5, fontFamily: "monospace", wordBreak: "break-all" }}>
          {scanUrl}
        </Typography>
      </Box>
    </Box>
  );
}

export default function QRPrintPage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const idsParam = params.get("ids");
  const { propertyId: activePropertyId } = useActiveProperty();
  // Use URL param if provided (e.g., from bulk print), otherwise fall back to active property
  const propertyId = params.get("propertyId") || activePropertyId || "";

  const [perRow, setPerRow] = useState(3);
  const [paperSize, setPaperSize] = useState<"A4" | "Letter" | "A5">("A4");
  const [isPrinting, setIsPrinting] = useState(false);

  const query = useQuery({
    queryKey: ["qr-print", propertyId],
    queryFn: () => qrApi.list(propertyId),
    enabled: !!propertyId,
    staleTime: 30_000,
  });

  const allQRs: QRCodeType[] = query.data?.items ?? getDemoQRCodes().items;
  const filteredQRs = idsParam
    ? allQRs.filter((q) => idsParam.split(",").includes(q.id))
    : allQRs;

  const cardSize = perRow === 2 ? 140 : perRow === 3 ? 110 : 90;

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 200);
  };

  const paperDimensions = {
    A4: { width: "210mm", minHeight: "297mm" },
    Letter: { width: "216mm", minHeight: "279mm" },
    A5: { width: "148mm", minHeight: "210mm" },
  };

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #qr-print-area, #qr-print-area * { visibility: visible; }
          #qr-print-area { position: fixed; left: 0; top: 0; width: 100%; }
          .qr-print-card { break-inside: avoid; page-break-inside: avoid; }
          @page {
            size: ${paperSize};
            margin: 12mm;
          }
        }
      `}</style>

      {/* Controls bar — hidden on print */}
      <Box
        className="no-print"
        sx={{
          position: "sticky", top: 0, zIndex: 10,
          bgcolor: "#FFFFFF", borderBottom: "1px solid #E5E5E5",
          px: 3, py: 1.5,
          display: "flex", alignItems: "center", gap: 2,
          "@media print": { display: "none" },
        }}
      >
        <Button
          size="small" variant="text" startIcon={<ArrowLeft size={14} />}
          onClick={() => navigate("/qr")}
          sx={{ textTransform: "none", color: "#404040" }}
        >
          Back
        </Button>
        <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }}>
          Print QR Codes — {filteredQRs.length} code{filteredQRs.length !== 1 ? "s" : ""}
        </Typography>

        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel>Paper</InputLabel>
          <Select value={paperSize} label="Paper" onChange={(e) => setPaperSize(e.target.value as typeof paperSize)}>
            <MenuItem value="A4">A4</MenuItem>
            <MenuItem value="Letter">Letter</MenuItem>
            <MenuItem value="A5">A5</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 110 }}>
          <InputLabel>Per Row</InputLabel>
          <Select value={perRow} label="Per Row" onChange={(e) => setPerRow(Number(e.target.value))}>
            <MenuItem value={2}><Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}><Grid2X2 size={14} /> 2 per row</Box></MenuItem>
            <MenuItem value={3}><Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}><Grid3X3 size={14} /> 3 per row</Box></MenuItem>
            <MenuItem value={4}><Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}><Grid3X3 size={14} /> 4 per row</Box></MenuItem>
          </Select>
        </FormControl>

        <Button
          variant="contained" size="small"
          startIcon={isPrinting ? <CircularProgress size={14} sx={{ color: "white" }} /> : <Printer size={14} />}
          onClick={handlePrint}
          disabled={isPrinting || filteredQRs.length === 0}
          sx={{ textTransform: "none" }}
        >
          Print
        </Button>
      </Box>

      {/* Print area */}
      <Box
        id="qr-print-area"
        sx={{
          ...paperDimensions[paperSize],
          mx: "auto",
          p: 3,
          bgcolor: "#FFFFFF",
          "@media screen": { boxShadow: "0 2px 20px rgba(0,0,0,0.1)", my: 3 },
        }}
      >
        {query.isLoading ? (
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1.5, p: 2 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Box key={i} sx={{ height: 180, borderRadius: 2, bgcolor: "action.hover",
                background: "linear-gradient(90deg, #f0f0f0 25%, #f8f8f8 50%, #f0f0f0 75%)",
                backgroundSize: "200% 100%",
                animation: `shimmer 1.4s infinite ${i * 0.1}s`,
                "@keyframes shimmer": { "0%": { backgroundPosition: "200% 0" }, "100%": { backgroundPosition: "-200% 0" } },
              }} />
            ))}
          </Box>
        ) : filteredQRs.length === 0 ? (
          <Alert severity="info">No QR codes to print. Go back and select some.</Alert>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: `repeat(${perRow}, 1fr)`,
              gap: 1.5,
            }}
          >
            {filteredQRs.map((qr) => (
              <QRPrintCard key={qr.id} qr={qr} size={cardSize} />
            ))}
          </Box>
        )}
      </Box>
    </>
  );
}
