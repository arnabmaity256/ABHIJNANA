// Seed dataset for the production system.
// Retains only agencies and users for authentication.

export const AGENCY_ID = 'authority';

export const agencies = [
  {
    id: 'authority',
    name: 'Synthetic Media Verification Authority',
    short: 'SMVA',
    type: 'Designated Verification Authority',
    jurisdiction: 'All Zones',
    status: 'active',
    joinedAt: '2026-01-12',
  },
];

export const DEMO_PASSWORD = 'abhijnana';

export const users = [
  { id: 'u-officer', name: 'Insp. R. Deshpande', username: 'r.deshpande', role: 'Flagging Officer', agencyId: 'authority', clearance: 'L3', password: DEMO_PASSWORD },
  { id: 'u-analyst', name: 'A. Krishnan', username: 'a.krishnan', role: 'Verification Analyst', agencyId: 'authority', clearance: 'L2', password: DEMO_PASSWORD },
  { id: 'u-admin', name: 'Dir. S. Nair', username: 's.nair', role: 'System Administrator', agencyId: 'authority', clearance: 'L4', password: DEMO_PASSWORD },
];
