/**
 * QRCodeImage — Renders a real, scannable QR code from a URL string.
 *
 * Uses the `qrcode` npm library to generate a proper QR code data URL
 * that can actually be scanned by a phone camera.
 *
 * Usage:
 *   <QRCodeImage url="https://bo.peppr.vip/guest/scan/QR-SIAM-101" size={200} />
 */
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Box, CircularProgress } from "@mui/material";

interface QRCodeImageProps {
  /** The URL or data string to encode into the QR code */
  url: string;
  /** Width and height in pixels (default: 200) */
  size?: number;
  /** Optional CSS class name */
  className?: string;
  /** Background color (default: white) */
  bgColor?: string;
  /** Foreground color (default: black) */
  fgColor?: string;
  /** Error correction level (default: M) */
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
}

export function QRCodeImage({
  url,
  size = 200,
  className,
  bgColor = "#ffffff",
  fgColor = "#000000",
  errorCorrectionLevel = "M",
}: QRCodeImageProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!url) return;
    setError(false);
    setDataUrl(null);

    QRCode.toDataURL(url, {
      width: size * 2, // 2x for retina sharpness
      margin: 1,
      color: {
        dark: fgColor,
        light: bgColor,
      },
      errorCorrectionLevel,
    })
      .then((du) => setDataUrl(du))
      .catch(() => setError(true));
  }, [url, size, bgColor, fgColor, errorCorrectionLevel]);

  if (error) {
    return (
      <Box
        sx={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "#f5f5f5",
          border: "1px dashed #ccc",
          borderRadius: 1,
          fontSize: "0.625rem",
          color: "#999",
          textAlign: "center",
          p: 1,
        }}
      >
        QR error
      </Box>
    );
  }

  if (!dataUrl) {
    return (
      <Box
        sx={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "#fafafa",
        }}
      >
        <CircularProgress size={20} />
      </Box>
    );
  }

  return (
    <img
      src={dataUrl}
      alt={`QR code for ${url}`}
      width={size}
      height={size}
      className={className}
      style={{ display: "block", imageRendering: "pixelated" }}
    />
  );
}

/**
 * Generate a QR code data URL (for download / canvas use).
 * Returns a Promise<string>.
 */
export async function generateQRDataUrl(
  url: string,
  size = 400,
  errorCorrectionLevel: "L" | "M" | "Q" | "H" = "M"
): Promise<string> {
  return QRCode.toDataURL(url, {
    width: size,
    margin: 1,
    errorCorrectionLevel,
  });
}

/**
 * Generate a QR code SVG string (for SVG download).
 * Returns a Promise<string>.
 */
export async function generateQRSvgString(
  url: string,
  size = 400,
  errorCorrectionLevel: "L" | "M" | "Q" | "H" = "M"
): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    width: size,
    margin: 1,
    errorCorrectionLevel,
  });
}
