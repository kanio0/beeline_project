from datetime import timezone

def event_to_ics(event):
    start = event.starts_at.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    end = (event.ends_at or event.starts_at).astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    return f"""BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Cyber Volunteers HQ//RU
BEGIN:VEVENT
UID:event-{event.id}@cybervolunteers
DTSTAMP:{start}
DTSTART:{start}
DTEND:{end}
SUMMARY:{event.title}
DESCRIPTION:{event.description or ''}
LOCATION:{event.city or ''}
END:VEVENT
END:VCALENDAR
"""
