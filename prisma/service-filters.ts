/**
 * Service-Angaben der Sedcard gemäß Vorgabe „Service“ (Reihenfolge = Vorgabe).
 * Bereich „service“: erscheinen im Assistenten in Schritt 3, nicht bei den Eigenschaften.
 * Diese Datei wird vom Seed genutzt; die Migration 20261129100000_sedcard_service legt dieselben Daten an.
 */
export type ServiceFilter = { key: string; label: string; type: "SELECT" | "MULTISELECT" | "BOOLEAN"; sort: number; options: [string, string][]; showInSearch?: boolean };

export const SERVICE_FILTERS: ServiceFilter[] = [
  {
    "key": "wen_treff_ich",
    "label": "Wen treff ich?",
    "type": "MULTISELECT",
    "sort": 10,
    "options": [
      [
        "maenner",
        "Männer"
      ],
      [
        "frauen",
        "Frauen"
      ],
      [
        "paare",
        "Paare"
      ],
      [
        "sexorgie",
        "Sexorgie"
      ],
      [
        "ts-tv",
        "TS/TV"
      ]
    ]
  },
  {
    "key": "outcall_ort",
    "label": "Outcall",
    "type": "SELECT",
    "sort": 21,
    "options": [
      [
        "hotel",
        "Hotel"
      ],
      [
        "privat",
        "Privat"
      ],
      [
        "privat-hotel",
        "Beides"
      ]
    ]
  },
  {
    "key": "auch_mit",
    "label": "Auch mit",
    "type": "MULTISELECT",
    "sort": 30,
    "options": [
      [
        "koerperlicher-behinderung",
        "körperlicher Behinderung"
      ],
      [
        "geistiger-behinderung",
        "geistiger Behinderung"
      ],
      [
        "alter-ueber-60",
        "Alter über 60"
      ],
      [
        "starkem-uebergewicht",
        "starkem Übergewicht"
      ]
    ]
  },
  {
    "key": "service_verkehr",
    "label": "Verkehr",
    "type": "MULTISELECT",
    "sort": 100,
    "options": [
      [
        "geschlechtsverkehr-safe",
        "Geschlechtsverkehr safe"
      ],
      [
        "girlfriendsex",
        "Girlfriendsex"
      ],
      [
        "handentspannung",
        "Handentspannung"
      ],
      [
        "busenerotik-spanisch",
        "Busenerotik spanisch"
      ],
      [
        "duett",
        "Duett"
      ],
      [
        "av-passiv",
        "AV passiv"
      ],
      [
        "av-aktiv-fuer-ts",
        "AV aktiv für TS"
      ]
    ]
  },
  {
    "key": "service_franzoesisch",
    "label": "Französisch",
    "type": "MULTISELECT",
    "sort": 101,
    "options": [
      [
        "franzoesisch",
        "Französisch"
      ],
      [
        "franzoesisch-safe",
        "Französisch safe"
      ],
      [
        "franzoesisch-bei-ihr",
        "Französisch bei ihr"
      ],
      [
        "franzoesisch-beidseitig",
        "Französisch beidseitig"
      ],
      [
        "deepthroating",
        "Deepthroating"
      ],
      [
        "zungenanal-aktiv",
        "Zungenanal aktiv"
      ],
      [
        "zungenanal-passiv",
        "Zungenanal passiv"
      ]
    ]
  },
  {
    "key": "service_kuessen",
    "label": "Küssen",
    "type": "MULTISELECT",
    "sort": 102,
    "options": [
      [
        "kuessen",
        "Küssen"
      ],
      [
        "kuessen-bei-sympathie",
        "Küssen bei Sympathie"
      ],
      [
        "zungenkuesse",
        "Zungenküsse"
      ],
      [
        "zungenkuesse-bei-sympathie",
        "Zungenküsse bei Sympathie"
      ],
      [
        "koerperkuesse",
        "Körperküsse"
      ]
    ]
  },
  {
    "key": "service_abschluesse",
    "label": "Abschlüsse",
    "type": "MULTISELECT",
    "sort": 103,
    "options": [
      [
        "koerperbesamung",
        "Körperbesamung"
      ],
      [
        "gesichtsbesamung",
        "Gesichtsbesamung"
      ],
      [
        "im-mund",
        "im Mund"
      ],
      [
        "schlucken",
        "Schlucken"
      ]
    ]
  },
  {
    "key": "service_finger_dildospiele",
    "label": "Finger- & Dildospiele",
    "type": "MULTISELECT",
    "sort": 104,
    "options": [
      [
        "fingerspiele",
        "Fingerspiele"
      ],
      [
        "dildospiele",
        "Dildospiele"
      ],
      [
        "dildo-bei-ihm",
        "Dildo bei Ihm"
      ],
      [
        "dildo-gegenseitig",
        "Dildo gegenseitig"
      ],
      [
        "umschnalldildo",
        "Umschnalldildo"
      ],
      [
        "fisting",
        "Fisting"
      ],
      [
        "fisting-passiv",
        "Fisting passiv"
      ]
    ]
  },
  {
    "key": "service_doktorspiele",
    "label": "Doktorspiele",
    "type": "MULTISELECT",
    "sort": 105,
    "options": [
      [
        "doktorspiele",
        "Doktorspiele"
      ],
      [
        "doktorspiele-aktiv",
        "Doktorspiele aktiv"
      ],
      [
        "doktorspiele-passiv",
        "Doktorspiele passiv"
      ],
      [
        "prostatastimulation",
        "Prostatastimulation"
      ],
      [
        "klistier",
        "Klistier"
      ],
      [
        "katheter",
        "Katheter"
      ]
    ]
  },
  {
    "key": "service_wellness_massagen",
    "label": "Wellness-Massagen",
    "type": "MULTISELECT",
    "sort": 106,
    "options": [
      [
        "wellnessmassage",
        "Wellnessmassage"
      ],
      [
        "entspannungsmassage",
        "Entspannungsmassage"
      ],
      [
        "paarmassage",
        "Paarmassage"
      ],
      [
        "oelmassagen",
        "Ölmassagen"
      ],
      [
        "honig-massage",
        "Honig Massage"
      ],
      [
        "hot-stone-massage",
        "Hot Stone Massage"
      ],
      [
        "hot-chocolate-massage",
        "Hot Chocolate Massage"
      ],
      [
        "kerzenwachs-massage",
        "Kerzenwachs-Massage"
      ],
      [
        "aromatherapie",
        "Aromatherapie"
      ],
      [
        "indische-massage",
        "Indische Massage"
      ],
      [
        "thailaendische-massagen",
        "Thailändische Massagen"
      ],
      [
        "aegyptische-massage",
        "Ägyptische Massage"
      ],
      [
        "tao-massage",
        "Tao Massage"
      ],
      [
        "sensitivmassagen",
        "Sensitivmassagen"
      ],
      [
        "doppel-4-hand-massage",
        "Doppel 4-Hand Massage"
      ]
    ]
  },
  {
    "key": "service_erotik_massagen",
    "label": "Erotik-Massagen",
    "type": "MULTISELECT",
    "sort": 107,
    "options": [
      [
        "erotikmassagen",
        "Erotikmassagen"
      ],
      [
        "nuru-tantra-massage",
        "Nuru Tantra Massage"
      ],
      [
        "tantramassagen",
        "Tantramassagen"
      ],
      [
        "libido-yoni-massage",
        "Libido/Yoni Massage"
      ],
      [
        "lingam-massage",
        "Lingam Massage"
      ],
      [
        "kamasutra-massage",
        "Kamasutra Massage"
      ],
      [
        "russische-massage",
        "Russische Massage"
      ],
      [
        "spanische-massagen",
        "Spanische Massagen"
      ],
      [
        "body2body",
        "Body2Body"
      ],
      [
        "duettmassage",
        "Duettmassage"
      ],
      [
        "blind-date-massage",
        "Blind Date Massage"
      ],
      [
        "gegenseitige-massagen",
        "Gegenseitige Massagen"
      ],
      [
        "griechische-analmassagen",
        "Griechische Analmassagen"
      ],
      [
        "dominante-massage",
        "Dominante Massage"
      ]
    ]
  },
  {
    "key": "service_klassische_massagen",
    "label": "Klassische Massagen",
    "type": "MULTISELECT",
    "sort": 108,
    "options": [
      [
        "klassische-massagen",
        "Klassische Massagen"
      ],
      [
        "medizinische-massage",
        "Medizinische Massage"
      ],
      [
        "ruecken-massage",
        "Rücken-Massage"
      ],
      [
        "gesichtsmassage",
        "Gesichtsmassage"
      ],
      [
        "gesicht-lymphdrainage",
        "Gesicht Lymphdrainage"
      ],
      [
        "fussreflexzonen-massage",
        "Fußreflexzonen-Massage"
      ],
      [
        "peeling-massage",
        "Peeling Massage"
      ]
    ]
  },
  {
    "key": "service_bdsm_dominant",
    "label": "BDSM dominant",
    "type": "MULTISELECT",
    "sort": 109,
    "options": [
      [
        "leicht-dominante-spiele",
        "Leicht dominante Spiele"
      ],
      [
        "bizarre-spiele",
        "Bizarre Spiele"
      ],
      [
        "bizarre-spiele-dominant",
        "Bizarre Spiele dominant"
      ],
      [
        "englische-erziehung",
        "Englische Erziehung"
      ],
      [
        "erziehung",
        "Erziehung"
      ],
      [
        "langzeiterziehung",
        "Langzeiterziehung"
      ],
      [
        "feminisierung",
        "Feminisierung"
      ],
      [
        "erotische-ringkaempfe",
        "Erotische Ringkämpfe"
      ],
      [
        "trampling",
        "Trampling"
      ],
      [
        "facesitting",
        "Facesitting"
      ],
      [
        "bastonade",
        "Bastonade"
      ],
      [
        "cbt",
        "CBT"
      ],
      [
        "flag-hand",
        "Flag Hand"
      ]
    ]
  },
  {
    "key": "service_bdsm_devot",
    "label": "BDSM devot",
    "type": "MULTISELECT",
    "sort": 110,
    "options": [
      [
        "leicht-devote-spiele",
        "Leicht devote Spiele"
      ],
      [
        "bizarre-spiele-devot",
        "Bizarre Spiele devot"
      ],
      [
        "total-power-exchange",
        "Total Power Exchange"
      ],
      [
        "bondage",
        "Bondage"
      ],
      [
        "knebeln",
        "Knebeln"
      ],
      [
        "mumifizierung",
        "Mumifizierung"
      ],
      [
        "kaefighaltung",
        "Käfighaltung"
      ],
      [
        "keuschhaltung",
        "Keuschhaltung"
      ],
      [
        "sinnesentzug",
        "Sinnesentzug"
      ],
      [
        "reizstrom",
        "Reizstrom"
      ],
      [
        "klammern",
        "Klammern"
      ],
      [
        "nadeln",
        "Nadeln"
      ],
      [
        "wachsspiele",
        "Wachsspiele"
      ],
      [
        "zart-bis-hart",
        "Zart bis hart"
      ]
    ]
  },
  {
    "key": "service_fetisch_outfits",
    "label": "Fetisch & Outfits",
    "type": "MULTISELECT",
    "sort": 111,
    "options": [
      [
        "latex-gummi",
        "Latex/Gummi"
      ],
      [
        "lack-leder",
        "Lack/Leder"
      ],
      [
        "fusserotik",
        "Fußerotik"
      ],
      [
        "nylonerotik",
        "Nylonerotik"
      ],
      [
        "pet-play",
        "Pet-Play"
      ],
      [
        "schwarzer-bereich",
        "Schwarzer Bereich"
      ],
      [
        "weisser-bereich",
        "Weißer Bereich"
      ]
    ]
  },
  {
    "key": "service_ns",
    "label": "NS",
    "type": "MULTISELECT",
    "sort": 112,
    "options": [
      [
        "ns",
        "NS"
      ],
      [
        "ns-aktiv",
        "NS aktiv"
      ],
      [
        "ns-passiv",
        "NS passiv"
      ]
    ]
  },
  {
    "key": "service_gruppe_duett",
    "label": "Gruppe & Duett",
    "type": "MULTISELECT",
    "sort": 113,
    "options": [
      [
        "sexorgie",
        "Sexorgie"
      ],
      [
        "2-maenner-1-frau",
        "2 Männer, 1 Frau"
      ],
      [
        "2-frauen-1-mann",
        "2 Frauen, 1 Mann"
      ],
      [
        "lesbisches-duett",
        "Lesbisches Duett"
      ]
    ]
  },
  {
    "key": "service_sonstiges",
    "label": "Sonstiges",
    "type": "MULTISELECT",
    "sort": 114,
    "options": [
      [
        "striptease",
        "Striptease"
      ],
      [
        "vorfuehrung",
        "Vorführung"
      ],
      [
        "rollenspiele",
        "Rollenspiele"
      ],
      [
        "verbalerotik",
        "Verbalerotik"
      ],
      [
        "spass-im-pool",
        "Spaß im Pool"
      ],
      [
        "duschspiele",
        "Duschspiele"
      ]
    ]
  },
  {
    "key": "weitere_services",
    "label": "Weitere Services auf Anfrage",
    "type": "BOOLEAN",
    "sort": 200,
    "options": [],
    "showInSearch": false
  }
];
