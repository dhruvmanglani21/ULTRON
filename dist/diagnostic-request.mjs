// src/lib/diagnostic-request.ts
function isPcDiagnosticRequest(input) {
  const text = input.toLowerCase().replace(/[,.!?;:]/g, " ").replace(/\s+/g, " ").trim().replace(/^(?:hey )?ultron\s+/, "").replace(/^please\s+/, "").replace(/\s+please$/, "");
  return /^(?:(?:give|show|read|run|generate|provide)(?: me)? (?:a |the |my )?)?(?:pc|computer|system)(?: health)? diagnostics?(?: report)?$/.test(text) || /^(?:diagnose|check)(?: my| the)? (?:pc|computer)(?: health)?$/.test(text);
}
export {
  isPcDiagnosticRequest
};
