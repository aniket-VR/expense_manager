// services/exportService.js
// ─────────────────────────────────────────────────────────
// All export logic lives here. No UI concerns.
//
// Exports:
//   buildCSV(transactions, summary)  → string
//   buildPDFHtml(transactions, summary, profile, period) → string
//   shareCSV(csvString, filename)    → Promise<void>
//   sharePDF(htmlString, filename)   → Promise<void>
//
// Dependencies:
//   expo-print    → printToFileAsync  (PDF generation, native only)
//   expo-sharing  → shareAsync        (system share sheet)
//   expo-file-system → writeAsStringAsync (write CSV to disk)
//
// Why no react-native-csv:
//   That package is a thin wrapper around string join with
//   no added value for our schema. We build RFC 4180-compliant
//   CSV directly — full control, zero extra dependency.
// ─────────────────────────────────────────────────────────

import * as Print       from 'expo-print';
import * as Sharing     from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform }     from 'react-native';

import { getCategoryMeta } from '../utils/constants';

// ── Helpers ───────────────────────────────────────────────

/** RFC 4180: wrap any cell that contains comma, quote, or newline */
const csvCell = (value) => {
  const str = value === null || value === undefined ? '' : String(value);
  return str.includes(',') || str.includes('"') || str.includes('\n')
    ? `"${str.replace(/"/g, '""')}"`
    : str;
};

const csvRow = (cells) => cells.map(csvCell).join(',');

/** Convert a Firestore Timestamp or JS Date to ISO-8601 string */
const toISODate = (timestamp) => {
  if (!timestamp) return '';
  const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
};

const toReadableDate = (timestamp) => {
  if (!timestamp) return '';
  const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
};

const rupees = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const pct = (part, total) =>
  total > 0 ? `${((part / total) * 100).toFixed(1)}%` : '0.0%';

// ── CSV ───────────────────────────────────────────────────

/**
 * Build a multi-section CSV string.
 * Section 1 — Summary
 * Section 2 — Category breakdown
 * Section 3 — All transactions
 *
 * @param {object[]} transactions
 * @param {object}   summary  { totalIncome, totalExpense, savings, savingsRate, period }
 * @returns {string} complete CSV content
 */
export const buildCSV = (transactions, summary) => {
  const {
    totalIncome  = 0,
    totalExpense = 0,
    savings      = 0,
    savingsRate  = 0,
    period       = 'month',
  } = summary;

  const expenses = transactions.filter((t) => t.type === 'expense');
  const income   = transactions.filter((t) => t.type === 'income');

  // Category totals for breakdown section
  const catMap = {};
  expenses.forEach((t) => {
    const k = t.category || 'others';
    if (!catMap[k]) catMap[k] = { total: 0, count: 0 };
    catMap[k].total += t.amount;
    catMap[k].count += 1;
  });
  const catRows = Object.entries(catMap)
    .sort((a, b) => b[1].total - a[1].total);

  const lines = [];

  // ── Section 1: Summary ──
  lines.push(csvRow(['FAST EXPENSE TRACKER — EXPORT']));
  lines.push(csvRow([`Generated: ${new Date().toLocaleString('en-IN')}`, `Period: ${period}`]));
  lines.push('');
  lines.push(csvRow(['SUMMARY']));
  lines.push(csvRow(['Metric', 'Amount']));
  lines.push(csvRow(['Total Income',  rupees(totalIncome)]));
  lines.push(csvRow(['Total Expense', rupees(totalExpense)]));
  lines.push(csvRow(['Net Savings',   rupees(savings)]));
  lines.push(csvRow(['Savings Rate',  `${Number(savingsRate).toFixed(1)}%`]));
  lines.push(csvRow(['Income Transactions',  String(income.length)]));
  lines.push(csvRow(['Expense Transactions', String(expenses.length)]));
  lines.push('');

  // ── Section 2: Category breakdown ──
  lines.push(csvRow(['EXPENSE BREAKDOWN BY CATEGORY']));
  lines.push(csvRow(['Category', 'Amount', 'Transactions', '% of Total']));
  catRows.forEach(([cat, data]) => {
    const meta = getCategoryMeta(cat, 'expense');
    lines.push(csvRow([
      meta.name,
      rupees(data.total),
      String(data.count),
      pct(data.total, totalExpense),
    ]));
  });
  lines.push('');

  // ── Section 3: Transaction list ──
  lines.push(csvRow(['ALL TRANSACTIONS']));
  lines.push(csvRow([
    'Date', 'Type', 'Category', 'Account', 'Amount', 'Note',
  ]));

  transactions.forEach((t) => {
    const meta = getCategoryMeta(t.category, t.type);
    lines.push(csvRow([
      toISODate(t.date),
      t.type === 'income' ? 'Income' : 'Expense',
      meta.name,
      t.accountName || t.accountId || '',
      String(t.amount || 0),
      t.note || '',
    ]));
  });

  return lines.join('\n');
};

// ── PDF HTML ──────────────────────────────────────────────

/**
 * Build a fully self-contained HTML string for PDF export.
 * expo-print renders this in a headless WebView and produces a PDF.
 *
 * @param {object[]} transactions
 * @param {object}   summary
 * @param {object}   profile   { name, email }
 * @param {string}   period
 * @returns {string} HTML
 */
export const buildPDFHtml = (transactions, summary, profile = {}, period = 'month') => {
  const {
    totalIncome  = 0,
    totalExpense = 0,
    savings      = 0,
    savingsRate  = 0,
  } = summary;

  const expenses = transactions.filter((t) => t.type === 'expense');
  const income   = transactions.filter((t) => t.type === 'income');

  // Category breakdown
  const catMap = {};
  expenses.forEach((t) => {
    const k = t.category || 'others';
    if (!catMap[k]) catMap[k] = { total: 0, count: 0 };
    catMap[k].total += t.amount;
    catMap[k].count += 1;
  });
  const catRows = Object.entries(catMap)
    .sort((a, b) => b[1].total - a[1].total);

  const savingsPctNum = Math.min(Math.max(Number(savingsRate), 0), 100);
  const isPositive    = savings >= 0;
  const periodLabel   = { today: 'Today', week: 'This Week', month: 'This Month', year: 'This Year', all: 'All Time' }[period] || period;
  const generatedAt   = new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' });

  // ── Transaction rows (max 200 to keep PDF size reasonable) ──
  const txnRowsHtml = transactions.slice(0, 200).map((t) => {
    const meta    = getCategoryMeta(t.category, t.type);
    const isInc   = t.type === 'income';
    const amtStyle = isInc ? 'color:#1a7f37;font-weight:700' : 'color:#cf222e;font-weight:700';
    const sign    = isInc ? '+' : '−';
    return `
      <tr>
        <td>${toReadableDate(t.date)}</td>
        <td><span class="badge ${isInc ? 'badge-income' : 'badge-expense'}">${isInc ? 'Income' : 'Expense'}</span></td>
        <td>${meta.emoji} ${meta.name}</td>
        <td>${t.accountName || '—'}</td>
        <td style="${amtStyle}">${sign}${rupees(t.amount)}</td>
        <td class="note">${t.note || '—'}</td>
      </tr>`;
  }).join('');

  const catRowsHtml = catRows.map(([cat, data]) => {
    const meta    = getCategoryMeta(cat, 'expense');
    const barPct  = totalExpense > 0 ? (data.total / totalExpense) * 100 : 0;
    return `
      <tr>
        <td>${meta.emoji} ${meta.name}</td>
        <td style="color:#cf222e;font-weight:700">${rupees(data.total)}</td>
        <td>${data.count}</td>
        <td>
          <div class="bar-wrap">
            <div class="bar-fill" style="width:${barPct.toFixed(1)}%"></div>
          </div>
          <span class="bar-pct">${barPct.toFixed(1)}%</span>
        </td>
      </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Expense Report — ${periodLabel}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
         font-size: 12px; color: #1c2128; background: #fff; padding: 32px; }

  /* Header */
  .header { display: flex; justify-content: space-between; align-items: flex-start;
            border-bottom: 2px solid #00c6a2; padding-bottom: 16px; margin-bottom: 24px; }
  .header-left h1 { font-size: 22px; font-weight: 900; color: #0d1117; }
  .header-left p  { color: #57606a; margin-top: 2px; font-size: 11px; }
  .header-right   { text-align: right; }
  .header-right .period { background: #00c6a2; color: #fff; padding: 4px 12px;
                           border-radius: 99px; font-weight: 700; font-size: 11px; }
  .header-right .gen    { color: #8c959f; font-size: 10px; margin-top: 6px; }

  /* Summary grid */
  .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;
                  margin-bottom: 24px; }
  .summary-card { border: 1px solid #d8dee4; border-radius: 10px; padding: 14px;
                  border-left: 4px solid #d8dee4; }
  .summary-card.income  { border-left-color: #1a7f37; }
  .summary-card.expense { border-left-color: #cf222e; }
  .summary-card.savings { border-left-color: ${isPositive ? '#1a7f37' : '#cf222e'}; }
  .summary-card.rate    { border-left-color: #9a6700; }
  .card-label { font-size: 9px; font-weight: 700; text-transform: uppercase;
                letter-spacing: 0.8px; color: #8c959f; margin-bottom: 4px; }
  .card-value { font-size: 18px; font-weight: 900; }
  .card-value.income  { color: #1a7f37; }
  .card-value.expense { color: #cf222e; }
  .card-value.savings { color: ${isPositive ? '#1a7f37' : '#cf222e'}; }
  .card-value.rate    { color: #9a6700; }
  .card-sub { font-size: 10px; color: #8c959f; margin-top: 2px; }

  /* Savings bar */
  .savings-bar-wrap { margin: 0 0 24px; padding: 14px 16px;
                      border: 1px solid #d8dee4; border-radius: 10px; }
  .savings-bar-label { display: flex; justify-content: space-between;
                       margin-bottom: 6px; font-size: 11px; color: #57606a; }
  .savings-bar-track { height: 10px; background: #f0f2f5; border-radius: 5px; overflow: hidden; }
  .savings-bar-fill  { height: 100%; border-radius: 5px;
                       background: ${savingsPctNum >= 20 ? '#1a7f37' : savingsPctNum >= 10 ? '#9a6700' : '#cf222e'}; 
                       width: ${savingsPctNum}%; }

  /* Section titles */
  h2 { font-size: 13px; font-weight: 800; color: #0d1117; margin: 0 0 10px;
       padding-bottom: 6px; border-bottom: 1px solid #d8dee4; }

  /* Tables */
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 11px; }
  th    { background: #f6f8fa; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.5px; font-size: 9px; color: #57606a;
          padding: 8px 10px; text-align: left; border-bottom: 1px solid #d8dee4; }
  td    { padding: 8px 10px; border-bottom: 1px solid #f0f2f5; vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: #f6f8fa; }

  /* Category bar */
  .bar-wrap { display: inline-block; width: 80px; height: 6px;
              background: #f0f2f5; border-radius: 3px; vertical-align: middle;
              margin-right: 6px; }
  .bar-fill { height: 100%; background: #cf222e; border-radius: 3px; }
  .bar-pct  { font-size: 10px; color: #57606a; }

  /* Badges */
  .badge { display: inline-block; padding: 2px 7px; border-radius: 99px;
           font-size: 9px; font-weight: 700; text-transform: uppercase; }
  .badge-income  { background: #dafbe1; color: #1a7f37; }
  .badge-expense { background: #ffebe9; color: #cf222e; }

  /* Note cell */
  .note { color: #8c959f; font-style: italic; max-width: 120px;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  /* Footer */
  .footer { border-top: 1px solid #d8dee4; padding-top: 12px;
            color: #8c959f; font-size: 10px; text-align: center; margin-top: 8px; }

  /* Overflow note */
  .overflow-note { color: #9a6700; font-size: 10px; text-align: center;
                   padding: 8px; background: #fff8c5; border-radius: 6px; margin-top: -16px; margin-bottom: 16px; }
</style>
</head>
<body>

<!-- ── HEADER ── -->
<div class="header">
  <div class="header-left">
    <h1>₹ Fast Expense Tracker</h1>
    <p>Financial Report · ${profile.name || 'User'} · ${profile.email || ''}</p>
  </div>
  <div class="header-right">
    <div class="period">${periodLabel}</div>
    <div class="gen">Generated ${generatedAt}</div>
  </div>
</div>

<!-- ── SUMMARY CARDS ── -->
<div class="summary-grid">
  <div class="summary-card income">
    <div class="card-label">Total Income</div>
    <div class="card-value income">+${rupees(totalIncome)}</div>
    <div class="card-sub">${income.length} transactions</div>
  </div>
  <div class="summary-card expense">
    <div class="card-label">Total Expense</div>
    <div class="card-value expense">−${rupees(totalExpense)}</div>
    <div class="card-sub">${expenses.length} transactions</div>
  </div>
  <div class="summary-card savings">
    <div class="card-label">Net Savings</div>
    <div class="card-value savings">${isPositive ? '+' : '−'}${rupees(Math.abs(savings))}</div>
    <div class="card-sub">${isPositive ? 'Positive balance' : 'Overspent'}</div>
  </div>
  <div class="summary-card rate">
    <div class="card-label">Savings Rate</div>
    <div class="card-value rate">${Number(savingsRate).toFixed(1)}%</div>
    <div class="card-sub">${savingsPctNum >= 20 ? '🎉 Excellent' : savingsPctNum >= 10 ? '👍 Good' : '⚠️ Review'}</div>
  </div>
</div>

<!-- ── SAVINGS BAR ── -->
<div class="savings-bar-wrap">
  <div class="savings-bar-label">
    <span>Savings Rate Progress</span>
    <span>${Number(savingsRate).toFixed(1)}% / Target 20%</span>
  </div>
  <div class="savings-bar-track">
    <div class="savings-bar-fill"></div>
  </div>
</div>

<!-- ── CATEGORY BREAKDOWN ── -->
${catRows.length > 0 ? `
<h2>Expense Breakdown by Category</h2>
<table>
  <thead><tr>
    <th>Category</th>
    <th>Amount</th>
    <th>Transactions</th>
    <th>Share</th>
  </tr></thead>
  <tbody>${catRowsHtml}</tbody>
</table>` : ''}

<!-- ── TRANSACTION LIST ── -->
<h2>Transaction History</h2>
${transactions.length > 200 ? `<div class="overflow-note">Showing first 200 of ${transactions.length} transactions. Use CSV export for the full list.</div>` : ''}
<table>
  <thead><tr>
    <th>Date &amp; Time</th>
    <th>Type</th>
    <th>Category</th>
    <th>Account</th>
    <th>Amount</th>
    <th>Note</th>
  </tr></thead>
  <tbody>${txnRowsHtml}</tbody>
</table>

<!-- ── FOOTER ── -->
<div class="footer">
  Fast Expense Tracker · India 🇮🇳 · Export generated ${generatedAt}
</div>

</body>
</html>`;
};

// ── Share helpers ─────────────────────────────────────────

/**
 * Write CSV string to a temp file and open the system share sheet.
 */
export const shareCSV = async (csvString, filename) => {
  const path = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(path, csvString, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error('Sharing is not available on this device');

  await Sharing.shareAsync(path, {
    mimeType: 'text/csv',
    dialogTitle: 'Export CSV',
    UTI: 'public.comma-separated-values-text',
  });
};

/**
 * Render HTML to PDF via expo-print, then open the share sheet.
 * expo-print uses a headless WebView; it works on Android & iOS.
 * On web it falls back to the browser print dialog.
 */
export const sharePDF = async (htmlString, filename) => {
  if (Platform.OS === 'web') {
    // Web: open in a new tab and trigger print dialog
    const w = window.open('', '_blank');
    w.document.write(htmlString);
    w.document.close();
    w.print();
    return;
  }

  const { uri } = await Print.printToFileAsync({
    html:   htmlString,
    base64: false,
  });

  // Move from expo-print's temp location to a named cache file
  const dest = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.moveAsync({ from: uri, to: dest });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error('Sharing is not available on this device');

  await Sharing.shareAsync(dest, {
    mimeType: 'application/pdf',
    dialogTitle: 'Export PDF',
    UTI: 'com.adobe.pdf',
  });
};
