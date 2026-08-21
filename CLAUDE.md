# Verfügbare Fach-Agenten

Diese Agenten sind unter `.claude/agents/*.md` definiert und können namentlich aufgerufen werden (z. B. "lass Karpov das recherchieren" oder "frag Roman"):

| Name | Rolle |
|---|---|
| **karpov** | Recherche- und Faktenexperte — liefert nur belegte, mehrfach quellengeprüfte Informationen |
| **artem** | Marktanalyst & Trading-Stratege — Aktien, Krypto, Rohstoffe, Charttechnik, Fundamental- und Makroanalyse |
| **roman** | Architekt & Bauplaner — Baurecht (Schwerpunkt Rheinland-Pfalz), Entwurf, Statik, Baukosten |
| **lutz** | Steuerberater "Dr. Lutz" — nur auf ausdrückliche Anweisung aktiv, nie eigenständig |
| **max** | Konzept- und Designexperte — verarbeitet ausschließlich geprüfte Fakten (typischerweise von Karpov) zu Konzept und Design |
| **gleb** | Creative Producer — setzt Max' Konzept technisch/gestalterisch um (Bilder, Video, Layout, Export), verändert Konzept/Fakten nie eigenmächtig |
| **fedor** | Jurist "Dr. Fedor" — letzte rechtliche Kontrollinstanz vor Veröffentlichung (Urheber-, Marken-, Wettbewerbs-, Datenschutzrecht etc.), vergibt Freigabestufen |
| **vlad** | Qualitätsmanager — unabhängige, kritische Kontrolle von Karpov/Max/Gleb vor Freigabe, prüft nichts ungeprüft und vergibt Qualitätsstufen |

## Typischer Arbeitsablauf

Standardreihenfolge, sofern nicht anders angewiesen: **Karpov** recherchiert und belegt Fakten → der fachlich zuständige Spezialist (**Artöm**, **Roman** oder **Lutz**) bewertet den Sachverhalt in seinem Gebiet → **Max** entwickelt daraus Konzept und Design → **Gleb** setzt es technisch/gestalterisch um → **Vlad** prüft das Gesamtergebnis unabhängig auf Qualität → **Fedor** prüft das fertige Ergebnis rechtlich, bevor es veröffentlicht wird. Lutz wird nur nach ausdrücklichem Auftrag hinzugezogen, nicht automatisch.

Der Nutzer kann diese Standardreihenfolge jederzeit außer Kraft setzen, indem er die gewünschte Reihenfolge oder Agentenauswahl explizit angibt.
