const actions = new Set(["desktop_status","list_apps","open_app","list_windows","focus_window","inspect_window","click_control","type_text","press_shortcut","start_dictation","stop_dictation","list_contacts","draft_whatsapp","send_whatsapp"]);
export function isDesktopAction(action: string) { return actions.has(action); }
export function parseDesktopCommand(input: string): Record<string, unknown> | null {
  const text=input.trim().replace(/^(?:hey\s+)?ultron[,.:!]?\s*/i, "");
  const open=text.match(/^open\s+(.+)$/i);if(open)return {action:"open_app",text:open[1]};
  if(/^start (?:live )?dictation[.!]?$/i.test(text))return {action:"start_dictation"};
  if(/^stop dictation[.!]?$/i.test(text))return {action:"stop_dictation"};
  if(/^(?:list|show) (?:open )?windows[.!]?$/i.test(text))return {action:"list_windows"};
  if(/^inspect (?:the )?(?:active )?window[.!]?$/i.test(text))return {action:"inspect_window"};
  if(/^desktop status[.!]?$/i.test(text))return {action:"desktop_status"};
  const contacts=text.match(/^(?:find|show|list) contacts?(?:\s+(.+))?$/i);if(contacts)return {action:"list_contacts",text:contacts[1]||""};
  return null;
}
