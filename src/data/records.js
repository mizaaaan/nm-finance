// Company records transcribed from the 2026 workbooks:
//   Monthly Accounts -2026.xlsx, Divident.xlsx,
//   Director Profit & Loss Accounts- 2026.xlsx,
//   Car Sale Installment.xlsx, Board of Directors.xlsx
//
// Figures are as the workbooks record them. Derived values (member totals,
// contract balances, holding values) are summed from the listed rows so the
// registers reconcile line by line; where the source disagrees with itself the
// note on the page says so.

export const COMPANY = {
  group: 'Next Millionaire',
  operator: 'Al Jaloui Transportation',
  period: '2026',
  currency: 'AED',
  asOf: '17 November 2026'
}

export const SHARE_PRICE = 3000

/* ── Board of Directors ─────────────────────────────────────── */

export const DIRECTORS = [
  { name: 'Md Mamun', shares: 5, invested: 15000, collected: 15000, due: 0, phone: '' },
  { name: 'Abdus Salam', shares: 5, invested: 15000, collected: 9000, due: 6000, phone: '' },
  { name: 'Abdullah Jahangir', shares: 5, invested: 15000, collected: 4000, due: 11000, phone: '72058840' },
  { name: 'Nazmul Hossain', shares: 5, invested: 15000, collected: 3000, due: 12000, phone: '' },
  { name: 'Abdur Rakib', shares: 5, invested: 15000, collected: 2500, due: 12500, phone: '' },
  { name: 'Mizanur Rahman', shares: 5, invested: 15000, collected: 9000, due: 6000, phone: '' },
  { name: 'Taj Mohammad', shares: 5, invested: 15000, collected: 9000, due: 6000, phone: '' },
  { name: 'Nesar Uddin Ahmed', shares: 5, invested: 15000, collected: 13000, due: 2000, phone: '' },
  { name: 'Abdul Alim Azhary', shares: 5, invested: 15000, collected: 15000, due: 0, phone: '' },
  { name: 'Abul Bashar', shares: 5, invested: 15000, collected: 6000, due: 9000, phone: '' },
  { name: 'Lovely islam Ranu', shares: 5, invested: 15000, collected: 6000, due: 9000, phone: '' },
  { name: 'Huzaifa Salam', shares: 5, invested: 15000, collected: 3000, due: 12000, phone: '' },
  { name: 'Kazi Moinul Haq', shares: 5, invested: 15000, collected: 15000, due: 0, phone: '' },
  { name: 'Farabi Rahman', shares: 5, invested: 15000, collected: 3000, due: 12000, phone: '' },
  { name: 'Saddam Hossain', shares: 5, invested: 15000, collected: 15000, due: 0, phone: '' },
  { name: 'Bellal', shares: 5, invested: 15000, collected: 1000, due: 15000, phone: '' },
  { name: 'Nozir Ahamed', shares: 5, invested: 15000, collected: 15000, due: 0, phone: '' },
  { name: 'Rafi Al Adnan', shares: 5, invested: 15000, collected: 15000, due: 0, phone: '' },
  { name: 'Md Zahidul islam', shares: 5, invested: 15000, collected: 15000, due: 0, phone: '8801770640000' }
]

export const DIRECTORS_TOTAL = {
  invested: 285000,
  collected: 173500,
  due: 112500
}

/* ── Member contribution list ───────────────────────────────── */

export const CONTRIBUTORS = [
  { name: 'Md Mamun Sheikh', amount: 3000, alJaloui: 4300 },
  { name: 'Abdus Salam', amount: 3000, alJaloui: 6500 },
  { name: 'Nazmul Hossain Sujan', amount: 3000, alJaloui: 0 },
  { name: 'Abdur Rakib', amount: 2500, alJaloui: 0 },
  { name: 'Md Jahangir Hossain', amount: 3000, alJaloui: 1000 },
  { name: 'Nazmul Hasan', amount: 2000, alJaloui: 0 },
  { name: 'Mezanur Rahman IT', amount: 0, alJaloui: 0 },
  { name: 'Ruhul Amin', amount: 3000, alJaloui: 0 },
  { name: 'Mohiuddin Babul', amount: 3000, alJaloui: 0 },
  { name: 'Apel Mahmud', amount: 3000, alJaloui: 0 },
  { name: 'Mohammad Yousuf', amount: 3000, alJaloui: 0 },
  { name: 'Mezanur Rahman', amount: 6000, alJaloui: 3000 },
  { name: 'Kabirul islam', amount: 3000, alJaloui: 0 },
  { name: 'Md Obaydur Rahman', amount: 3000, alJaloui: 0 },
  { name: 'G M Nozir Ahmed', amount: 12000, alJaloui: 3000 },
  { name: 'Hujayfa Salam', amount: 3000, alJaloui: 0 },
  { name: 'Imam Uddin Babu', amount: 3000, alJaloui: 3000 },
  { name: 'Fakhruddin', amount: 3000, alJaloui: 0 },
  { name: 'Lokman Hossain', amount: 3000, alJaloui: 0 },
  { name: 'Abul Bashar', amount: 6000, alJaloui: 4000 },
  { name: 'Monirul Islam Babu', amount: 3000, alJaloui: 0 },
  { name: 'Rafiqur Rahman Maruf', amount: 3000, alJaloui: 0 },
  { name: 'Hafijur Rahman Jahangir', amount: 3000, alJaloui: 0 },
  { name: 'Saddam Hossain', amount: 3000, alJaloui: 0 },
  { name: 'Taj Mohammed', amount: 3000, alJaloui: 6000 },
  { name: 'Kazi Moinul Haque', amount: 3000, alJaloui: 0 },
  { name: 'Kazi Ashraful Haque', amount: 3000, alJaloui: 0 },
  { name: 'Farabi Rahman Eashan', amount: 3000, alJaloui: 0 },
  { name: 'Abdul Alim azhari', amount: 3000, alJaloui: 0 },
  { name: 'Shajahan Mridha', amount: 3000, alJaloui: 0 },
  { name: 'Md Abdur Rahim', amount: 3000, alJaloui: 0 },
  { name: 'Farzana Akter', amount: 3000, alJaloui: 0 },
  { name: 'Ayesha Rahman', amount: 3000, alJaloui: 0 },
  { name: 'Md Abu Bakar', amount: 3000, alJaloui: 0 },
  { name: 'Sumaiya Chowdhury', amount: 3000, alJaloui: 0 },
  { name: 'Fuad Bin Abdul Alim', amount: 3000, alJaloui: 0 },
  { name: 'Hamad Bin Abdul Alim', amount: 3000, alJaloui: 0 },
  { name: 'Tasnim Binte Abdul Alim', amount: 3000, alJaloui: 0 },
  { name: 'Nessar uddin', amount: 3000, alJaloui: 10000 },
  { name: 'Prottasha Parvez', amount: 3000, alJaloui: 0 },
  { name: 'Sadia Afroz', amount: 3000, alJaloui: 0 },
  { name: 'Sahil Hossain Safwan', amount: 3000, alJaloui: 0 },
  { name: 'Ruksana Sultana Ani', amount: 3000, alJaloui: 0 },
  { name: 'Loveley islam Ranu', amount: 6000, alJaloui: 0 },
  { name: 'Rafi Al Adnan', amount: 15000, alJaloui: 15000 },
  { name: 'Samia Afroz', amount: 6000, alJaloui: 6000 },
  { name: 'Zahidul islam', amount: 15000, alJaloui: 15000 },
  { name: 'Bellal', amount: 0, alJaloui: 15000 }
]

export const CONTRIBUTORS_TOTAL = { amount: 181500, alJaloui: 91800, total: 273300 }

/* ── Dividends ──────────────────────────────────────────────── */

export const DIVIDEND_RUNS = [
  {
    id: '2026-09-21',
    date: '21 Sep 2026',
    label: '21 September 2026',
    rate: 100,
    entries: [
      { name: 'Md Mamun Sheikh', shares: 1 },
      { name: 'Abdus Salam', shares: 1 },
      { name: 'Nazmul Hossain Sujan', shares: 1 },
      { name: 'Abdur Rakib', shares: 1 },
      { name: 'Md Jahangir Hossain', shares: 1 },
      { name: 'Ruhul Amin', shares: 1 },
      { name: 'Mohiuddin Babul', shares: 1 },
      { name: 'Apel Mahmud', shares: 1 },
      { name: 'Mohammad Yousuf', shares: 1 },
      { name: 'Mezanur Rahman', shares: 2 },
      { name: 'Kabirul islam', shares: 1 },
      { name: 'Md Obaydur Rahman', shares: 1 },
      { name: 'G M Nozir Ahmed', shares: 4 },
      { name: 'Hujayfa Salam', shares: 1 },
      { name: 'Md Imam Uddin Babu', shares: 1 },
      { name: 'Fakhruddin', shares: 1 },
      { name: 'Lokman Hossain', shares: 1 },
      { name: 'Abul Bashar', shares: 2 },
      { name: 'Monirul Islam Babu', shares: 1 },
      { name: 'Rafiqur Rahman Maruf', shares: 1 },
      { name: 'Hafijur Rahman Jahangir', shares: 1 },
      { name: 'Saddam Hossain', shares: 1 },
      { name: 'Taj Mohammed', shares: 1 },
      { name: 'Kazi Moinul Haque', shares: 1 },
      { name: 'Kazi Ashraful Haque', shares: 1 },
      { name: 'Farabi Rahman Eashan', shares: 1 },
      { name: 'Abdul Alim azhari', shares: 1 },
      { name: 'Shajahan Mridha', shares: 1 },
      { name: 'Md Abdur Rahim', shares: 1 },
      { name: 'Farzana Akter', shares: 1 },
      { name: 'Ayesha Rahman', shares: 1 },
      { name: 'Md Abu Bakar', shares: 1 },
      { name: 'Sumaiya Chowdhury', shares: 1 },
      { name: 'Fuad Bin Abdul Alim', shares: 1 },
      { name: 'Hamad Bin Abdul Alim', shares: 1 },
      { name: 'Tasnim Binte Abdul Alim', shares: 1 },
      { name: 'Nessar uddin', shares: 1 },
      { name: 'Prottasha Parvez', shares: 1 },
      { name: 'Sadia Afroz', shares: 1 },
      { name: 'Sahil Hossain Safwan', shares: 1 },
      { name: 'Ruksana Sultana Ani', shares: 1 },
      { name: 'Loveley islam Ranu', shares: 2 }
    ]
  },
  {
    id: '2026-09-26',
    date: '26 Sep 2026',
    label: '26 September 2026',
    rate: 100,
    entries: [
      { name: 'Md Mamun Sheikh', shares: 1 },
      { name: 'Mezanur Rahman', shares: 2 },
      { name: 'Kabirul islam', shares: 1 },
      { name: 'Md Obaydur Rahman', shares: 1 },
      { name: 'G M Nozir Ahmed', shares: 4 },
      { name: 'Monirul Islam Babu', shares: 1 },
      { name: 'Rafiqur Rahman Maruf', shares: 1 },
      { name: 'Hafijur Rahman Jahangir', shares: 1 },
      { name: 'Saddam Hossain', shares: 1 },
      { name: 'Kazi Moinul Haque', shares: 1 },
      { name: 'Kazi Ashraful Haque', shares: 1 },
      { name: 'Farabi Rahman Eashan', shares: 1 },
      { name: 'Md Abdur Rahim', shares: 1 },
      { name: 'Farzana Akter', shares: 1 },
      { name: 'Ayesha Rahman', shares: 1 },
      { name: 'Md Abu Bakar', shares: 1 },
      { name: 'Prottasha Parvez', shares: 1 },
      { name: 'Sadia Afroz', shares: 1 },
      { name: 'Sahil Hossain Safwan', shares: 1 },
      { name: 'Ruksana Sultana Ani', shares: 1 },
      { name: 'Loveley islam Ranu', shares: 2 }
    ]
  },
  {
    id: '2026-11-01',
    date: '1 Nov 2026',
    label: '1 November 2026',
    rate: 100,
    entries: [
      { name: 'Md Mamun Sheikh', shares: 1 },
      { name: 'Abdus Salam', shares: 1 },
      { name: 'Nazmul Hossain Sujan', shares: 1 },
      { name: 'Abdur Rakib', shares: 1 },
      { name: 'Md Jahangir Hossain', shares: 1 },
      { name: 'Ruhul Amin', shares: 1 },
      { name: 'Mohiuddin Babul', shares: 1 },
      { name: 'Apel Mahmud', shares: 1 },
      { name: 'Mohammad Yousuf', shares: 1 },
      { name: 'Mezanur Rahman', shares: 2 },
      { name: 'Kabirul islam', shares: 1 },
      { name: 'Md Obaydur Rahman', shares: 1 },
      { name: 'G M Nozir Ahmed', shares: 4 },
      { name: 'Hujayfa Salam', shares: 1 },
      { name: 'Md Imam Uddin Babu', shares: 1 },
      { name: 'Fakhruddin', shares: 1 },
      { name: 'Lokman Hossain', shares: 1 },
      { name: 'Abul Bashar', shares: 2 },
      { name: 'Monirul Islam Babu', shares: 1 },
      { name: 'Rafiqur Rahman Maruf', shares: 1 },
      { name: 'Hafijur Rahman Jahangir', shares: 1 },
      { name: 'Saddam Hossain', shares: 1 },
      { name: 'Taj Mohammed', shares: 1 },
      { name: 'Abdul Alim azhari', shares: 5 },
      { name: 'Kazi Moinul Haque', shares: 1 },
      { name: 'Kazi Ashraful Haque', shares: 1 },
      { name: 'Farabi Rahman Eashan', shares: 1 },
      { name: 'Shajahan Mridha', shares: 1 },
      { name: 'Md Abdur Rahim', shares: 1 },
      { name: 'Farzana Akter', shares: 1 },
      { name: 'Ayesha Rahman', shares: 1 },
      { name: 'Md Abu Bakar', shares: 1 },
      { name: 'Nessar uddin', shares: 1 },
      { name: 'Prottasha Parvez', shares: 1 },
      { name: 'Sadia Afroz', shares: 1 },
      { name: 'Sahil Hossain Safwan', shares: 1 },
      { name: 'Ruksana Sultana Any', shares: 1 },
      { name: 'Loveley islam Ranu', shares: 2 }
    ]
  }
]

// Members paid in Bangladesh, at the taka rate used for that run.
export const DIVIDEND_BD = [
  { run: '26 September 2026', rate: 3435, shares: 26, total: 89310 },
  { run: '1 November 2026', rate: 3480, shares: 22, total: 76560 }
]

/* ── Car sale installments ──────────────────────────────────── */

export const INSTALLMENTS = [
  {
    buyer: 'Lokman Hossain',
    qid: '27505003857',
    mobile: '7406 1833',
    date: '13 Sep 2026',
    vehicle: 'Not recorded',
    contract: 10800,
    down: 0,
    installment: 1800,
    paid: [1800, 1800]
  },
  {
    buyer: 'Abzal Hossain',
    qid: '29005037060',
    mobile: '7752 7076',
    date: '10 Dec 2026',
    vehicle: 'Mitsubishi Lancer 2016',
    contract: 18600,
    down: 3100,
    installment: 2585,
    paid: [2585],
    fine: 135
  },
  {
    buyer: 'Abdul Motaleb',
    qid: '29105020666',
    mobile: '3123 0697',
    date: '31 Oct 2026',
    vehicle: 'Nissan Sunny 2019',
    contract: 17270,
    down: 8870,
    installment: 2800,
    paid: []
  },
  {
    buyer: 'Md Bahadul Alam',
    qid: '27205005758',
    mobile: '3315 0932',
    date: '11 Apr 2026',
    vehicle: 'Kia Rio 2014 · 531858',
    contract: 9720,
    down: 2020,
    installment: 1285,
    paid: []
  }
]

/* ── Director profit & loss ─────────────────────────────────── */

export const PROFIT_MONTHS = ['April', 'May', 'June', 'July']

export const DIRECTOR_PROFIT = [
  { name: 'Md Mamun', invested: 3000, profit: [78.9, 81, 139.44, 175.98] },
  { name: 'Abdus Salam', invested: 3000, profit: [78.9, 81, 139.44, 175.98] },
  { name: 'Nazmul Hossain', invested: 3000, profit: [66.75, 68.5, 116.2, 175.98] },
  { name: 'Abdur Rakib', invested: 2500, profit: [66.75, 68.5, 116.2, 146.65] },
  { name: 'Md Jahangir Hossain', invested: 3000, profit: [66.75, 68.5, 116.2, 175.98] },
  { name: 'Nazmul Hasan', invested: 2000, profit: [52.6, 54, 92.96, 117.32] },
  { name: 'Ruhul Amin', invested: 3000, profit: [78.9, 81, 139.44, 175.98] },
  { name: 'Mohiuddin Babul', invested: 3000, profit: [78.9, 81, 139.44, 175.98] },
  { name: 'Apel Mahmud', invested: 3000, profit: [78.9, 81, 139.44, 175.98] },
  { name: 'Mohammad Yousuf', invested: 3000, profit: [78.9, 81, 139.44, 175.98] },
  { name: 'Mezanur Rahman', invested: 6000, profit: [157.8, 162, 278.88, 351.96] },
  { name: 'Kabirul islam', invested: 3000, profit: [78.9, 81, 139.44, 175.98] },
  { name: 'Md Obaydur Rahman', invested: 3000, profit: [78.9, 81, 139.44, 175.98] },
  { name: 'G M Nozir Ahmed', invested: 12000, profit: [78.9, 162, 278.88, 703.92] },
  { name: 'Hujayfa Salam', invested: 3000, profit: [78.9, 81, 139.44, 175.98] },
  { name: 'Md Imam Uddin Babu', invested: 3000, profit: [52.6, 81, 139.44, 175.98] },
  { name: 'Fakhruddin', invested: 3000, profit: [52.6, 81, 139.44, 175.98] },
  { name: 'Md Abdul Wadud', invested: 3000, profit: [78.9, 81, 139.44, 175.98] },
  { name: 'Lokman Hossain', invested: 3000, profit: [78.9, 81, 139.44, 175.98] },
  { name: 'Abul Bashar', invested: 6000, profit: [39.45, 81, 139.44, 351.96] },
  { name: 'Monirul Islam Babu', invested: 3000, profit: [78.9, 81, 139.44, 175.98] },
  { name: 'Rafiqur Rahman Maruf', invested: 3000, profit: [78.9, 81, 139.44, 175.98] },
  { name: 'Hafijur Rahman Jahangir', invested: 3000, profit: [78.9, 81, 139.44, 175.98] },
  { name: 'Saddam Hossain', invested: 3000, profit: [78.9, 81, 139.44, 175.98] },
  { name: 'Taj Mohammed', invested: 3000, profit: [0, 81, 139.44, 175.98] },
  { name: 'Abdul Alim Azhary', invested: 3000, profit: [0, 81, 139.44, 175.98] },
  { name: 'Kazi Moinul Hoque', invested: 3000, profit: [0, 81, 139.44, 175.98] },
  { name: 'Kazi Ashraful Hoque', invested: 3000, profit: [0, 81, 139.44, 175.98] },
  { name: 'Farabi Rahman Eashan', invested: 3000, profit: [0, 81, 139.44, 175.98] },
  { name: 'Shajahn Mridha', invested: 3000, profit: [0, 81, 139.44, 175.98] },
  { name: 'Farzana Akter', invested: 3000, profit: [0, 0, 139.44, 175.98] },
  { name: 'Ayesha Rahman', invested: 3000, profit: [0, 0, 139.44, 175.98] },
  { name: 'Md Abu Bakar', invested: 3000, profit: [0, 0, 139.44, 175.98] },
  { name: 'Sumaiya Chowdhury', invested: 3000, profit: [0, 0, 139.44, 175.98] },
  { name: 'Fuad bin Abdul Alim', invested: 3000, profit: [0, 0, 139.44, 175.98] },
  { name: 'Hamad bin Abdul Alim', invested: 3000, profit: [0, 0, 139.44, 175.98] },
  { name: 'Tasnim binte Abdul Alim', invested: 3000, profit: [0, 0, 139.44, 175.98] },
  { name: 'Nesar uddin', invested: 3000, profit: [0, 0, 139.44, 175.98] },
  { name: 'Md Abdur Rahim', invested: 3000, profit: [0, 0, 0, 175.98] },
  { name: 'Prottasha Parvej', invested: 3000, profit: [0, 0, 0, 175.98] },
  { name: 'Sadia Afroz', invested: 3000, profit: [0, 0, 0, 175.98] },
  { name: 'Ruksana Sultana Any', invested: 3000, profit: [0, 0, 0, 175.98] },
  { name: 'Mrs. Lovely Islam Ranu', invested: 6000, profit: [0, 0, 0, 351.96] },
  { name: 'Sahil Hossain Safwan', invested: 3000, profit: [0, 0, 0, 175.98] }
]

/* ── Fleet ──────────────────────────────────────────────────── */

export const VEHICLES = [
  { owner: 'Md Jahangir Hossain', car: 'Toyota Rush', registration: '25 05 98', model: 2021, ishtemara: '9 Jul 2027', rate: 23700 },
  { owner: 'Apel Mahmud', car: 'Nissan Sunny', registration: '39 12 66', model: 2019, ishtemara: '1 Oct 2027', rate: 15700 },
  { owner: 'Abdur Rakib', car: 'Honda City', registration: '11 05 63', model: 2017, ishtemara: '19 Jul 2027', rate: 15500 },
  { owner: 'Abdur Rakib', car: 'Suzuki Celerio', registration: '46 83 50', model: 2012, ishtemara: '2 Mar 2027', rate: 10000 },
  { owner: 'Abul Bashar', car: 'Kia Picanto', registration: '72 40 70', model: 2017, ishtemara: '25 Apr 2027', rate: 13200 },
  { owner: 'Md Jahangir Hossain', car: 'Changan Alsvin', registration: '28 06 36', model: 2023, ishtemara: '10 Dec 2027', rate: 13200 },
  { owner: 'Md Jahangir Hossain', car: 'Suzuki Celerio', registration: '29 40 17', model: 2014, ishtemara: '2 Feb 2027', rate: 9700 },
  { owner: 'Nazmul Hossain', car: 'Nissan Micra', registration: '51 58 48', model: 2012, ishtemara: '11 Aug 2026', rate: 6521 },
  { owner: 'Abdul Alim Azhari', car: 'Suzuki Swift', registration: '10 12 32', model: 2015, ishtemara: '21 Jul 2027', rate: 7600 },
  { owner: 'Nesar Uddin Ahmed', car: 'Nissan Micra', registration: '49 02 19', model: 2012, ishtemara: '9 Feb 2027', rate: 9100 },
  { owner: 'Nesar Uddin Ahmed', car: 'Nissan Sunny', registration: '23 56 21', model: 2012, ishtemara: '20 Dec 2026', rate: 9600 }
]

/* ── Monthly balance sheets ─────────────────────────────────── */

export const MONTHS = [
  { month: 'April', label: 'April 2026', income: 70818, expenses: 40283, cash: 30535 },
  { month: 'May', label: 'May 2026', income: 57565, expenses: 53454, cash: 4111 },
  { month: 'June', label: 'June 2026', income: 36541, expenses: 28430, cash: 8111 },
  { month: 'July', label: 'July 2026', income: 50791, expenses: 32267, cash: 18524 },
  { month: 'August', label: 'August 2026', income: 31524, expenses: 25095, cash: 6429 },
  { month: 'September', label: 'September 2026', income: 34099, expenses: 30314, cash: 3785 },
  { month: 'October', label: 'October 2026', income: 138160, expenses: 116576, cash: 21584 },
  { month: 'November', label: 'November 2026', income: 70380, expenses: 41586, cash: 28794 }
]

export const YEAR_TO_DATE = {
  memberCollectionsToJuly: 148500,
  carPurchasesToJuly: 154434,
  dividendsPaid: 12200
}

/* ── Per-vehicle performance ────────────────────────────────── */

export const CAR_PERFORMANCE = [
  {
    car: 'Toyota Rush 2021',
    purchase: 23700,
    income: [
      { label: 'March', amount: 476 },
      { label: 'April', amount: 1300 },
      { label: 'June', amount: 1300 },
      { label: 'July', amount: 600 },
      { label: 'September', amount: 2600 },
      { label: 'October', amount: 1300 }
    ],
    expenses: [
      { label: 'Servicing', amount: 306 },
      { label: 'Servicing', amount: 1020 },
      { label: 'Servicing', amount: 211 },
      { label: 'AC servicing', amount: 1206 },
      { label: 'Fahes', amount: 150 },
      { label: 'Fahes', amount: 500 }
    ]
  },
  {
    car: 'Nissan Sunny 2019',
    purchase: 15700,
    income: [
      { label: 'June', amount: 1000 },
      { label: 'July', amount: 1200 },
      { label: 'September', amount: 1000 },
      { label: 'Due', amount: 2200 }
    ],
    expenses: [
      { label: 'Ishtemara', amount: 150 },
      { label: 'Servicing', amount: 540 }
    ]
  },
  {
    car: 'Honda City 2017',
    purchase: 15500,
    income: [
      { label: 'May', amount: 500 },
      { label: 'June', amount: 1000 },
      { label: 'July', amount: 700 },
      { label: 'Due', amount: 2100 }
    ],
    expenses: [
      { label: 'Servicing', amount: 200 },
      { label: 'Gear box + servicing', amount: 3572 }
    ]
  },
  {
    car: 'Suzuki Celerio 2012',
    purchase: 10000,
    income: [
      { label: 'May', amount: 1000 },
      { label: 'June', amount: 1000 },
      { label: 'July', amount: 1000 },
      { label: 'August', amount: 1000 },
      { label: 'September', amount: 1000 },
      { label: 'October', amount: 1000 }
    ],
    expenses: [
      { label: 'Servicing & petrol', amount: 180 },
      { label: 'Battery', amount: 160 },
      { label: 'Repairs', amount: 420 }
    ]
  },
  {
    car: 'Kia Picanto 2017',
    purchase: 13200,
    income: [
      { label: 'May', amount: 1000 },
      { label: 'June', amount: 1000 },
      { label: 'July', amount: 1250 },
      { label: 'September', amount: 900 },
      { label: 'October', amount: 1400 }
    ],
    expenses: [
      { label: 'Servicing', amount: 1954 },
      { label: 'Servicing', amount: 200 }
    ]
  }
]

/* ── Document index (menu + hub) ────────────────────────────── */

export const DOCUMENTS = [
  {
    id: 'board',
    path: '/documents/board',
    title: 'Board of Directors',
    file: 'Board of Directors.xlsx',
    kind: 'Shareholder register',
    summary: 'Each director’s five shares, what has been collected, and what is still due.',
    figures: [
      { label: 'Committed', value: 285000 },
      { label: 'Outstanding', value: 112500 }
    ]
  },
  {
    id: 'dividends',
    path: '/documents/dividends',
    title: 'Dividends',
    file: 'Divident.xlsx',
    kind: 'Distribution register',
    summary: 'Three 2026 payouts at 100 per share, with the Bangladesh settlements that followed each run.',
    figures: [
      { label: 'Distributed', value: 12200 },
      { label: 'Per share', value: 100 }
    ]
  },
  {
    id: 'installments',
    path: '/documents/installments',
    title: 'Car Sale Installments',
    file: 'Car Sale Installment.xlsx',
    kind: 'Sales contracts',
    summary: 'Four cars sold on installment through Al Jaloui Transportation, and what each buyer has paid.',
    figures: [
      { label: 'Contract value', value: 56390 },
      { label: 'Outstanding', value: 36215 }
    ]
  },
  {
    id: 'director-pnl',
    path: '/documents/director-pnl',
    title: 'Director Profit & Loss',
    file: 'Director Profit & Loss Accounts- 2026.xlsx',
    kind: 'Profit allocation',
    summary: 'Profit allocated to every participant from April to July, and each holding after it.',
    figures: [
      { label: 'Invested', value: 148500 },
      { label: 'Profit Apr–Jul', value: 18517.61, decimals: true }
    ]
  },
  {
    id: 'months',
    path: '/documents/months',
    title: 'Monthly Accounts',
    file: 'Monthly Accounts -2026.xlsx',
    kind: 'Balance sheets',
    summary: 'Income and cost month by month, the member list, the fleet, and how each car performed.',
    figures: [
      { label: 'Cash in hand', value: 28794 },
      { label: 'Fleet cost', value: 133821 }
    ]
  }
]
