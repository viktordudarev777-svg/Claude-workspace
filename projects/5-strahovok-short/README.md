# Short: 5 überflüssige Versicherungen (RU-Publikum in Deutschland)

Vertikaler Clip (TikTok / YouTube Shorts) aus einer Selfie-Aufnahme, im
gleichen Stil wie `projects/zahnzusatz-short`. Alle Aussagen stammen 1:1
aus dem Originalton — es wurden keine Fakten ergänzt oder verändert.

## Ergebnis
- `v2_final.mp4` — 1080×1920, 30 fps, 1:57, H.264 + AAC (nicht im Repo, direkt geliefert)
- `cover_1080x1920.jpg` — Cover / erstes Bild
- `subtitles/subtitles_ru.srt` — Untertitel auf Satzebene (YouTube-Upload)
- `subtitles/subs.ass` — eingebrannte Untertitel (Wort-Karaoke)
- `assets/` — im Video verwendete Grafiken (eigenerstellt, keine Fremdrechte)

## Inhalt (Original, Pausen gekürzt)
Hook: «5 страховок, которые тебе скорее всего продали зря.»

| # | Versicherung | Kernaussage im Clip |
|---|---|---|
| 01 | Handyversicherung | жёсткие условия, большая франшиза, ограниченный список случаев |
| 02 | Reiserücktrittsversicherung | пер Reise statt Jahrespolice → zusätzliche Gebühren |
| 03 | Insassenunfallversicherung | dubliert Haftpflichtversicherung des Unfallverursachers bzw. die Krankenkasse |
| 04 | Zahnzusatzversicherung (Economy) | Billigtarife erstatten nur ca. 20–30 % der Behandlungskosten |
| 05 | Unfallversicherung per Angebot | Paket ohne Bedarfsprüfung, kleine Schäden meist nicht erstattet |

Abschluss: Kommentare, kostenlose Beratung, Telefon in der Profil-Bio,
Sprecherin Anastasia (Versicherungs- und Finanzberaterin in Deutschland).

## Pipeline
Identisch zu `projects/zahnzusatz-short`, mit zwei Anpassungen:

1. **Schnittplan** (`scripts/cuts.json`) — Pausen werden nicht mehr nur über
   die RMS-Hüllkurve bestimmt: jede Pause wird auf den zusammenhängenden
   Bereich unter −40 dBFS eingeengt und zusätzlich gegen die ASR-Wortgrenzen
   geprüft (frühestens 0,30 s nach dem letzten Token, spätestens 0,10 s vor
   dem nächsten). 13 Schnitte, −3,3 s; alle Stoßstellen liegen bei −39 dB
   oder leiser, also im Grundrauschen.
2. **Upscaling** — die Quelle hat nur 464×832. Kette:
   `hqdn3d → lanczos auf 1404×2496 → unsharp 3:3:0.85 → unsharp 7:7:−0.22`,
   danach Downsampling durch `zoompan` auf 1080×1920. Der Zoombereich bleibt
   eng (1,30–1,375), damit die weiche Quelle nicht auffällt.

Untertitel skalieren pro Zeile automatisch herunter, wenn ein Wort zu breit
wird (`Reiserücktrittsversicherung` u. a.) — Basisgröße 78 px, Minimum 44 px.
