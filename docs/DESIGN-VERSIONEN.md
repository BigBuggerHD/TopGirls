# Gespeicherte Design-Stände

Frühere Layouts, auf die zurückgesetzt werden kann. Jeder Stand ist ein Commit auf GitHub.

| Bereich | Beschreibung | Commit |
|---|---|---|
| Sedcard-Seite | Ursprüngliches Layout: Bilder untereinander, „Über mich“, Eigenschaften (2 Spalten), Verfügbarkeit rechts, Kontakt-Box rechts | `1dae151` |
| Sedcard-Seite | Neues Layout mit Vorschauleiste neben dem Bild, Eigenschaften als Kacheln, Kacheln Leistungen/Kontakt/Verfügbarkeit/Preise, Stadtkarte | `d7c5beb` |

## Zurücksetzen (Beispiel Sedcard-Seite)

Nur die Dateien der Sedcard-Seite auf einen gespeicherten Stand bringen, alles andere bleibt:

```bash
git checkout 1dae151 -- "src/app/(site)/profil/[slug]/page.tsx" src/components/profiles/gallery.tsx
```
