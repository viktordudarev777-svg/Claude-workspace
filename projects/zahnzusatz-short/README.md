# Short: Zahnzusatzversicherung (RU-Publikum in Deutschland)

Vertikaler Kurzclip (TikTok / YouTube Shorts) aus einer Selfie-Aufnahme.
Alle Aussagen stammen 1:1 aus dem Originalton — es wurden keine Fakten
ergänzt oder verändert.

## Ergebnis
- `final_9x16.mp4` — 1080×1920, 30 fps, 45,2 s, H.264 + AAC (nicht im Repo, direkt geliefert)
- `cover_1080x1920.jpg` — Cover / erstes Bild
- `subtitles/subtitles_ru.srt` — Untertitel (Satzebene, für YouTube-Upload)
- `subtitles/subs.ass` — eingebrannte Untertitel (Wort-Karaoke)
- `assets/` — im Video verwendete Grafiken (eigenerstellt, keine Fremdrechte)

## Transkript (Original, gekürzt um Pausen)
1. Внимание! Если у вас до сих пор ещё нет дополнительной зубной страховки, досмотрите это видео до конца.
2. Gesetzliche Krankenkassen урезают расходы именно на стоматологию.
3. На данный момент простое лечение одного зуба хорошим материалом стоит примерно от 500 до 1000 евро.
4. Как же быть дальше?
5. Дополнительная зубная страховка закрывает именно эти пробелы.
6. Она покрывает именно то, что ваша gesetzliche Krankenkasse отказывается выплачивать.
7. И чем раньше вы задумаетесь о данной страховке, тем быстрее начнёт действовать ваше полное покрытие.
8. Очень важно не ждать, когда уже начнут болеть зубы и наступают серьёзные проблемы,
9. а стоит задуматься уже сейчас, когда у вас всё в порядке с зубами.

## Pipeline
| Schritt | Datei | Werkzeug |
|---|---|---|
| Transkription (Timing) | `scripts/zf2.py` | sherpa-onnx Zipformer RU (Wort-Timestamps) |
| Transkription (Text) | `scripts/wh.py` | sherpa-onnx Whisper medium (Satzzeichen, DE-Begriffe) |
| Schnittplan (Pausen raus) | `scripts/plan.py` | RMS-Hüllkurve, 6 Schnitte, −2,0 s |
| Grafiken | `scripts/gen_html.py` + `html/base.css` | HTML/SVG → Chromium-Screenshot 1080×2120, auf 1920 beschnitten |
| Kamerafahrt | `scripts/zoom_expr.txt` | ffmpeg `zoompan`, stückweise lineare Keyframes |
| Untertitel | `scripts/subs.py` | ASS, Montserrat ExtraBold 78 px, Wort-Highlight |
| Musik | `scripts/music.py` | eigene Synthese (numpy/scipy), 84 bpm, Am7–Fmaj7–Cmaj7–G |
| Ton | `scripts/audio.sh` | rnnoise, EQ, De-Esser, Kompressor, loudnorm −14 LUFS, Sidechain-Ducking |

Schriften: Montserrat / Inter (SIL Open Font License), Latin- und Kyrillisch-Subsets
zu je einer TTF zusammengeführt.
