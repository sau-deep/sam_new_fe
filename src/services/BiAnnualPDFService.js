import jsPDF from 'jspdf';

// ── Design tokens ──────────────────────────────────────────────────────────────
const C = {
  blue:        [25, 118, 210],
  blueLight:   [227, 242, 253],
  darkText:    [30,  40,  60],
  grayText:    [100, 105, 120],
  redStar:     [211, 47,  47],
  border:      [189, 189, 189],
  divider:     [218, 225, 235],
  white:       [255, 255, 255],
  inputBg:     [255, 255, 255],
  autoBg:      [245, 245, 248],
  noteBg:      [255, 248, 225],
  noteBorder:  [255, 167, 38],
  noteText:    [130, 80,  0],
  optionText:  [40,  40,  55],
  sectionBg:   [248, 250, 253],
};

const PAGE_W = 210;
const PAGE_H = 297;
const ML = 14;
const MR = 14;
const MT = 13;
const MB = 13;
const CW = PAGE_W - ML - MR;          // 182 mm

// ── Renderer ───────────────────────────────────────────────────────────────────
class R {
  constructor() {
    this.doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    this.y = MT;
  }

  // ---------- page management ----------

  breakCheck(h) {
    if (this.y + h > PAGE_H - MB - 6) {
      this.doc.addPage();
      this.y = MT;
      this._runHeader();
    }
  }

  _runHeader() {
    this.doc.setFillColor(...C.blue);
    this.doc.rect(0, 0, PAGE_W, 7, 'F');
    this.doc.setTextColor(...C.white);
    this.doc.setFontSize(6.5);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('Concurrent Assessment — Bi-Annual Questionnaire', ML, 5);
    this.y = 13;
  }

  // ---------- section header ----------

  section(num, title, subtitle) {
    this.breakCheck(32);

    const iconR = 8;
    const iconCx = ML + iconR;
    const iconCy = this.y + iconR;

    // Icon circle
    this.doc.setFillColor(...C.blue);
    this.doc.circle(iconCx, iconCy, iconR, 'F');

    // Icon text
    this.doc.setTextColor(...C.white);
    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(String(num), iconCx, iconCy + 3, { align: 'center' });

    // Title
    this.doc.setTextColor(...C.blue);
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, ML + iconR * 2 + 3, this.y + iconR - 2);

    // Subtitle
    if (subtitle) {
      this.doc.setTextColor(...C.grayText);
      this.doc.setFontSize(8.5);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(subtitle, ML + iconR * 2 + 3, this.y + iconR + 5);
    }

    this.y += iconR * 2 + 5;

    // Divider
    this.doc.setDrawColor(...C.divider);
    this.doc.setLineWidth(0.5);
    this.doc.line(ML, this.y, PAGE_W - MR, this.y);
    this.y += 7;
  }

  // ---------- section-level note ----------

  sectionNote(text) {
    if (!text) return;
    this.breakCheck(11);
    const lines = this.doc.splitTextToSize(text, CW - 8);
    const h = lines.length * 4.8 + 5;
    this.doc.setFillColor(...C.noteBg);
    this.doc.setDrawColor(...C.noteBorder);
    this.doc.setLineWidth(0.35);
    this.doc.roundedRect(ML, this.y, CW, h, 1.5, 1.5, 'FD');
    this.doc.setTextColor(...C.noteText);
    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'italic');
    this.doc.text(lines, ML + 4, this.y + 4.8);
    this.y += h + 5;
  }

  // ---------- question label ----------

  lbl(text, required, helper, condNote) {
    const labelLines = this.doc.splitTextToSize(text, CW);
    const lineH = 5.2;
    this.breakCheck(labelLines.length * lineH + (helper ? 5 : 0) + (condNote ? 10 : 0) + 4);

    this.doc.setTextColor(...C.darkText);
    this.doc.setFontSize(9.5);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(labelLines, ML, this.y);

    if (required) {
      const firstW = this.doc.getTextWidth(labelLines[0]);
      this.doc.setTextColor(...C.redStar);
      this.doc.setFontSize(10.5);
      this.doc.text(' *', ML + firstW, this.y);
    }

    this.y += labelLines.length * lineH;

    if (helper) {
      this.doc.setTextColor(...C.grayText);
      this.doc.setFontSize(8);
      this.doc.setFont('helvetica', 'italic');
      const hLines = this.doc.splitTextToSize(helper, CW);
      this.doc.text(hLines, ML, this.y);
      this.y += hLines.length * 4.5;
    }

    if (condNote) {
      const nLines = this.doc.splitTextToSize(`Shown when: ${condNote}`, CW - 6);
      const nh = nLines.length * 4.2 + 4;
      this.doc.setFillColor(...C.noteBg);
      this.doc.setDrawColor(...C.noteBorder);
      this.doc.setLineWidth(0.3);
      this.doc.roundedRect(ML, this.y + 1, CW, nh, 1.5, 1.5, 'FD');
      this.doc.setTextColor(...C.noteText);
      this.doc.setFontSize(7.5);
      this.doc.setFont('helvetica', 'italic');
      this.doc.text(nLines, ML + 3, this.y + 4.5);
      this.y += nh + 3;
    }

    this.y += 2;
  }

  // ---------- text / number input ----------

  textBox(placeholder, w) {
    w = w || CW;
    this.breakCheck(13);
    const h = 9;
    this.doc.setFillColor(...C.inputBg);
    this.doc.setDrawColor(...C.border);
    this.doc.setLineWidth(0.4);
    this.doc.roundedRect(ML, this.y, w, h, 2, 2, 'FD');
    if (placeholder) {
      this.doc.setTextColor(195, 195, 195);
      this.doc.setFontSize(8.5);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(placeholder, ML + 3, this.y + 6.2);
    }
    this.y += h + 6;
  }

  // ---------- dropdown ----------

  dropdown(placeholder, w) {
    w = w || CW;
    this.breakCheck(13);
    const h = 9;
    this.doc.setFillColor(...C.inputBg);
    this.doc.setDrawColor(...C.border);
    this.doc.setLineWidth(0.4);
    this.doc.roundedRect(ML, this.y, w, h, 2, 2, 'FD');
    // arrow symbol
    this.doc.setTextColor(...C.grayText);
    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('▾', ML + w - 5, this.y + 6.2);
    if (placeholder) {
      this.doc.setTextColor(195, 195, 195);
      this.doc.setFontSize(8.5);
      this.doc.text(placeholder, ML + 3, this.y + 6.2);
    }
    this.y += h + 6;
  }

  // ---------- date ----------

  date() {
    this.breakCheck(13);
    const h = 9;
    const w = 58;
    this.doc.setFillColor(...C.inputBg);
    this.doc.setDrawColor(...C.border);
    this.doc.setLineWidth(0.4);
    this.doc.roundedRect(ML, this.y, w, h, 2, 2, 'FD');
    this.doc.setTextColor(195, 195, 195);
    this.doc.setFontSize(8.5);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('DD/MM/YYYY', ML + 3, this.y + 6.2);
    // mini calendar icon
    this.doc.setDrawColor(...C.border);
    this.doc.setLineWidth(0.3);
    this.doc.rect(ML + w - 8, this.y + 1.5, 5.5, 6, 'S');
    this.y += h + 6;
  }

  // ---------- auto-populated field ----------

  autoField(note) {
    this.breakCheck(11);
    const h = 8.5;
    this.doc.setFillColor(...C.autoBg);
    this.doc.setDrawColor(210, 210, 215);
    this.doc.setLineWidth(0.3);
    this.doc.roundedRect(ML, this.y, CW, h, 2, 2, 'FD');
    this.doc.setTextColor(160, 160, 170);
    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'italic');
    this.doc.text(note || 'Auto-populated', ML + 3, this.y + 5.8);
    this.y += h + 6;
  }

  // ---------- radio options ----------

  radio(options) {
    if (!options || !options.length) return;
    const ml = Math.max(...options.map(o => o.length));
    const numCols = ml <= 10 ? 4 : ml <= 20 ? 3 : ml <= 36 ? 2 : 1;
    const colW = CW / numCols;
    const rowH = 7;
    const totalRows = Math.ceil(options.length / numCols);
    this.breakCheck(totalRows * rowH + 4);

    let col = 0, row = 0;
    options.forEach(opt => {
      const x = ML + col * colW;
      const y = this.y + row * rowH;
      // circle
      this.doc.setDrawColor(110, 110, 130);
      this.doc.setLineWidth(0.4);
      this.doc.circle(x + 2.5, y - 1.5, 2.2, 'S');
      // text
      this.doc.setTextColor(...C.optionText);
      this.doc.setFontSize(9);
      this.doc.setFont('helvetica', 'normal');
      const txt = this.doc.splitTextToSize(opt, colW - 9);
      this.doc.text(txt[0], x + 7, y);
      col++;
      if (col >= numCols) { col = 0; row++; }
    });
    this.y += totalRows * rowH + 4;
  }

  // ---------- checkbox options ----------

  checkbox(options) {
    if (!options || !options.length) return;
    const ml = Math.max(...options.map(o => o.length));
    const numCols = ml <= 30 ? 2 : 1;
    const colW = CW / numCols;
    const rowH = 7;
    const totalRows = Math.ceil(options.length / numCols);
    this.breakCheck(totalRows * rowH + 4);

    let col = 0, row = 0;
    options.forEach(opt => {
      const x = ML + col * colW;
      const y = this.y + row * rowH;
      // square
      this.doc.setDrawColor(110, 110, 130);
      this.doc.setLineWidth(0.4);
      this.doc.rect(x + 0.5, y - 3.5, 4, 4, 'S');
      // text
      this.doc.setTextColor(...C.optionText);
      this.doc.setFontSize(9);
      this.doc.setFont('helvetica', 'normal');
      const txt = this.doc.splitTextToSize(opt, colW - 9);
      this.doc.text(txt[0], x + 7, y);
      col++;
      if (col >= numCols) { col = 0; row++; }
    });
    this.y += totalRows * rowH + 4;
  }

  // ---------- CF2 food frequency table ----------

  cf2Header() {
    this.breakCheck(12);
    const freqCols = ['0', '1', '2', '3', '>3'];
    const fcW = 22;
    const labelW = CW - freqCols.length * (fcW + 1);

    // header row background
    this.doc.setFillColor(...C.blue);
    this.doc.rect(ML, this.y, CW, 8, 'F');

    this.doc.setTextColor(...C.white);
    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Food Item', ML + 3, this.y + 5.5);
    this.doc.text('Times eaten yesterday', ML + labelW + freqCols.length * (fcW + 1) / 2, this.y + 5.5, { align: 'center' });

    this.y += 8;

    // sub-header
    this.doc.setFillColor(...C.blueLight);
    this.doc.rect(ML, this.y, CW, 6.5, 'F');
    this.doc.setTextColor(...C.blue);
    this.doc.setFontSize(7.5);
    this.doc.setFont('helvetica', 'bold');
    freqCols.forEach((fc, i) => {
      const cx = ML + labelW + i * (fcW + 1) + fcW / 2;
      this.doc.text(fc, cx, this.y + 4.5, { align: 'center' });
    });
    this.y += 6.5;
  }

  cf2Row(label, shade) {
    this.breakCheck(8);
    const freqCols = ['0', '1', '2', '3', '>3'];
    const fcW = 22;
    const labelW = CW - freqCols.length * (fcW + 1);
    const rowH = 7.5;

    if (shade) {
      this.doc.setFillColor(248, 250, 253);
      this.doc.rect(ML, this.y, CW, rowH, 'F');
    }

    // bottom border
    this.doc.setDrawColor(...C.divider);
    this.doc.setLineWidth(0.2);
    this.doc.line(ML, this.y + rowH, ML + CW, this.y + rowH);

    // label
    this.doc.setTextColor(...C.optionText);
    this.doc.setFontSize(8.5);
    this.doc.setFont('helvetica', 'normal');
    const lLines = this.doc.splitTextToSize(label, labelW - 4);
    this.doc.text(lLines[0], ML + 3, this.y + 5);

    // option circles
    freqCols.forEach((_, i) => {
      const cx = ML + labelW + i * (fcW + 1) + fcW / 2;
      const cy = this.y + rowH / 2;
      this.doc.setDrawColor(130, 130, 150);
      this.doc.setLineWidth(0.35);
      this.doc.circle(cx, cy, 2.8, 'S');
    });

    this.y += rowH;
  }

  // ---------- field spacer ----------

  gap(h) { this.y += h || 6; }

  // ---------- page numbers ----------

  addPageNumbers() {
    const n = this.doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
      this.doc.setPage(i);
      this.doc.setFontSize(7.5);
      this.doc.setTextColor(...C.grayText);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(`${i} / ${n}`, PAGE_W - MR, PAGE_H - 6, { align: 'right' });
    }
  }
}

// ── Cover page ─────────────────────────────────────────────────────────────────
function coverPage(r) {
  const doc = r.doc;

  // Header band
  doc.setFillColor(...C.blue);
  doc.rect(0, 0, PAGE_W, 55, 'F');

  doc.setTextColor(...C.white);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Concurrent Assessment', PAGE_W / 2, 28, { align: 'center' });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('Bi-Annual Questionnaire', PAGE_W / 2, 41, { align: 'center' });

  doc.setTextColor(...C.darkText);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  let cy = 72;
  [
    'This document is a printable representation of the Bi-Annual Concurrent',
    'Assessment survey form. It lists every question in the order it appears',
    'on screen, along with all answer options.',
    '',
    'Fields marked  *  are required.',
    'Amber boxes indicate conditional questions (shown only when a specific',
    'answer to a previous question is selected).',
  ].forEach(line => {
    doc.text(line, PAGE_W / 2, cy, { align: 'center' });
    cy += line === '' ? 4 : 7;
  });

  r.y = cy + 12;

  // Section list
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.blue);
  doc.text('Sections', ML, r.y);
  r.y += 7;

  const sectionNames = [
    'General Information',
    'Caregiver & Child Information',
    'Breastfeeding (BF1–BF10)',
    'Complementary Feeding (CF1–CF2)',
    'THR – Take-Home Ration (THR1–THR5)',
    'Growth Monitoring & Treatment (GMT1–GMT8)',
    'Micronutrient Supplementation (MN1–MN4)',
    'Home Visits by AWW & ASHA (HV1–HV6)',
    'Anthropometry (ANTH1–ANTH5)',
  ];

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.darkText);
  sectionNames.forEach((name, i) => {
    doc.text(`${i + 1}.  ${name}`, ML + 4, r.y);
    r.y += 7;
  });
}

// ── Question renderer ──────────────────────────────────────────────────────────
function q(r, id, labelText, required, helperText, condNote, renderFn) {
  r.lbl(labelText, required, helperText, condNote);
  renderFn(r);
  r.gap(3);
}

// ── Main export ────────────────────────────────────────────────────────────────
export const generateQuestionnairePDF = () => {
  const r = new R();

  // ── Cover ──────────────────────────────────────────────────────────────────
  coverPage(r);

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 1 — General Information
  // ══════════════════════════════════════════════════════════════════════════
  r.doc.addPage();
  r.y = MT;
  r.section(1, 'General Information', 'Basic location and demographic information');

  q(r, 'GI-1', 'Date of Visit', true, null, null, R => R.date());
  q(r, 'GI-2', 'State', true, null, null, R => R.dropdown());
  q(r, 'GI-3', 'District', true, null, null, R => R.dropdown());
  q(r, 'GI-4', 'Block Name', true, null, null, R => R.dropdown());
  q(r, 'GI-5', 'Village Name', true, null, null, R => R.dropdown());
  q(r, 'GI-6', 'Village Code', false, null, null, R => R.autoField('Auto-populated from village selection'));
  q(r, 'GI-7', 'Cluster Code', true, 'Please enter Cluster Code as received from SCoE.', null, R => R.textBox('Enter 2-digit cluster code'));
  q(r, 'GI-8', 'Structure Code', true, null, null, R => R.dropdown());
  q(r, 'GI-9', 'Household Number', true, 'Enter a number between 1 and 300.', null, R => R.textBox('Enter 3-digit household number'));
  q(r, 'GI-10', 'Child ID', false, null, null, R => R.autoField('Auto-calculated 16-character composite ID'));
  q(r, 'GI-11', 'Primary Caregiver', true, null, null, R => R.radio(['Mother', 'Father', 'N/A', 'Other (specify)']));
  q(r, 'GI-11a', 'If Other – specify caregiver', false, null, 'GI-11 = Other', R => R.textBox('Enter caregiver type'));
  q(r, 'GI-12', 'Is the Caregiver Available for Interview?', true, null, null, R => R.radio(['Yes', 'No']));

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 2 — Caregiver & Child Information
  // ══════════════════════════════════════════════════════════════════════════
  r.doc.addPage();
  r.y = MT;
  r.section(2, 'Caregiver & Child Information', 'Details of the primary caregiver and the child');
  r.sectionNote('This section is collected only when the caregiver is available for interview (GI-12 = Yes).');

  q(r, 'CI-1', 'Name of Primary Caregiver', true, 'Uppercase letters only.', null, R => R.textBox('CAREGIVER NAME'));
  q(r, 'CI-2', 'Sex of Caregiver', true, null, null, R => R.radio(['Male', 'Female', 'N/A', 'Other (specify)']));
  q(r, 'CI-2a', 'If Other – specify sex', false, null, 'CI-2 = Other', R => R.textBox('Enter'));
  q(r, 'CI-3', 'Age of Caregiver (years)', true, null, null, R => R.textBox('Enter age'));
  q(r, 'CI-4', 'Highest Level of Education of Caregiver', true, null, null,
    R => R.radio(['No formal education', 'Primary (Class 1–5)', 'Upper Primary (Class 6–8)', 'Secondary (Class 9–12)', 'Higher Education', 'N/A']));

  r.gap(4);
  q(r, 'CI-5', 'Name of Child', true, 'Uppercase letters only.', null, R => R.textBox('CHILD NAME'));
  q(r, 'CI-6', 'Sex of Child', true, null, null, R => R.radio(['Male', 'Female', 'Other (specify)']));
  q(r, 'CI-6a', 'If Other – specify sex', false, null, 'CI-6 = Other', R => R.textBox('Enter'));
  q(r, 'CI-7', "Child's Date of Birth", true, "Child's age in months is calculated automatically.", null, R => R.date());

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 3 — Breastfeeding
  // ══════════════════════════════════════════════════════════════════════════
  r.doc.addPage();
  r.y = MT;
  r.section(3, 'Breastfeeding (BF1–BF10)', 'Breastfeeding history and practices');
  r.sectionNote('Applicable for children under 24 months of age.');

  q(r, 'BF1', 'Have you ever breastfed the child?', true, null, null, R => R.radio(['Yes', 'No']));
  q(r, 'BF2', 'When did you first put the child to the breast?', true, null, 'BF1 = Yes',
    R => R.radio(['On the day of birth', 'On second day after birth or later']));
  q(r, 'BF2a', 'Number of days after birth', true, 'Range: 0–99.', 'BF2 = "On second day or later"', R => R.textBox('Enter days'));
  q(r, 'BF2b', 'Number of hours', true, 'Range: 0–24.', null, R => R.textBox('Enter hours'));
  q(r, 'BF2c', 'Number of minutes', true, 'Range: 0–59.', null, R => R.textBox('Enter minutes'));
  q(r, 'BF3', 'Was the child fed colostrum (first milk)?', true, null, 'BF1 = Yes', R => R.radio(['Yes', 'No']));
  q(r, 'BF4', 'Was the child given anything other than breast milk in the first 3 days after birth?', true, null, 'BF1 = Yes',
    R => R.radio(['Yes', 'No']));
  q(r, 'BF5', 'What was the child given?', true, 'Select all that apply.', 'BF4 = Yes',
    R => R.checkbox(['Animal Milk', 'Plain water', 'Sugar/glucose water', 'Jaggery', 'Honey', 'Fruit Juice', 'Infant formula milk', 'Tea', 'Gripe water', 'Janam ghutti', 'Other (specify)']));
  q(r, 'BF6', 'Was the child given anything other than breast milk yesterday?', true, 'For children under 6 months only.', 'Child age < 6 months',
    R => R.radio(['Yes', 'No']));
  q(r, 'BF7', 'What were the reasons for giving something other than breast milk?', true, 'Select all that apply.', 'BF6 = Yes',
    R => R.checkbox(['Mother sick/weak', 'Child sick/weak', 'Problems with breast', 'Not enough milk', 'Child refused', 'Reached complementary age', 'Work priority', 'Mother pregnant', 'Advised by someone', 'Cultural practice', 'Other (specify)']));
  q(r, 'BF8', 'Is the child still being breastfed?', true, 'For children 6 months and older.', 'Child age ≥ 6 months',
    R => R.radio(['Yes', 'No']));
  q(r, 'BF9', 'For how many months was the child breastfed?', true, 'Range: 0–99 months.', 'BF8 = No', R => R.textBox('Enter months'));
  q(r, 'BF10', 'What were the reasons for stopping breastfeeding?', true, 'Select all that apply.', 'BF8 = No',
    R => R.checkbox(['Mother sick/weak', 'Child sick/weak', 'Problems with breast', 'Not enough milk', 'Child refused', 'Reached complementary age', 'Work priority', 'Mother pregnant', 'Advised by someone', 'Cultural practice', 'Other (specify)']));

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 4 — Complementary Feeding
  // ══════════════════════════════════════════════════════════════════════════
  r.doc.addPage();
  r.y = MT;
  r.section(4, 'Complementary Feeding (CF1–CF2)', 'Introduction of foods alongside breastmilk');
  r.sectionNote('Applicable for children under 24 months of age.');

  q(r, 'CF1', 'Have you started giving the child liquids, semi-solid, or solid foods?', true, null, null,
    R => R.radio(['Yes', 'No']));
  q(r, 'CF1.1', 'At what age (months) did you start giving liquids/fluids?', true, 'Enter 99 if unknown.', 'CF1 = Yes', R => R.textBox('Enter months'));
  q(r, 'CF1.2', 'At what age (months) did you start giving semi-solid foods?', true, 'Enter 99 if unknown.', 'CF1 = Yes', R => R.textBox('Enter months'));
  q(r, 'CF1.3', 'At what age (months) did you start giving solid foods?', true, 'Enter 99 if unknown.', 'CF1 = Yes', R => R.textBox('Enter months'));

  r.gap(2);
  r.lbl('CF2: How many times did the child eat each of the following foods YESTERDAY?', true,
    'Record the number of times for each food item (0 = not eaten).', null);
  r.gap(2);

  r.cf2Header();
  const cf2Foods = [
    'Breastmilk',
    'Porridge or gruel',
    'Fortified baby food',
    'Bread, rice, noodles or other grains',
    'Pumpkin, carrots or sweet potatoes (yellow/orange)',
    'White potatoes, yams, cassava or other roots',
    'Dark green leafy vegetables',
    'Mangoes, papayas or melons (yellow/orange flesh)',
    'Other fruits or vegetables',
    'Dry fruits',
    'Liver, kidney, heart or other organ meats',
    'Chicken or meat',
    'Eggs',
    'Fish, shellfish or seafood',
    'Beans, peas, lentils or nuts',
    'Nuts and seeds',
    'Milk, yogurt, cheese or other milk products',
    'Oils, fats or butter',
    'Sugary foods (candy, chocolates, cakes, biscuits)',
    'Sweetened beverages (fruit juice, fizzy or energy drinks)',
  ];
  cf2Foods.forEach((food, i) => r.cf2Row(food, i % 2 === 0));
  r.gap(6);

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 5 — THR
  // ══════════════════════════════════════════════════════════════════════════
  r.doc.addPage();
  r.y = MT;
  r.section(5, 'THR – Take-Home Ration (THR1–THR5)', 'Supplementary nutrition provided to children');

  q(r, 'THR1', 'Did the child receive Take-Home Ration (THR / Supplementary Nutrition) in the past month?', true, null, null,
    R => R.radio(['Yes', 'No', 'Child under 6 months', 'Child above 3 years']));
  q(r, 'THR2', 'How many days did the child receive THR in the past month?', true, 'Range: 0–30 days.', 'THR1 = Yes', R => R.textBox('Enter days'));
  q(r, 'THR3', 'How many days did the child consume THR in the past month?', true, 'Range: 0–30. Must not exceed THR2.', 'THR1 = Yes', R => R.textBox('Enter days'));
  q(r, 'THR4', 'Does the child like THR?', true, null, 'THR1 = Yes', R => R.radio(['Yes', 'No']));
  q(r, 'THR5', "Does anyone else in the household share the child's THR?", true, null, 'THR1 = Yes', R => R.radio(['Yes', 'No']));

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 6 — GMT
  // ══════════════════════════════════════════════════════════════════════════
  r.doc.addPage();
  r.y = MT;
  r.section(6, 'Growth Monitoring & Treatment (GMT1–GMT8)', 'Growth measurements and undernutrition assessment');

  q(r, 'GMT1', "Was the child's weight measured last month?", true, null, null, R => R.radio(['Yes', 'No']));
  q(r, 'GMT1.1', "What was the reason the child's weight was not measured?", true, null, 'GMT1 = No',
    R => R.radio(['Not present', 'Sick', 'Not willing', 'Other (specify)']));
  q(r, 'GMT2', "Was the child's height measured last month?", true, null, null, R => R.radio(['Yes', 'No']));
  q(r, 'GMT2.1', "What was the reason the child's height was not measured?", true, null, 'GMT2 = No',
    R => R.radio(['Not present', 'Sick', 'Not willing', 'Other (specify)']));
  q(r, 'GMT3', 'Was the child identified as undernourished?', true, null, 'GMT1 = Yes or GMT2 = Yes', R => R.radio(['Yes', 'No']));
  q(r, 'GMT4', 'What type of undernutrition was identified?', true, null, 'GMT3 = Yes',
    R => R.radio(['SAM', 'MAM', 'SUW', 'MUW', 'Severely Stunted', 'Moderately Stunted', 'Other (specify)']));
  q(r, 'GMT5', "Was the caregiver advised to visit a health facility for the child's undernutrition?", true, null, null,
    R => R.radio(['Yes', 'No']));
  q(r, 'GMT6', 'Did the child visit the health facility?', true, null, 'GMT5 = Yes', R => R.radio(['Yes', 'No']));
  q(r, 'GMT7', 'Is the child currently receiving treatment for undernutrition?', true, null, null, R => R.radio(['Yes', 'No']));
  q(r, 'GMT8', 'Which medicines has the child consumed in the last month?', true, 'Select all that apply.', 'GMT7 = Yes',
    R => R.checkbox(['Amoxycillin', 'Folic acid', 'Albendazole', 'Vitamin A', 'IFA syrup', 'Multivitamin', 'Zinc', 'ORS', 'Paracetamol', 'Other (specify)']));

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 7 — Micronutrient Supplementation
  // ══════════════════════════════════════════════════════════════════════════
  r.doc.addPage();
  r.y = MT;
  r.section(7, 'Micronutrient Supplementation (MN1–MN4)', 'Vitamin and mineral supplement intake');

  q(r, 'MN1', 'Has the child received Vitamin A syrup in the past 6 months?', true, 'Applicable for children older than 9 months.', 'Child age > 9 months',
    R => R.radio(['Yes', 'No', "Don't Know"]));
  q(r, 'MN2', 'Has the child received deworming medicine in the past 1 year?', true, 'Applicable for children older than 12 months.', 'Child age > 12 months',
    R => R.radio(['Yes', 'No', "Don't Know"]));
  q(r, 'MN3', 'Has the child received iron syrup in the past month?', true, 'Applicable for children older than 6 months.', 'Child age > 6 months',
    R => R.radio(['Yes', 'No', "Don't Know"]));
  q(r, 'MN4', 'How many doses of iron syrup did the child receive in the last month?', true, 'Range: 0–999.', 'MN3 = Yes and child age > 6 months',
    R => R.textBox('Enter number of doses'));

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 8 — Home Visits
  // ══════════════════════════════════════════════════════════════════════════
  r.doc.addPage();
  r.y = MT;
  r.section(8, 'Home Visits by AWW & ASHA (HV1–HV6)', 'Counselling and outreach by frontline workers');

  const counselTopics = [
    'Colostrum feeding',
    'Early and exclusive breastfeeding',
    'Breastfeeding position and attachment',
    'Breastfeeding on demand',
    'Expressing and storing breast milk',
    'Breastfeeding during illness',
    'Breastfeeding after 6 months',
    'Complementary feeding at 6 months',
    'Types of foods to be given',
    'Frequency of feeding',
    'Amount/quantity of feeding',
    'Dietary diversity',
    'Micronutrient supplementation',
    'Deworming',
    'Vitamin A supplementation',
    'Iron supplementation',
    'Growth monitoring',
    'Hand washing',
    'Safe drinking water',
    'Safe food preparation',
    'Danger signs in children',
    'Immunization',
    'CMAM / Therapeutic feeding',
    'Caregiver mental health',
    'Child stimulation / development',
    'Nothing',
    'Other (specify)',
  ];
  const counselMethods = ['MCP card', 'Flipbook / Flipchart', 'Posters', 'Video on mobile', 'Counselling card', 'Nothing', 'Other (specify)'];

  q(r, 'HV1', 'How many times did the Anganwadi Worker (AWW) visit your home in the past month?', true,
    'Range: 0–99. Enter 99 if unable to answer.', null, R => R.textBox('Enter number of visits'));
  q(r, 'HV2', 'What topics did the AWW discuss during the home visit?', true, 'Select all that apply.', 'HV1 > 0',
    R => R.checkbox(counselTopics));
  q(r, 'HV3', 'What methods did the AWW use to provide information?', true, 'Select all that apply.', 'HV1 > 0',
    R => R.checkbox(counselMethods));

  r.gap(4);
  q(r, 'HV4', 'How many times did ASHA visit your home in the past month?', true,
    'Range: 0–99. Enter 99 if unable to answer.', null, R => R.textBox('Enter number of visits'));
  q(r, 'HV5', 'What topics did ASHA discuss during the home visit?', true, 'Select all that apply.', 'HV4 > 0',
    R => R.checkbox(counselTopics));
  q(r, 'HV6', 'What methods did ASHA use to provide information?', true, 'Select all that apply.', 'HV4 > 0',
    R => R.checkbox(counselMethods));

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 9 — Anthropometry
  // ══════════════════════════════════════════════════════════════════════════
  r.doc.addPage();
  r.y = MT;
  r.section(9, 'Anthropometry (ANTH1–ANTH5)', 'Growth measurements and nutritional status');

  q(r, 'ANTH1', "Child's current weight (kg)", true,
    'Enter decimal value (e.g. 8.50). Enter 999 if weight was not measured.', null, R => R.textBox('Enter weight in kg'));
  q(r, 'ANTH1.1', 'Reason weight was not measured', true, null, 'ANTH1 = 999',
    R => R.radio(['Not present', 'Sick', 'Not willing', 'Other (specify)']));
  q(r, 'ANTH2', "Child's current height / length (cm)", true,
    'Enter decimal value (e.g. 75.50). Range: 40–998 cm. Enter 999 if not measured.', null, R => R.textBox('Enter height/length in cm'));
  q(r, 'ANTH2.1', 'Reason height was not measured', true, null, 'ANTH2 = 999',
    R => R.radio(['Not present', 'Sick', 'Not willing', 'Other (specify)']));
  q(r, 'ANTH2.2', 'Position in which height/length was measured', true, null, 'ANTH2 ≠ 999',
    R => R.radio(['Standing up', 'Lying down']));
  q(r, 'ANTH3', 'Does the child have bilateral pitting oedema?', true, null, null,
    R => R.radio(['Yes', 'No', 'Not assessed']));
  q(r, 'ANTH3.1', 'Reason oedema was not assessed', true, null, 'ANTH3 = Not assessed',
    R => R.radio(['Not present', 'Sick', 'Not willing', 'Other (specify)']));
  q(r, 'ANTH4', "Child's nutritional category", true,
    'Auto-calculated from Weight-for-Height Z-score (WHZ) using WHO 2006 standards.\nIf bilateral oedema is present, category is automatically set to SAM.', null,
    R => R.radio(['SAM – Severe Acute Malnutrition', 'MAM – Moderate Acute Malnutrition', 'Normal']));
  q(r, 'ANTH5', 'Is the child enrolled in CMAM (Community Management of Acute Malnutrition)?', true, null, 'ANTH4 = SAM or MAM',
    R => R.radio(['Yes', 'No']));

  // ── Finalise ───────────────────────────────────────────────────────────────
  r.addPageNumbers();
  r.doc.save('BiAnnual_Questionnaire.pdf');
};
