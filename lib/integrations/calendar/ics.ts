import { DateTime } from 'luxon';

export function escapeICSString(str: string): string {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

export interface ICSEvent {
  uid: string;
  start: string; // ISO String
  end: string;   // ISO String
  summary: string;
  description: string;
  organizer?: { name: string; email: string };
  attendees?: { name?: string; email: string }[];
  location?: string;
  dtstamp?: string;
}

export function generateICS(event: ICSEvent): string {
  const dtstamp = event.dtstamp 
    ? DateTime.fromISO(event.dtstamp).toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'")
    : DateTime.utc().toFormat("yyyyMMdd'T'HHmmss'Z'");
  
  const start = DateTime.fromISO(event.start).toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'");
  const end = DateTime.fromISO(event.end).toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'");

  const summary = escapeICSString(event.summary);
  const description = escapeICSString(event.description);
  const location = escapeICSString(event.location || '');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Calendly//Interview//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`
  ];

  if (location) {
    lines.push(`LOCATION:${location}`);
  }

  if (event.organizer) {
    lines.push(`ORGANIZER;CN="${escapeICSString(event.organizer.name)}":mailto:${event.organizer.email}`);
  }

  if (event.attendees) {
    for (const attendee of event.attendees) {
      const cn = attendee.name ? `;CN="${escapeICSString(attendee.name)}"` : '';
      lines.push(`ATTENDEE;RSVP=TRUE${cn}:mailto:${attendee.email}`);
    }
  }

  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
}
