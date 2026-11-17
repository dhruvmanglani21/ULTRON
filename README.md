# U.L.T.R.O.N.

A Windows 11 voice assistant with a red control interface, a theatrical machine personality, ElevenLabs voice, desktop app controls, live dictation, WhatsApp drafts and reviewed sends.

**Open source under the MIT license. Bring your own ElevenLabs API key. No key is included.**

> This is an experimental desktop application. The 23 automated software tests pass in the development environment; live Windows automation, microphone/voice behavior and WhatsApp sending need verification on your PC. Supported controls vary by app. “All clear” covers the automated tests only.

## Features

- Voice conversations through ElevenLabs, with WebRTC and WebSocket connection options.
- Open installed apps, list/focus windows, inspect accessible controls and request approved actions.
- Phrase-by-phrase dictation into a focused editable field.
- Local named WhatsApp contacts, QR linking, message drafts and explicit send approval.
- Notes, timers, focus sessions and three personality settings.
- **PC diagnostic report:** read-only Windows health findings, possible contributors, suggested next steps, spoken summary and a downloadable full report.
- **System check:** 23 visible automated results, a beep per result, and “All clear” only when all pass.
- **Emergency stop:** `Ctrl + Alt + X` disables desktop commands and dictation.

## Quick start — Windows 11

1. Download `downloads/ULTRON_Desktop_Windows_Public.zip` from this repository, or use **Code → Download ZIP** for the full source.
2. Right-click the downloaded ZIP → **Extract All**. Extract to a normal short folder, for example `C:\ULTRON`. Do not launch from inside the ZIP.
3. Install [Node.js LTS](https://nodejs.org/en/download) if it is missing. The launcher requires Node.js 22 or later.
4. Double-click **Start_ULTRON.cmd**. On first launch it downloads the official Electron runtime from GitHub, checks its SHA-256 checksum and extracts it to `%LOCALAPPDATA%\ULTRON\runtime`. It does not run npm installation. Keep enough free space on your Windows drive for the download and extraction; 2 GB free is a practical starting point.
5. In the red main window, click **Configuration**, paste **your own ElevenLabs API key**, leave **Agent ID** empty, and click **Connect & Initialize ULTRON**.
6. Give the API key **ElevenAgents read/write**, including agents/tools and conversation access, plus **Voices read**. Labels can vary in the ElevenLabs dashboard. Restricted keys must also permit conversation history/details for diagnostics.
7. Click **Activate voice** and allow the microphone. If WebRTC disconnects, choose **Configuration → Voice connection → WebSocket — compatibility mode**, close Configuration, then activate voice again.
8. Open **Desktop controls** and click the large **Enable PC controls** button fixed at the bottom. Alternatively press `Ctrl + Alt + E` while that controls window is focused. The status must read **PC commands enabled**.

The app must stay open. Close its main window to quit. Desktop commands start disabled each launch. ElevenLabs account allowance, current plan limits and network access determine voice availability; the app does not enable a paid plan.

## Everyday commands

| Say or type | Result |
| --- | --- |
| `Open Notepad` | Requests the launch of the installed app. |
| `Show open windows` | Lists app windows. |
| `Inspect the active window` | Reads accessible controls for the voice agent. |
| `Click the Font control` | Requests an action on a recently inspected control, with local approval. |
| `Type: meeting starts at three` | Requests reviewed text entry into an editable field. |
| `Start dictation` | Arms dictation after local approval. |
| `Ultron stop dictation` | Ends dictation. |
| `Find contact Mum` | Searches the contacts you saved in Desktop controls. |
| `Draft a WhatsApp message to Mum saying I will be home at six` | Prepares a message without sending. |
| `Send Mum a WhatsApp message saying I will be home at six` | Opens a draft and requests Send approval. |
| `Ultron, please give PC diagnostic report` | Collects actual Windows health information and reads a summary with suggested fixes. |
| `System check` | Runs and displays all 23 bundled automated software tests. |
| `Save a note: submit the report tomorrow` | Saves an app-local note. |
| `Start a timer for five minutes` | Starts an app-local countdown. |

Complex app instructions need an active ElevenLabs voice session. Basic typed commands such as app opening, window lists, contact search and system check can run locally. The assistant cannot operate every feature of every app.

## Dictation

1. Enable desktop commands and activate voice.
2. Say **Start dictation** and approve the local dialog.
3. Click the destination app's editable text field.
4. Speak in phrases with brief pauses. Each final transcription is inserted as text.
5. Say **Ultron stop dictation** as a complete phrase, or press `Ctrl + Alt + X`.

The first destination window is locked for that run. Stop and restart dictation to change windows. AI replies are muted and other app actions are blocked during dictation. Password fields and terminal applications are blocked. Dictation uses ElevenLabs transcription; it is not offline character-by-character recognition.

## WhatsApp

1. Open **Desktop controls → Open WhatsApp & link account**.
2. Scan the official WhatsApp Web QR code with WhatsApp on your phone through **Linked devices**.
3. Add a distinct contact name and a complete international phone number. Include the country code; none is guessed.
4. Ask for a draft or a send to that name.
5. Before sending, review the visible chat, name, number and exact message. Click **Send message** only if correct.

Use WhatsApp Web in **English** for the current send-button matcher. A changed draft or unavailable Send control stops the action. An uncertain result must be checked in the chat before retrying. Submission does not prove delivery or reading. This project is not affiliated with WhatsApp or Meta.

## PC diagnostic report

1. Enable **PC controls** in the Desktop controls window.
2. Activate voice and say **“Ultron, please give PC diagnostic report.”** You can also type it or click **PC report** in the header, without a live voice connection.
3. Wait for the read-only scan (up to 45 seconds). The report shows measured evidence, possible contributors, and suggested next steps. Voice replies read a summary; **Read full report** uses your local Windows/browser voice to read the details.
4. Use **Refresh report** to take another snapshot, or **Save report** to export a text file. Review exported reports before sharing them.

The report checks CPU load, sampled busy processes, RAM use, local-drive free space, reported physical-drive health, Windows network/firewall status, Defender/registered antivirus status, System/Application critical/error events from the past 24 hours, known restart flags, startup-entry count, and battery level where present. Windows version and uptime are also shown. No administrator elevation is requested; unavailable or denied checks are marked incomplete.

This is separate from **system check**, which still runs the original 23 ULTRON software tests. The PC report does not run a malware scan, surface/SMART test, temperature test, battery-wear test, network speed test, or an available-Windows-update scan. A snapshot cannot prove a root cause. High resource use and past event-log entries are reported as observations, not proof that a particular app or driver is broken.

The report does **not** change settings, close apps, delete files, apply updates, or perform repairs. It does not collect usernames, hostnames, IP addresses, Wi-Fi names, personal file contents, process command lines, disk serial numbers, raw event messages, or browser history. The detailed report stays local unless you save/share it. During a live ElevenLabs session, its measured spoken summary is sent for the reply; **Read full report** reads locally. Stop dictation before requesting diagnostics.

## System check and beeps

Say **system check** during a voice session, type it, or click **System check** in the header. Keep output volume above zero.

- The actual bundled 23-test suite runs locally with no npm install.
- Results appear one by one; each result gets a short beep. Failures use a lower pitch.
- “All clear” is announced only after all 23 pass. Failed, incomplete or timed-out runs do not receive it.
- The microphone is temporarily muted during checks to prevent feedback.
- Tests use mock API responses and a temporary localhost server. They **do not** test live ElevenLabs quota, the actual microphone/speaker, Windows UI Automation or WhatsApp delivery.

## API keys and local data

Enter a key in Configuration for normal use. The public repository and download contain **no personal key**.

An optional local configuration file is supported:

1. Copy `private-credentials.example.json` to `private-credentials.json`.
2. Put your own key into the copied file.
3. Restart ULTRON, leave the key field empty and click Connect & Initialize.

`private-credentials.json` is plaintext and ignored by Git. Never commit or share it, session tokens, logs with private content, contacts, or WhatsApp session data. A typed key takes precedence over the optional configured key. Changing the configured key invalidates old encrypted voice sessions.

The Electron main process connects directly to ElevenLabs. Session credentials and saved contacts use Windows protected storage in the app's per-user data directory. WhatsApp authentication uses a dedicated local browser session. Microphone audio/transcripts are processed by ElevenLabs; requested window/control names and selected contact details can be sent to the voice agent to carry out your instruction. The app does not expose arbitrary shell/code execution as a voice tool.

## Troubleshooting

| Problem | Action |
| --- | --- |
| Launcher exits | Read `ULTRON-startup.log` next to the launcher. Remove private details before sharing logs. |
| `ENOSPC` | Free space on the Windows drive used by `%LOCALAPPDATA%`, then retry. |
| Runtime download fails | Check internet access to GitHub release downloads. The runtime checksum is verified before use. |
| Key connects but voice closes | Try WebSocket mode and **Configuration → Check last voice call**. Diagnostics show the provider's `metadata.error.reason`, error code, termination reason and call ID when available. If the call is still processing, check again shortly. If no reason is supplied, open the matching call in ElevenLabs Agents → Call history. A failed call with zero replies alone does not establish a credit problem. |
| No microphone | Check Windows **Privacy & security → Microphone** and device selection. |
| No speaker audio | Use **Test speaker (tone)**, check Windows volume and use **Enable speaker**. |
| PC commands disabled | Click the large bottom button in Desktop controls, or use `Ctrl + Alt + E` there. |
| Saved agent is missing | Connect again; the app finds an accessible desktop agent or creates a replacement. |
| App feature cannot be controlled | Inspect the window and try an exposed menu/control; some apps expose little accessibility information. |
| WhatsApp draft is not ready | Finish QR linking, verify the international number and use English. |

Do not disable Windows security protections to run this app. It uses normal user permissions; elevated/protected app windows may be unavailable.

## Development

```bash
npm ci
npm run build
npm test
npm run test:diagnostics
npm start
```

`npm ci` installs Electron for your platform and esbuild for rebuilding. For build/test work where a native Electron binary is unnecessary, set `ELECTRON_SKIP_BINARY_DOWNLOAD=1` before installing. PC automation is Windows-specific even if portable tests pass on another OS.

| File | Purpose |
| --- | --- |
| `main.cjs` / `preload.cjs` | Electron main process and constrained UI bridge. |
| `manager.html` / `manager.js` | Desktop enablement and contact management. |
| `windows-helper.ps1` | Windows accessibility controls and text input. |
| `src/app/page.tsx` | Red interface, voice flow and system-check panel. |
| `src/voice-api.ts` | Private desktop-agent setup and ElevenLabs diagnostics. |
| `pc-diagnostics.ps1` / `pc-diagnostics.cjs` | Read-only Windows collection and evidence-based report generation. |
| `diagnostic-tests/` | Eight additional diagnostic-report tests, separate from the 23-test system check. |
| `system-check.cjs` / `tests/` | Visible test runner and 23-test suite. |
| `bootstrap.cjs` / `Start_ULTRON.cmd` | Windows launch and verified runtime download. |
| `dist/` | Prebuilt app so ordinary users can start without npm installation. |

If you add/remove tests, update the expected count and UI labels in the system-check feature. Rebuild `dist/` whenever source changes.

## License and credits

Original project code is [MIT licensed](LICENSE). Third-party licenses remain applicable; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Built with Electron, React and the ElevenLabs JavaScript client. U.L.T.R.O.N. is a fan-inspired project and is not affiliated with Marvel, Disney, ElevenLabs, Microsoft, WhatsApp or Meta.

## Continuous voice and allowance

The old five-minute call cap, 40-second silence hang-up, 30-call daily setting, one-call agent concurrency setting and 350-token reply cap are removed. Existing ULTRON Desktop agents are migrated when voice starts, so reconnecting to an older agent does not retain those settings.

ElevenLabs currently requires a per-call maximum between 60 and 7,200 seconds. ULTRON uses the provider-supported maximum and automatically starts a new provider call when a confirmed duration-ended active call finishes. There may be a brief audio gap; recent transcript context is supplied to the new call. This is renewal, not an unlimited-length single provider conversation. Manual End session/cancel stops renewal. Quota, authentication, permission and network failures remain visible and are not retried indefinitely.

Silence disconnection is disabled. Agent concurrency uses the provider's unlimited sentinel, while the former custom 30-call budget is reset to ElevenLabs' documented default of 100,000 conversations/day. No application-side daily counter or credit cutoff is enforced. ElevenLabs may still apply account, daily, concurrency and other service limits; ULTRON cannot remove them or promise to stop only when a key expires. Burst overage is not enabled.

Configuration displays the subscription credit/character allowance reported by ElevenLabs, refreshed approximately every minute while connected. This is not a conversion to remaining voice minutes and may differ from per-key restrictions or unsettled call usage. If a restricted key cannot read the balance, enable User read to display it; missing balance permission does not block voice. No billing settings are changed, and the balance display does not impose its own cutoff. Encrypted credentials renew as active sessions request new connection credentials.

Run `npm run test:continuous` for policy migration, balance formatting and renewal-condition tests. The original 23-test system check remains unchanged.
