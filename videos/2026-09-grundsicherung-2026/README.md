# Видео: «3 пропуска в Jobcenter» — Neue Grundsicherung с 01.07.2026

Вертикальный ролик 9:16 для TikTok / YouTube Shorts, аудитория — русскоязычные жители Германии.
Второй выпуск в той же визуальной системе, что и `../2026-09-pflegegrad-2027`.

## Готовые файлы (`out/`)

| Файл | Что это |
|---|---|
| `grundsicherung-2026_9x16.mp4` | Готовое видео 1080×1920, ~61 с, H.264 + AAC |
| `cover_1080x1920.png` | Обложка / первый кадр |
| `subtitles_ru.srt` | Субтитры (в видео вшиты, файл — для платформ) |
| `voiceover_ru.wav` | Отдельная дорожка озвучки |

## Факты в ролике

Действующее право: **13. SGB-II-Änderungsgesetz, в силе с 01.07.2026**. Bürgergeld заменён на Neue Grundsicherung (Grundsicherungsgeld).

**Санкции за Meldeversäumnis (§ 32 / § 32a SGB II)**
- 1-й пропуск приёма — без санкции
- 2-й — минус 30 % Regelsatz
- 3 подряд — Regelsatz снимают полностью; аренду один месяц платят напрямую арендодателю
- не явиться лично в течение этого месяца → статус «unerreichbar»: отпадает весь пакет — Regelsatz, Kosten der Unterkunft и Krankenversicherung
- явились в течение месяца → выплаты начисляют задним числом, но с минусом 30 %
- Pflichtverletzung (§ 31) — сразу минус 30 %, прежняя ступенчатая система отменена
- нарушения времён Bürgergeld в новый счёт не переносятся

**Vermögen**
- Karenzzeit (12 месяцев) отменена — имущество проверяют с первого дня
- Freibetrag теперь зависит от возраста; нижняя ступень — от 5 000 € на человека

**Kosten der Unterkunft**
- Karenzzeit по жилью осталась, но Jobcenter учитывает максимум **1,5× местной Angemessenheitsgrenze**; разницу доплачивает получатель
- исключения возможны (§ 22 SGB II), если более высокие расходы неизбежны

**Regelsatz**: 563 € для одиноких, не менялся с 01.01.2024. Решение по 2027 году на момент сборки не принято.

### Осознанно НЕ вошло в ролик
Полная таблица Schonvermögen по возрастам. Источники расходятся в верхней ступени (15 000 € против 20 000 €), официальный текст § 12 SGB II в этом окружении недоступен — сетевая политика блокирует gesetze-im-internet.de, buzer.de, arbeitsagentur.de и bundestag.de. В ролике названа только нижняя ступень (5 000 €), которая совпадает во всех источниках, и прямо сказано уточнять свою сумму в Jobcenter.

### Источники
- § 31, § 32, § 32a SGB II (13. SGB-II-Änderungsgesetz, в силе с 01.07.2026)
- Bundesagentur für Arbeit — Fachliche Weisungen zu § 32 SGB II ab Juli 2026
- Bundesregierung, Deutscher Bundestag — материалы к реформе
- Tacheles Sozialhilfe e.V., SoVD — разборы и Stellungnahmen

## Производство

Как и в первом выпуске: стоковые материалы не использовались, визуал целиком CSS/SVG, музыка синтезирована, лицензионных ограничений нет.

Пересобрать: `python3 build/tts.py && python3 build/render_video.py && python3 build/audio.py && ./build/mux.sh && python3 build/cover.py`

Заменить озвучку на студийную: положить `build/pro/s01.wav` … `s14.wav` (16-bit PCM) и запустить `./build/revoice.sh`.
