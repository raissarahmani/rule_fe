/**
 * Formats an ISO date string into 'DD MMM YYYY HH.mm' format forced to GMT+7
 * Example: '2026-06-23T05:00:00Z' -> '23 Jun 2026 12.00'
 */
export function formatDateTime(dateString: string | Date): string {
  if (!dateString) return "-";
  
  const date = new Date(dateString);
  
  // Return fallback if the date string is broken/invalid
  if (isNaN(date.getTime())) return "-";

  // 1. Configure formatting parts explicitly localized to Indonesian/English short months
  const formatter = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta", // Hardcodes calculation context to GMT+7
  });

  const parts = formatter.formatToParts(date);
  
  // 2. Map structural components out of the token array
  const day = parts.find((p) => p.type === "day")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const year = parts.find((p) => p.type === "year")?.value;
  const hour = parts.find((p) => p.type === "hour")?.value;
  const minute = parts.find((p) => p.type === "minute")?.value;

  // 3. Assemble components back into the specific dot-separated time structure
  return `${day} ${month} ${year} ${hour}.${minute}`;
}

export function formatDate(dateString: string | Date): string {
  if (!dateString) return "-";
  
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) return "-";

  const formatter = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour12: false,
    timeZone: "Asia/Jakarta", // Hardcodes calculation context to GMT+7
  });

  const parts = formatter.formatToParts(date);

  const day = parts.find((p) => p.type === "day")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const year = parts.find((p) => p.type === "year")?.value;

  return `${day} ${month} ${year}`;
}

// export const formatLocalDate = (date: Date) => {
//   const offset = date.getTimezoneOffset();
//   const localDate = new Date(date.getTime() - (offset * 60 * 1000));
//     return localDate.toISOString().split('T')[0];
//   };
