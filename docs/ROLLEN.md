# Rollen und Berechtigungen

Die Rechtematrix ist in `src/lib/rbac.ts` definiert und wird serverseitig in jedem Layout, jeder Server Action und jeder API-Route geprüft (`requirePermission`). Im Adminbereich unter **Rollen & Rechte** ist sie als Matrix einsehbar; Rollen werden unter **Benutzer** vergeben (erfordert `admin.roles`, beendet alle Sitzungen des Kontos).

## Einheitlicher Zugang

Bei der Registrierung gibt es **keine Kontoarten** mehr. Alle Nutzer – Anbieterinnen, Agenturen, Clubs, Massagestudios, Apartmentanbieter usw. – erhalten dieselbe Rolle **Mitglied** mit denselben Funktionen. Der Firmenname ist optional.

| Rolle | Beschreibung | Rechte |
|---|---|---|
| Mitglied (`MEMBER`) | Einheitliche Kontoart für alle | Sedcards (beliebig viele, bis zum Limit in den Einstellungen), Premium & Werbung, Token, Statistiken, Marktplatz, Nachrichten, Forum, Verifizierung |
| Moderator (`MODERATOR`) | Team: Inhaltsprüfung | Sedcards, Bilder, Echtheitsprüfung, Nachweise, Meldungen, Marktplatz, Forum, Werbebuchungen, gemeldete Nachrichten |
| Administrator (`ADMIN`) | Team: Vollzugriff | alle Rechte inkl. Benutzer, Rollen, Kategorien, Filter, Preise, Token-Buchungen, Zahlungen, Einstellungen, Audit |

Die früheren Kontoarten (Besucher, Einzelanbieterin, Agentur, Apartmentanbieter, Clubbetreiber, Massagestudio) existieren nur noch technisch in der Datenbank, werden nicht mehr vergeben und haben exakt die Rechte eines Mitglieds. Bestehende Konten wurden per Migration auf „Mitglied“ umgestellt.

## Schutzregel für Personen-Sedcards

Die **erste** Sedcard eines Kontos in den Kategorien „Frauen“ oder „Online-Inserate“ ist durch die Echtheitsprüfung der Sedcard (Assistent, Schritt 7) abgedeckt. **Jede weitere** Personen-Sedcard (typisch bei Agenturen) benötigt zusätzlich einen Alters- und Einwilligungsnachweis der dargestellten Person, der von der Moderation geprüft wird (`src/lib/model-consent.ts`).

## Grundsätze

- Moderatoren sehen private Nachrichten **nur**, wenn diese gemeldet wurden, und dann nur die gemeldete Nachricht.
- Administratoren können ihr eigenes Konto nicht sperren oder herabstufen; Administratorkonten können nicht gesperrt werden.
- Alle administrativen Aktionen werden im Audit-Protokoll erfasst.
