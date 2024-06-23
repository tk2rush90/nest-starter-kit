/**
 * Convert `Date` object to `yyyy-MM-dd HH:mm:ss` format.
 * @param dateObject
 */
export function toDateTimeString(dateObject: Date): string {
  const year = dateObject.getFullYear();
  const month = dateObject.getMonth() + 1;
  const date = dateObject.getDate();
  const hours = dateObject.getHours();
  const minutes = dateObject.getMinutes();
  const seconds = dateObject.getSeconds();

  return `${year}-${month.toString().padStart(2, '0')}-${date.toString().padStart(2, '0')} ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
