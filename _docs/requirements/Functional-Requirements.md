# Functional Requirements - Immo Manager

> Erstellt: 2026-04-03 | Status: Draft
> Basierend auf den 100 Implementierungsfragen und den Modul-Spezifikationen (Dashboard, Portfolio, Analyse, Benachrichtigungen).

---

## FR-1: Authentifizierung & Benutzerverwaltung

### FR-1.1: Multi-User Login System

- Das System MUSS ein vollstaendiges Registrierungs- und Login-System bereitstellen.
- Authentifizierung erfolgt ueber Credentials (E-Mail + Passwort).
- Eigene Loesung (kein externer Auth-Provider wie Clerk oder Auth.js).
- Passwoerter MUESSEN mit bcrypt/argon2 gehasht gespeichert werden.
- Sessions MUESSEN serverseitig verwaltet werden (z.B. DB-basierte Sessions oder JWT mit Refresh-Tokens).

### FR-1.2: Benutzer-Einstellungen (Settings Tab)

- Jeder Nutzer MUSS einen Einstellungen-Tab haben mit folgenden Optionen:
  - **Sprache:** Umschaltbar zwischen Deutsch und Englisch (i18n).
  - **Waehrung:** Auswaehlbar zwischen EUR, USD, CHF. Alle monetaeren Werte in der UI MUESSEN in der gewaehlten Waehrung formatiert werden.
  - **Steuerquote:** Persoenlicher Einkommensteuersatz (konfigurierbar).
  - **Renteneintrittsalter/Jahr:** Manuell einstellbar (fuer Prognose-Charts).
  - **Health Score Gewichtung:** Cashflow, LTV, Rendite Gewichtung benutzerdefiniert anpassbar.
  - **KPI-Zeitraum:** Einstellbar (aktueller Monat, letzter Monat, letzte 12 Monate etc.).
  - **DSCR Zielwert:** Frei einstellbar (Default: 1.2x).
  - **Donut-Chart Schwellenwert:** Default 5%, anpassbar.
  - **Maklercourtage Default:** Konfigurierbar fuer Exit-Strategie.
  - **E-Mail-Signatur:** Konfigurierbare Signatur fuer ausgehende E-Mails.
  - **Teilen-Link Gueltigkeit:** Einstellbare Dauer fuer Read-Only Sharing Links.
  - **Jaehrliche Wertentwicklung Default:** Konfigurierbar fuer Exit-Strategie.
  - **Kapitalertragsteuer:** Pauschal 25% (ohne Soli), konfigurierbar.

---

## FR-2: Immobilien-Verwaltung (Portfolio)

### FR-2.1: Immobilien-Uebersicht (Listen- & Kartenansicht)

- Aggregierte KPI-Kopfzeile: Anzahl Einheiten, Marktwert, monatlicher Cashflow, durchschnittliche EK-Rendite.
- KPIs MUESSEN sich dynamisch bei Filter-/Kartenausschnitt-Aenderung aktualisieren.
- Volltext-Suchfeld (Strasse, Stadt, PLZ).
- Sortierungs-Dropdown (Neueste zuerst, Hoechster Cashflow etc.).
- Prominenter "Immobilie hinzufuegen"-Button startet den Anlage-Wizard.
- Interaktive Karte (Leaflet/OSM) mit Marker-Clustering bei hoher Dichte.
- Klick auf Marker hebt die zugehoerige Objekt-Karte hervor.
- Objekt-Karten mit: 1 Vorschaubild (clientseitig komprimiert), Status-Badges, Adresse, Kennzahlen (Flaeche, Typ, Besitzdauer, Marktwert, Cashflow, Rendite).
- Schnellaktionen pro Karte: Teilen, PDF-Export, Duplizieren, Bearbeiten, Loeschen.

### FR-2.2: Immobilien-Anlage-Wizard

- Mehrstufiger Wizard mit sinnvoller Schrittanzahl.
- **Property Types:** Einfamilienhaus, Doppelhaushälfte, Reihenhaus, Wohnung, Gewerbe, Grundstueck, Garage, Sonstige, MFH.
- **Status:** Vermietet, Leerstand, Fix & Flip, Eigenbedarf, In Renovierung, Verkauf geplant.
- Wenn der Typ mehrere Mieteinheiten erlaubt (MFH, Gewerbe etc.), MUSS die Anzahl der Einheiten eingebbar sein.
- Pflichtfelder: Adresse, Typ, Kaufpreis, Kaufdatum, Wohnflaeche.
- Optionale Felder: Grundstuecksflaeche, Baujahr, Zimmeranzahl, Marktwert, Notizen.
- 1 Vorschaubild (clientseitig komprimiert, lokal gespeichert).

### FR-2.3: Immobilien-Stammdaten

- Objekttyp, Adresse, Wohnflaeche, Grundstuecksflaeche, Baujahr, Zimmeranzahl, Kaufpreis, Kaufdatum, Marktwert (manuell), Status.
- Koordinaten (Geocoding via Nominatim/OSM fuer maximale Genauigkeit auf der Karte).
- Mikrolagen-Score: automatisch via POIs (kostenlos, z.B. Overpass/OSM), manuell ueberschreibbar.
- Benutzerdefinierte Tags/Labels pro Immobilie.

### FR-2.4: Steuer-relevante Daten pro Objekt

- AfA (Abschreibung): Anschaffungskosten Gebaeude, AfA-Satz, Beginn.
- Grundsteuer: Jaehrlicher Betrag.
- Weitere steuerlich relevante Angaben.

### FR-2.5: Immobilien-Detailansicht

- Hero-Bereich: Objektbild, Adresse, Typ, Stammdaten (Flaeche, Baujahr, Status, Kaufpreis).
- Standort-Karte mit Mikro-/Makrolage.
- POI-Anzeige (Gastronomie, Gesundheit, Kita, Supermarkt) mit Distanzen + Gesamt-Score.
- Handlungsbedarf & Chancen Feed (objektspezifisch, analog Dashboard).

### FR-2.6: Loeschen & Duplizieren

- **Loeschen:** Vor dem Loeschen MUSS eine Warnung mit Auflistung aller abhaengigen Daten angezeigt werden (Mieter, Kredite, Dokumente etc.). Hard Delete.
- **Duplizieren:** Der Nutzer MUSS auswaehlen koennen, welche Unterdaten mitkopiert werden (Mieter, Kredite, Dokumente).

### FR-2.7: Teilen-Funktion

- PDF-Export mit allen Daten (Stammdaten, Charts als Bilder, Finanzen).
- Read-Only Sharing Link: Zeitlich begrenzt (Dauer einstellbar), Token-basiert (kein Passwort).

---

## FR-3: Finanzierung & Kredite

### FR-3.1: Kredit-Verwaltung

- Eine Immobilie KANN mehrere Kredite haben (z.B. Hauptkredit + KfW).
- Pro Kredit: Bank, Darlehenssumme, Restschuld, Sollzins, Tilgungsrate, Monatsrate, Zinsbindungsende, Darlehensbeginn, Laufzeit, jaehrliches Sondertilgungslimit.
- Standard-Darlehenstyp: Annuitaetendarlehen.

### FR-3.2: Tilgungsplan

- Automatische Berechnung des vollstaendigen Tilgungsplans (Annuitaet).
- Darstellung als ausklappbares Akkordeon.
- Gegenuberstellung: Bisher gezahlte Zinsen vs. getilgte Summe (Vermoegensaufbau).

### FR-3.3: Cashflow-Rechner (Wasserfall)

- Berechnung: Kaltmiete - nicht umlagefaehige Nebenkosten - Bankrate = Cashflow vor Steuern.
- Cashflow nach Steuern unter Beruecksichtigung des konfigurierbaren Steuersatzes.
- Transparente Aufschluesselung als Wasserfall-Diagramm.

### FR-3.4: Instandhaltungsruecklage

- Monatlicher Ruecklage-Beitrag pro Objekt (abhaengig von Baujahr und qm).
- Erfasste Ausgaben werden abgezogen -> Netto-Liquiditaet.

---

## FR-4: Nebenkosten & Ausgaben

### FR-4.1: Aufgeschluesselte Nebenkosten

- Nebenkosten MUESSEN detailliert erfasst werden koennen: Heizung, Wasser, Muell, Strom (Allgemeinstrom), Versicherung, Hausmeister, Grundsteuer (Umlage), Sonstige.
- Unterscheidung: Umlagefaehig vs. nicht umlagefaehig.

### FR-4.2: Ausgaben-Tracking

- Pro Immobilie: Kategorie, Beschreibung, Betrag, Datum.
- Einmalig oder wiederkehrend (mit Intervall).

---

## FR-5: Mieter-Verwaltung

### FR-5.1: Mieter-Stammdaten

- Pro Mieter: Vorname, Nachname, E-Mail (mehrere moeglich), Telefon, Geschlecht.
- Ehemalige Adresse, Aktuelle Adresse (= Adresse der Mieteinheit).
- IBAN (fuer spaeteres Bankverbindungs-Matching).
- Kautionszahlung: Boolean (bezahlt ja/nein).
- Mietbeginn, Mietende (Vertragslaufzeit), Kuendigungsstatus.

### FR-5.2: Mietvertrags-Details

- Kuendigungsfrist, Staffelmiete, Indexmiete.
- Kaltmiete, Warmmiete.
- Vertragslaufzeit mit automatischer Leerstand-Erkennung bei Ablauf.

### FR-5.3: Mietanpassungen

- Das System MUSS Mietanpassungen (Mieterhoehungen) tracken und planen koennen.
- Historische Mietanpassungen MUESSEN gespeichert werden.

### FR-5.4: Mieter-Historie

- Vergangene Mieter pro Einheit MUESSEN als Historie einsehbar bleiben.

### FR-5.5: Mahn-Workflow

- Mahnungen KOENNEN auf Bedarf erstellt/generiert werden (als Dokument/PDF).
- Mahnungen werden NICHT automatisch versendet.
- Die Mahnungshistorie (Datum, Typ: Erinnerung/1. Mahnung/2. Mahnung/3. Mahnung) MUSS getracked werden.
- Die Mahn-Stufen MUESSEN einstellbar sein.

### FR-5.6: Leerstand-Erkennung

- Sofort ab dem Tag, an dem eine Einheit als "Leer" markiert wird.
- Automatische Leerstandanzeige, wenn das Mietvertragsende eines Mieters ueberschritten ist.
- Leerstand erscheint im Dashboard als "Handlungsbedarf" (ab Tag 1).

---

## FR-6: Mieteinnahmen-Tracking

### FR-6.1: Soll/Ist-Vergleich

- Monatliche Soll-Mieten vs. tatsaechliche Zahlungen.
- Offene Ausstaende farblich (rot) markiert.
- Status pro Zahlung: Ausstehend, Bezahlt, Ueberfaellig, Teilzahlung.

### FR-6.2: Zahlungserfassung

- Manuelles Abzeichnen von Zahlungseingaengen.
- Bankanbindungs-Feature fuer spaeter vorgesehen (Platzhalter in Schema).

---

## FR-7: Dokumente & Dateien

### FR-7.1: Dokumenten-Management

- Upload per Drag & Drop (PDFs, Bilder).
- Kategorien: Kaufvertrag, Mietvertraege, Nebenkostenabrechnungen, Bilder, Maengelanzeigen, Sonstige.
- Vorschau-Funktion fuer PDFs und Bilder.
- Lokale Speicherung auf dem Server.
- Maximale Dateigroesse: 25 MB.

### FR-7.2: Verknuepfung mit E-Mail-Anhaengen

- E-Mail-Anhaenge koennen per 1-Klick in die Immobilien-Akte transferiert werden.
- Beim Transfer: Dateiname anpassbar + Kategorie zuweisen.
- Rueckverlinkung im E-Mail-Reader ("Abgelegt in [Kategorie]").

---

## FR-8: Dashboard

### FR-8.1: Globale KPI-Uebersicht

- Nettovermoegen (absolut).
- Vermoegensentwicklung (absolut in Waehrung + relativ in %).
- Optimierungspotenzial (kumulierte Summe aus Action Center).
- Health Score (0-100) mit dynamischer Farbgebung (Rot <40, Gelb 40-70, Gruen >70).
- Health Score Sub-Metriken (Cashflow, LTV, Rendite) als Fortschrittsbalken.
- Gewichtung der Sub-Metriken benutzerdefiniert.
- Metrik-Erklaerungen via Tooltip bei Hover.

### FR-8.2: Vermoegensentwicklung (Prognose-Chart)

- Gestapeltes Flaechendiagramm (Tremor Raw) mit Marktwert, Restschuld, Netto-Vermoegen.
- Y-Achse: Abgekuerzte Zahlenwerte (z.B. "140 Mio.").
- Slider fuer jaehrliche Wachstumsrate (Echtzeit-Update).
- Zeithorizont-Buttons: 5J, 10J, 20J, bis Renteneintritt.
- Zweites Szenario als gestrichelte Linie (z.B. "Reinvestition").
- Szenarien speicherbar und benennbar.
- Komplexes Prognose-Modell: Inflation, Tilgungsverlauf, Mietentwicklung.
- Endwert-Karten unter dem Chart.

### FR-8.3: Portfolio-Allokation

- Donut-Chart (Marktwert-Verteilung).
- Objektanzahl im Zentrum.
- Objekte < 5% Anteil -> "Sonstige" (aufklappbar).
- Toggle: "Nach Marktwert" / "Gleichgewichtet (Anzahl)".
- Interaktive Legende mit Hover-Highlighting.

### FR-8.4: Action-Center

- Zwei Spalten: "Handlungsbedarf" (Risiken) + "Chancen & Potenziale".
- Karten mit Icon, Titel, Beschreibung, monetaerem Impact-Badge.
- Sortierung nach hoechstem finanziellem Hebel.
- Gruppierung identischer Problemtypen (Akkordeon).
- Ausblenden-Funktion ("Ignorieren").
- In-Context CTAs (Overlay/Modal im Dashboard).
- Zaehler-Badges an Spalten-Ueberschriften.
- Regeln fuer Handlungsbedarf/Chancen konfigurierbar.
- Mietpotenzial-Erkennung basierend auf staedtischem Mietspiegel.

---

## FR-9: Analyse-Module

### FR-9.1: Analyse-Cockpit Navigation & Portfolio-Vitalitaet

- Sticky Navigation (Links oder Oben) mit Smooth Scrolling zu Modulen.
- Portfolio-Vitalitaet: Aggregierter Gesundheitswert (Score/100) + Status-Text ("Kritisch"/"Stabil").
- Break-Even Zinssatz: Portfolio-weit UND pro Einzelobjekt.
- Fortschrittsbalken mit Ampelfarben (Abstand aktueller Zins <-> Break-Even).
- Refinanzierungsrisiko: Kreditvolumen mit Zinsbindungsende in waehlbarem Zeitraum.
- Globaler PDF-Export aller Analyse-Module (inkl. aktuelle Slider-Einstellungen).

### FR-9.2: Zins-Stress-Test

- Slider (0-15%, Schrittweite 0.1%) oder Texteingabe fuer Szenario-Zinssatz.
- Echtzeit-Update aller Berechnungen.
- Cashflow-Delta (monatlich, Ist vs. Szenario).
- DSCR als Multiplikator (z.B. 0.93x).
  - Unter 1.0: Negativer Cashflow (Warnung).
  - Gleich 1.0: Break-Even.
  - Ueber 1.0: Positiver Cashflow.
  - Zielwert einstellbar (in Settings).
  - Warnung + CTA bei Unterschreitung des Zielwerts.
- Liniendiagramm Zinskosten/Jahr: Baseline + Stress-Szenario (zwei Linien).

### FR-9.3: Sondertilgungs-Rechner (Opportunitaetskosten)

- Slider: Jaehrliche Sondertilgungssumme, prognostizierter Anschlusszins.
- Sondertilgungslimits aus Kreditvertrag MUESSEN geprueft werden.
- Settings: Anlagerendite (ETF, Default 7%), Kapitalertragsteuer (Default 25% ohne Soli).
- Gewinner-Ermittlung mit Highlight-Karte ("Fazit") + monetaerer Vorteil.
- ETF-Vergleich: Vor UND nach Steuern dargestellt.
- Zeit-/Zinsersparnis: Jahre frueher schuldenfrei + absolute Zinsersparnis.
- Flaechendiagramm: Restschuld (mit/ohne Sondertilgung) + ETF-Sparplan-Linie.
- **VFE wird NICHT beruecksichtigt.**

### FR-9.4: Zins-Optimierer (Umschuldungs-Analyse)

- Slider fuer neuen Sollzins.
- Eingabefeld fuer fixe Umschuldungskosten (Notar, Grundbuch).
- Live-Marktzins als Orientierung (kostenlose API, z.B. Bundesbank/EZB).
- Objektspezifische Berechnung: Lohnt sich Umschuldung pro Objekt?
- Amortisationsrechner: Zeitpunkt (Jahre) ab dem Zinsersparnis > Umschuldungskosten.
- Aggregiertes jaehrliches Einsparpotenzial (nur positive Faelle).
- **KEINE VFE-Berechnung.** VFE wird aus allen Berechnungen ausgelassen.

### FR-9.5: Exit-Strategie & Steuer-Check

- Slider: Verkaufszeitpunkt (in X Jahren), jaehrliche Wertentwicklung (konfigurierbar).
- Verkaufskosten: Maklercourtage (konfigurierbar).
- **KEINE VFE bei vorzeitigem Verkauf.**
- Spekulationsfrist-Check: Deutsche 10-Jahres-Frist basierend auf Kaufdatum.
- Objekt-Timeline: Kaufdatum, Spekulationsfristende, simulierter Verkauf (Gruen = steuerfrei, Rot = steuerpflichtig).
- Erloes: Bruttogewinn (Verkaufspreis - Restschuld), Netto-Erloes (nach Spekulationssteuer mit persoenlichem Einkommensteuersatz).

### FR-9.6: Analyse-Szenarien speichern

- Alle Analyse-Szenarien (Stress-Test, Sondertilgung, Exit) MUESSEN mit aktuellen Einstellungen gespeichert und benannt werden koennen.
- Gespeicherte Szenarien MUESSEN wieder geladen werden koennen.

---

## FR-10: E-Mail-System (Benachrichtigungen)

### FR-10.1: Postfach-Anbindung

- IMAP/SMTP-Konfiguration in Einstellungen.
- Felder: IMAP-Host, IMAP-Port, SMTP-Host, SMTP-Port, Benutzername, Passwort.
- Credentials MUESSEN verschlüsselt in der DB gespeichert werden (AES-256).
- Verbindungstest-Button.

### FR-10.2: E-Mail-Sync

- Automatischer Abruf alle 15 Minuten (Cron-Job im selben Next.js-Prozess).
- Nur Metadaten werden in der DB gespeichert (Absender, Betreff, Datum, Message-ID, In-Reply-To).
- E-Mail-Body wird on-demand vom IMAP-Server geladen.
- Anhaenge werden on-demand vom IMAP-Server geladen.

### FR-10.3: Mieter-Matching

- Absender-Adresse wird mit ALLEN E-Mail-Adressen aller Mieter abgeglichen.
- Ein Mieter KANN mehrere E-Mail-Adressen haben.
- Bei Match: Automatische Zuordnung zu Mieter + Wohneinheit + Immobilie.
- Bei keinem Match: E-Mail landet im "Sonstiges"-Tab.

### FR-10.4: Thread-Erkennung

- Basierend auf Message-ID / In-Reply-To Header.
- Betreffzeilen-Matching als Fallback ("Re: ...").
- Antworten werden chronologisch als Thread gebuendelt.

### FR-10.5: Posteingang-Ansicht

- Zugeordnete Inbox: Chronologische Liste (Absender, Betreff, Datum, Vorschau).
- Objekt/Mieter-Badge pro E-Mail.
- "Sonstiges"-Tab: Nicht gematchte E-Mails.
- Manuelle Zuweisung in "Sonstiges" via Dropdown (Immobilie + Mieter).
- Limit: Letzte 100 E-Mails gespeichert.

### FR-10.6: Mail-Reader

- Split-Screen (Liste links, Reader rechts).
- Kontext-Panel: Mieter-Stammdaten (Telefon, Kaltmiete, Rueckstaende, Objektadresse).
- Integrierte Antwort-Funktion (Versand via SMTP des Nutzers).
- Rich-Text Editor (WYSIWYG, z.B. Tiptap).
- E-Mail-Vorlagen mit Platzhaltern: `{{mieter_name}}`, `{{mieter_vorname}}`, `{{objekt_adresse}}`, `{{kaltmiete}}`, etc.
- Konfigurierbare E-Mail-Signatur.
- Versand-Tracking: Ob E-Mail geoeffnet/gelesen wurde.

### FR-10.7: Anhang-Management

- Anhang-Vorschau (PDF, JPG, PNG) als Kacheln.
- Max. 25 MB pro Datei.
- 1-Klick Transfer in Immobilien-Akte.
- Kategorisierungs-Modal beim Transfer.
- Rueckverlinkung im Reader nach Transfer.

---

## FR-11: In-App Benachrichtigungen & Push

### FR-11.1: In-App Benachrichtigungen

- Benachrichtigungen bei relevanten Events (z.B. neue E-Mail, ueberfaellige Miete, Leerstand).
- Bell-Icon mit Zaehler in der Hauptnavigation.

### FR-11.2: Browser Push Notifications

- Service Worker fuer Push-Benachrichtigungen.
- Opt-in pro Nutzer.
- Events: Neue E-Mail, ueberfaellige Miete, Vertragsende, Action-Center Items.

---

## FR-12: Audit Trail

### FR-12.1: Aenderungsprotokoll

- Jede Aenderung an Properties, Tenants, Loans, Payments MUSS protokolliert werden.
- Felder: Wer (User), Wann (Timestamp), Was (Entity + Field), Alter Wert, Neuer Wert.
- Einsehbar pro Objekt und global.

---

## FR-13: Marktdaten

### FR-13.1: Mietspiegel-Integration

- Mietspiegel der jeweiligen Stadt als Referenz fuer Mietpotenzial-Erkennung.
- Historische Marktdaten MUESSEN gespeichert werden koennen.
- Cache fuer abgerufene Marktdaten.

### FR-13.2: Marktzins-Integration

- Kostenlose API fuer aktuelle Bauzinsen (z.B. Bundesbank/EZB API).
- Anzeige als Orientierungswert im Zins-Optimierer.

---

## FR-14: Export & Berichte

### FR-14.1: PDF-Export

- Immobilien-Detailansicht als strukturierte PDF (alle Daten + Charts als Bilder).
- Analyse-Module als zusammenhaengender PDF-Report (inkl. aktuelle Slider-Einstellungen).
- Mahnungen als PDF generierbar.

### FR-14.2: Globale Objekt-Aktionen (Sticky Footer)

- Fixierte Leiste am unteren Rand: Bearbeiten, Duplizieren, Loeschen, Dokumenten-Management.
