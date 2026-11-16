# Security

This is an experimental desktop assistant. Review the source before enabling PC controls. Use a limited-permission ElevenLabs key and keep Windows security protections enabled.

Never publish private-credentials.json, API keys, session tokens, protected-settings.bin, contact lists or WhatsApp session data. If a key is exposed, revoke it in ElevenLabs and create a replacement. Do not open a public issue containing credentials or sensitive logs.

Desktop commands use constrained IPC and Windows accessibility APIs. Password fields, terminal text entry and arbitrary voice-triggered shell execution are blocked. Changes and WhatsApp sends require local approval. Ctrl + Alt + X disables PC commands and dictation.

Automated tests do not constitute a security audit or verify all Windows/WhatsApp behavior. Report security concerns without sensitive exploit data in public discussions; if no private reporting channel is available, ask the maintainer to arrange one before sharing confidential details.

PC reports use fixed, read-only PowerShell queries. They omit usernames, hostnames, IPs, Wi-Fi names, process command lines, raw event messages and disk serials. Only the measured summary is supplied to ElevenLabs for spoken replies; detailed reports remain local unless the user exports/shares them. Event IDs and process labels are data, not instructions, and never become shell commands. Unavailable checks must not be labeled healthy; no root cause or repair success may be invented.
