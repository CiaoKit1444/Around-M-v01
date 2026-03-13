/**
 * StatCard — Dashboard metric card with value, label, trend, and icon.
 *
 * Design: White card with subtle border, no heavy shadows.
 * Numbers use tabular-nums for aligned columns.
 */
import { Box, Card, CardContent, Typography, type SxProps } from "@mui/material";
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  trend?: number;
  trendLabel?: string;
  icon?: LucideIcon;
  iconColor?: string;
  sx?: SxProps;
  onClick?: () => void;
}

export default function StatCard({
  title,
  value,
  trend,
  trendLabel,
  icon: Icon,
  iconColor = "#2563EB",
  sx,
  onClick,
}: StatCardProps) {
  const trendPositive = trend !== undefined && trend > 0;
  const trendNegative = trend !== undefined && trend < 0;
  const trendNeutral = trend !== undefined && trend === 0;

  return (
    <Card
      sx={{
        height: "100%",
        ...(onClick ? { cursor: "pointer", "&:hover": { boxShadow: 3, transform: "translateY(-1px)", transition: "all 0.15s ease" } } : {}),
        ...sx,
      }}
      onClick={onClick}
    >
      <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontSize: "0.6875rem",
              fontWeight: 500,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            {title}
          </Typography>
          {Icon && (
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: `${iconColor}10`,
              }}
            >
              <Icon size={18} color={iconColor} strokeWidth={1.8} />
            </Box>
          )}
        </Box>
        <Typography
          variant="h2"
          sx={{
            fontWeight: 700,
            fontSize: "1.75rem",
            letterSpacing: "-0.02em",
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1,
            mb: 1,
          }}
        >
          {value}
        </Typography>
        {trend !== undefined && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            {trendPositive && <TrendingUp size={14} color="#059669" />}
            {trendNegative && <TrendingDown size={14} color="#DC2626" />}
            {trendNeutral && <Minus size={14} color="#737373" />}
            <Typography
              variant="body2"
              sx={{
                color: trendPositive ? "#059669" : trendNegative ? "#DC2626" : "text.secondary",
                fontWeight: 500,
                fontSize: "0.75rem",
              }}
            >
              {trendPositive && "+"}
              {trend}%
            </Typography>
            {trendLabel && (
              <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.75rem" }}>
                {trendLabel}
              </Typography>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
