# Rollen und Berechtigungen

Die Rechtematrix ist in `src/lib/rbac.ts` definiert und wird serverseitig in jedem Layout, jeder Server Action und jeder API-Route geprüft (`requirePermission`). Im Adminbereich unter **Rollen & Rechte** ist sie als Matrix einsehbar; Rollen werden unter **Benutzer** vergeben (erfordert `admin.roles`, beendet alle Sitzungen des Kontos).

| Rolle | Beschreibung | Wesentliche Rechte |
|---|---|---|
| Besucher (`VISITOR`) | Registriertes Kundenkonto | Dashboard, Nachrichten an Inserenten |
| Einzelanbieterin (`PROVIDER`) | Eine eigene Sedcard | Sedcard, Premium, Werbung, Token, Statistiken, Marktplatz, Nachrichten, Forum, Verifizierung |
| Agentur (`AGENCY`) | Mehrere Sedcards | wie Anbieterin + mehrere Sedcards; je Personenprofil Einwilligungs-/Altersnachweis |
| Clubbetreiber (`CLUB`) | Club-Präsentation | wie Agentur |
| Massagestudio (`MASSAGE_STUDIO`) | Studio-Präsentation | wie Agentur |
| Apartmentanbieter (`APARTMENT`) | Vermietung | Marktplatz, Werbung, Token, Nachrichten, Forum, Verifizierung (keine Sedcards) |
| Moderator (`MODERATOR`) | Inhaltsprüfung | Sedcards, Bilder, ID-Prüfungen, Meldungen, Marktplatz, Forum, Werbebuchungen, gemeldete Nachrichten |
| Administrator (`ADMIN`) | Vollzugriff | alle Rechte inkl. Benutzer, Rollen, Kategorien, Filter, Preise, Token-Buchungen, Zahlungen, Einstellungen, Audit |

## Grundsätze

- Moderatoren sehen private Nachrichten **nur**, wenn diese gemeldet wurden, und dann nur die gemeldete Nachricht.
- Administratoren können ihr eigenes Konto nicht sperren oder herabstufen; Administratorkonten können nicht gesperrt werden.
- Alle administrativen Aktionen werden im Audit-Protokoll erfasst.
- Selbst wählbar bei der Registrierung: Besucher, Anbieterin, Agentur, Club, Massagestudio, Apartmentanbieter.
