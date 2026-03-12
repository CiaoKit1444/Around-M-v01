/**
 * useExportCSV — Reusable hook for exporting table data to CSV.
 *
 * Feature #23: CSV export for all list pages.
 * Supports custom column definitions, formatting, and filename.
 */
import { useCallback, useState } from "react";
import { toast } from "sonner";

export interface CSVColumn<T> {
  header: string;
  accessor: keyof T | ((row: T) => string | number | boolean | null | undefined);
}

export function useExportCSV<T>(filename: string, columns: CSVColumn<T>[]) {
  const [exporting, setExporting] = useState(false);

  const exportCSV = useCallback(
    (data: T[]) => {
      if (!data.length) {
        toast.error("No data to export");
        return;
      }

      setExporting(true);
      try {
        const header = columns.map((c) => `"${c.header}"`).join(",");
        const rows = data.map((row) =>
          columns
            .map((col) => {
              const val =
                typeof col.accessor === "function"
                  ? col.accessor(row)
                  : row[col.accessor];
              if (val === null || val === undefined) return '""';
              const str = String(val).replace(/"/g, '""');
              return `"${str}"`;
            })
            .join(",")
        );

        const csv = [header, ...rows].join("\n");
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`Exported ${data.length} rows to ${a.download}`);
      } catch (err) {
        toast.error("Export failed");
        console.error(err);
      } finally {
        setExporting(false);
      }
    },
    [filename, columns]
  );

  return { exportCSV, exporting };
}
