export function parseDateBR(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return null;

  const [day, month, year] = dateStr.split("/");

  if (!day || !month || !year) return null;

  const date = new Date(`${year}-${month}-${day}`);

  return isNaN(date.getTime()) ? null : date;
}
