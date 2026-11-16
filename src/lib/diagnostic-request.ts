/** Recognize an explicit report request, never arbitrary text mentioning diagnostics. */
export function isPcDiagnosticRequest(input: string): boolean {
  const text=input.toLowerCase().replace(/[,.!?;:]/g,' ').replace(/\s+/g,' ').trim().replace(/^(?:hey )?ultron\s+/, '').replace(/^please\s+/, '').replace(/\s+please$/, '');
  return /^(?:(?:give|show|read|run|generate|provide)(?: me)? (?:a |the |my )?)?(?:pc|computer|system)(?: health)? diagnostics?(?: report)?$/.test(text) || /^(?:diagnose|check)(?: my| the)? (?:pc|computer)(?: health)?$/.test(text);
}
