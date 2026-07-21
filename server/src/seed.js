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

export const users = [
  {
    id: 'u-admin',
    name: 'Arnab Maity',
    username: 'a.maity',
    role: 'System Administrator',
    agencyId: 'authority',
    clearance: 'L4',
    password: 'Cosmos@1812',
  },
];
