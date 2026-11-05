export function formatWithCommas(value: string | number): string {
   if (!value && value !== 0) return "";
   
   const cleanValue = String(value).replace(/\D/g, "");
   if (!cleanValue) return "";
   return Number(cleanValue).toLocaleString("en-US");
}