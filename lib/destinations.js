// typicalDirect = typical non-stop flight time in minutes from TLV.
// Used by garbage filter: drops flights where duration > typicalDirect * 2.5
const DEST_MAP = {
  LCA: { name: 'Cyprus (Larnaca)',    typicalDirect: 70  },
  PFO: { name: 'Cyprus (Paphos)',     typicalDirect: 65  },
  ATH: { name: 'Athens',              typicalDirect: 135 },
  RHO: { name: 'Rhodes',              typicalDirect: 105 },
  SKG: { name: 'Thessaloniki',        typicalDirect: 120 },
  HER: { name: 'Heraklion (Crete)',   typicalDirect: 110 },
  JMK: { name: 'Mykonos',             typicalDirect: 120 },
  JTR: { name: 'Santorini',           typicalDirect: 130 },
  CFU: { name: 'Corfu',               typicalDirect: 140 },
  TBS: { name: 'Tbilisi',             typicalDirect: 180 },
  EVN: { name: 'Yerevan',             typicalDirect: 175 },
  GYD: { name: 'Baku',                typicalDirect: 185 },
  IST: { name: 'Istanbul',            typicalDirect: 90  },
  SAW: { name: 'Istanbul (Sabiha)',   typicalDirect: 90  },
  ADB: { name: 'Izmir',               typicalDirect: 80  },
  SOF: { name: 'Sofia',               typicalDirect: 150 },
  OTP: { name: 'Bucharest',           typicalDirect: 170 },
  BEG: { name: 'Belgrade',            typicalDirect: 195 },
  TIA: { name: 'Tirana',              typicalDirect: 175 },
  SKP: { name: 'Skopje',              typicalDirect: 165 },
  AMM: { name: 'Amman',               typicalDirect: 60  },
  CAI: { name: 'Cairo',               typicalDirect: 90  },
  HRG: { name: 'Hurghada',            typicalDirect: 90  },
  SSH: { name: 'Sharm el-Sheikh',     typicalDirect: 55  },
  DXB: { name: 'Dubai',               typicalDirect: 210 },
  VIE: { name: 'Vienna',              typicalDirect: 260 },
  BUD: { name: 'Budapest',            typicalDirect: 240 },
  PRG: { name: 'Prague',              typicalDirect: 270 },
};

// Flat list (kept for compatibility with filterGarbage lookups)
export const DESTINATIONS = Object.entries(DEST_MAP).map(([iata, d]) => ({ iata, ...d }));

// Clusters: each cluster is one SerpAPI call (comma-separated arrival_id).
// HFA_ONLY = true → skip for non-Haifa origins (HFA has limited routes).
export const CLUSTERS = [
  { label: 'Cyprus',         airports: ['LCA', 'PFO']                        },
  { label: 'Greece',         airports: ['ATH', 'RHO', 'SKG', 'HER', 'JMK', 'JTR', 'CFU'] },
  { label: 'Turkey',         airports: ['IST', 'SAW', 'ADB']                 },
  { label: 'Caucasus',       airports: ['TBS', 'EVN', 'GYD'],  hfaOnly: false },
  { label: 'Balkans',        airports: ['SOF', 'OTP', 'BEG', 'TIA', 'SKP']  },
  { label: 'Middle East',    airports: ['AMM', 'CAI', 'HRG', 'SSH']         },
  { label: 'Gulf',           airports: ['DXB']                               },
  { label: 'Central Europe', airports: ['VIE', 'BUD', 'PRG']                },
];

// Clusters reachable from Haifa (HFA has limited routes)
export const HFA_CLUSTERS = ['Cyprus', 'Greece'];

export function destByIata(iata) {
  return DEST_MAP[iata] || { name: iata, typicalDirect: null };
}
