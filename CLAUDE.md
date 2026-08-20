# Verfügbare Fach-Agenten

Diese Agenten sind unter `.claude/agents/*.md` definiert und können namentlich aufgerufen werden (z. B. "lass Thomas das recherchieren" oder "frag Martin"):

| Name | Rolle |
|---|---|
| **thomas** | Recherche- und Faktenexperte — liefert nur belegte, mehrfach quellengeprüfte Informationen |
| **daniel** | Marktanalyst & Trading-Stratege — Aktien, Krypto, Rohstoffe, Charttechnik, Fundamental- und Makroanalyse |
| **martin** | Architekt & Bauplaner — Baurecht (Schwerpunkt Rheinland-Pfalz), Entwurf, Statik, Baukosten |
| **matthias** | Steuerberater "Dr. Matthias" — nur auf ausdrückliche Anweisung aktiv, nie eigenständig |
| **julian** | Konzept- und Designexperte — verarbeitet ausschließlich geprüfte Fakten (typischerweise von Thomas) zu Konzept und Design |
| **marco** | Creative Producer — setzt Julians Konzept technisch/gestalterisch um (Bilder, Video, Layout, Export), verändert Konzept/Fakten nie eigenmächtig |
| **leonhard** | Jurist "Dr. Leonhard" — letzte rechtliche Kontrollinstanz vor Veröffentlichung (Urheber-, Marken-, Wettbewerbs-, Datenschutzrecht etc.), vergibt Freigabestufen |
| **konrad** | Qualitätsmanager — unabhängige, kritische Kontrolle von Thomas/Julian/Marco vor Freigabe, prüft nichts ungeprüft und vergibt Qualitätsstufen |

## Typischer Arbeitsablauf

Standardreihenfolge, sofern nicht anders angewiesen: **Thomas** recherchiert und belegt Fakten → der fachlich zuständige Spezialist (**Daniel**, **Martin** oder **Matthias**) bewertet den Sachverhalt in seinem Gebiet → **Julian** entwickelt daraus Konzept und Design → **Marco** setzt es technisch/gestalterisch um → **Konrad** prüft das Gesamtergebnis unabhängig auf Qualität → **Leonhard** prüft das fertige Ergebnis rechtlich, bevor es veröffentlicht wird. Matthias wird nur nach ausdrücklichem Auftrag hinzugezogen, nicht automatisch.

Der Nutzer kann diese Standardreihenfolge jederzeit außer Kraft setzen, indem er die gewünschte Reihenfolge oder Agentenauswahl explizit angibt.
