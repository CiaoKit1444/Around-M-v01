/**
 * LocaleSwitcher — Language picker for the guest microsite.
 * Compact button that opens a popover with flag + language options.
 */
import { useState } from "react";
import {
  IconButton, Popover, Box, Typography, MenuItem,
} from "@mui/material";
import { Globe } from "lucide-react";
import { useI18n, LOCALES } from "@/lib/i18n";

export default function LocaleSwitcher() {
  const { locale, setLocale } = useI18n();
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);

  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  return (
    <>
      <IconButton
        size="small"
        onClick={(e) => setAnchor(e.currentTarget)}
        title="Change language"
        sx={{
          border: "1px solid #E5E5E5",
          borderRadius: 1.5,
          p: 0.75,
          gap: 0.5,
          fontSize: "0.75rem",
          color: "#404040",
        }}
      >
        <Globe size={14} />
        <Typography variant="caption" sx={{ fontWeight: 600, lineHeight: 1 }}>
          {current.flag}
        </Typography>
      </IconButton>

      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{ sx: { borderRadius: 1.5, boxShadow: "0 4px 20px rgba(0,0,0,0.12)", mt: 0.5, minWidth: 160 } }}
      >
        <Box sx={{ py: 0.5 }}>
          {LOCALES.map((l) => (
            <MenuItem
              key={l.code}
              selected={l.code === locale}
              onClick={() => { setLocale(l.code); setAnchor(null); }}
              sx={{
                gap: 1.5, py: 0.75, px: 2, fontSize: "0.8125rem",
                "&.Mui-selected": { bgcolor: "#F5F5F5", fontWeight: 600 },
              }}
            >
              <span style={{ fontSize: "1.1rem" }}>{l.flag}</span>
              <Typography variant="body2" sx={{ fontWeight: l.code === locale ? 600 : 400 }}>
                {l.label}
              </Typography>
            </MenuItem>
          ))}
        </Box>
      </Popover>
    </>
  );
}
