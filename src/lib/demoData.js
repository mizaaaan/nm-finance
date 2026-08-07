// Offline/demo fallbacks.
//
// The app ships with NO fabricated data: these functions return empty
// datasets so a fresh install (or an unreachable API) shows clean empty
// states instead of fake members, cars, or transactions. Real data always
// comes from the API (`/api/members`, `/api/cars`, `/api/transactions`,
// `/api/dashboard`).

export function demoMembers() {
  return []
}

export function demoCars() {
  return []
}

export function demoTransactions(_month) {
  return []
}

export function demoData(month) {
  return {
    asOf: new Date().toISOString(),
    balance: { inflow: 0, outflow: 0, net: 0 },
    month,
    monthly: { income: 0, contributions: 0, expenses: 0, dividends: 0, net: 0 },
    trend: [],
    members: [],
    recent: [],
    cars: []
  }
}
