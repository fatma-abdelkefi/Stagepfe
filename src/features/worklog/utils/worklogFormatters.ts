export function formatDateTime(value?: string | null): string {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

export function extractLongText(item: any): string {
  return (
    item?.description_longdescription?.ldtext ||
    (typeof item?.description_longdescription === 'string'
      ? item.description_longdescription
      : '') ||
    item?.longdescription ||
    item?.ldtext ||
    ''
  )
    .toString()
    .trim();
}