# Contributing

1. Fork the repository and create a branch for your change.
2. Use your own ElevenLabs account for any live checks. Never commit API keys, private-credentials.json, contact lists, user-data folders, WhatsApp sessions or private logs.
3. Install dependencies with `npm ci`, then run `npm run build` and `npm test`.
4. Keep rebuilt `dist/` files synchronized so the Windows launcher works without npm installation.
5. Describe what changed and what you verified. Clearly distinguish portable tests from Windows/live-service checks.
6. Submit a pull request. Include steps to reproduce fixes without sharing private credentials.

The current system-check feature expects 23 tests. Update the expected count, UI and documentation if you intentionally change the test count. Keep allowlisted IPC, authentication, draft verification and local action approvals intact.
