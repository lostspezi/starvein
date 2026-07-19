# Credits

STARVEIN baut auf Daten und Vorarbeiten der Star-Citizen-Community auf:

- **[Diftic/SC_Signature_Scanner](https://github.com/Diftic/SC_Signature_Scanner)** (MIT-Lizenz, Autor: Mallachi) —
  Grundlage für die kuratierten Signatur-Fallbacks (Erze ohne Wiki-Signaturwert,
  z. B. Quantainium) sowie die Kompositionsfenster der Ship-Erze. Extrahiert aus
  `Game2.dcb` (SC 4.7).
- **[UEX Corp](https://uexcorp.space/)** — Erz-Codes sowie Preis- und
  Refinery-Daten über die UEX API 2.0.
- **[Star Citizen Wiki](https://star-citizen.wiki)** ([API](https://docs.star-citizen.wiki),
  Inhalte CC BY-SA 4.0, Code MIT) — Primärquelle der Mining-Referenz:
  Erz-Katalog inkl. Rarity und Signaturwerten (`/api/commodities`),
  Starmap-Locations (`/api/locations`), Fundort-Wahrscheinlichkeiten
  (Commodity-Details) und **einzige Quelle für die Crafting-Blueprints**
  (`/api/blueprints`): Rezepte, Zutatenmengen, Fertigungszeiten und
  Output-Typen, versioniert je Game-Version. Daraus wird auch der
  Materialkatalog abgeleitet. Wird per `pnpm sync:wiki` synchronisiert.
- **[RainbowRamen/sc-mining-hud](https://github.com/RainbowRamen/sc-mining-hud)** —
  Referenz für RS-Wert-Tabellen.
- **[RegolithCo/RegolithCo-Common](https://github.com/RegolithCo/RegolithCo-Common)** (MIT-Lizenz) —
  Grundlage für die Stat-Tabellen der Mining-Laser, -Module und -Gadgets im
  Loadout-Katalog (`data/curated/mining-*.json`), gegengeprüft mit UEX und
  dem [Star Citizen Wiki](https://starcitizen.tools) (CC BY-SA 4.0).

Die Schriftdateien in `public/og-fonts/` für die generierten
Social-Preview-Bilder stammen aus [Fontsource](https://fontsource.org/):
**[Inter](https://github.com/rsms/inter)** (© Rasmus Andersson) und
**[JetBrains Mono](https://github.com/JetBrains/JetBrainsMono)** (© JetBrains) —
beide unter der [SIL Open Font License 1.1](https://openfontlicense.org/).

Das „Made by the Community"-Logo im Footer ist das offizielle Fankit-Asset von
Cloud Imperium Games (Quelle: [RSI Knowledge Base — Star Citizen Fankit and
Fandom FAQ](https://support.robertsspaceindustries.com/hc/en-us/articles/360006895793))
und wird gemäß der dortigen Vorgaben verwendet.

This is an unofficial Star Citizen fansite, not affiliated with the Cloud
Imperium group of companies. All content on this site not authored by its host
or users are property of their respective owners.
