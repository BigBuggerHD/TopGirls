/**
 * Incall / Outcall wird aus der dynamischen Eigenschaft „Treffpunkt“ abgeleitet.
 * Werden diese Optionen im Adminbereich umbenannt, müssen die WERTE (nicht die Bezeichnungen) gleich bleiben.
 */
export const MEETING_FILTER_KEY = "treffpunkt";
export const INCALL_VALUE = "eigene-raeumlichkeiten"; // Haus-Symbol
export const OUTCALL_VALUE = "haus-hotelbesuche"; // Auto-Symbol

type WithMeeting = { attributes?: { options: { option: { value: string } }[] }[] };

export function meetingTypes(p: WithMeeting): { incall: boolean; outcall: boolean } {
  const values = new Set((p.attributes ?? []).flatMap((a) => a.options.map((o) => o.option.value)));
  return { incall: values.has(INCALL_VALUE), outcall: values.has(OUTCALL_VALUE) };
}
