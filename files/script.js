/**
 * script.js — Calculator · CodeAlpha Task
 * ─────────────────────────────────────────
 * Architecture: a small state machine with a pure evaluate() step.
 * State tracks: firstOperand, operator, secondOperand, waitingForSecond.
 * Evaluation uses JavaScript's built-in arithmetic (respects IEEE 754).
 */

'use strict';

/* ── DOM references ──────────────────────────────────────── */
const displayInput      = document.getElementById('input');
const displayExpression = document.getElementById('expression');
const btnAC             = document.getElementById('btn-ac');
const btnC              = document.getElementById('btn-c');
const btnDot            = document.getElementById('btn-dot');
const btnSign           = document.getElementById('btn-sign');
const btnPercent        = document.getElementById('btn-percent');
const btnEquals         = document.getElementById('btn-equals');
const digitButtons      = document.querySelectorAll('[data-digit]');
const operatorButtons   = document.querySelectorAll('[data-op]');

/* ── Max display characters ──────────────────────────────── */
const MAX_DIGITS = 12;

/* ── Calculator state ────────────────────────────────────── */
let state = {
  firstOperand:      null,   // number | null
  operator:          null,   // '+' | '−' | '×' | '÷' | null
  waitingForSecond:  false,  // true after operator pressed
  inputString:       '0',    // what the display shows
  justCalculated:    false,  // true right after = pressed
};

/* ── Helpers ─────────────────────────────────────────────── */

/**
 * Write a value to the display.
 * Trims to MAX_DIGITS, chooses font size class by length.
 */
function setDisplay(value) {
  const str = String(value);
  displayInput.textContent = str;

  // Font size based on length
  displayInput.classList.remove('medium', 'small', 'error');
  const len = str.replace(/[^0-9.]/g, '').length;
  if (len > 10) displayInput.classList.add('small');
  else if (len > 7) displayInput.classList.add('medium');
}

/** Write the ghost expression line above the main display */
function setExpression(value) {
  displayExpression.textContent = value || '';
}

/** Show an error on the display */
function showError(msg = 'Error') {
  displayInput.textContent = msg;
  displayInput.classList.add('error');
  setExpression('');
}

/**
 * Format a number for display.
 * Rounds floating-point noise, caps at MAX_DIGITS.
 */
function formatNumber(num) {
  if (!isFinite(num)) return 'Error';

  // Round away floating-point noise (e.g. 0.1 + 0.2 = 0.30000000000000004)
  const rounded = parseFloat(num.toPrecision(10));

  const str = String(rounded);

  // If it fits, return as-is
  if (str.replace('.', '').replace('-', '').length <= MAX_DIGITS) return str;

  // Otherwise use exponential notation, trimmed
  return rounded.toExponential(6);
}

/** Evaluate two operands with the given operator. Returns a number or null. */
function evaluate(a, op, b) {
  switch (op) {
    case '+': return a + b;
    case '−': return a - b;
    case '×': return a * b;
    case '÷':
      if (b === 0) return null;   // division by zero
      return a / b;
    default:  return null;
  }
}

/** Highlight the active operator button */
function highlightOperator(op) {
  operatorButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.op === op);
  });
}

/** Clear all operator highlights */
function clearHighlights() {
  operatorButtons.forEach(btn => btn.classList.remove('active'));
}

/** Flash the equals button glow */
function pulseEquals() {
  btnEquals.classList.remove('pulse');
  // Force reflow to restart animation
  void btnEquals.offsetWidth;
  btnEquals.classList.add('pulse');
  btnEquals.addEventListener('animationend', () => btnEquals.classList.remove('pulse'), { once: true });
}

/* ── Core actions ────────────────────────────────────────── */

/** Handle a digit press (0–9) */
function inputDigit(digit) {
  // After a calculation, start fresh
  if (state.justCalculated) {
    state.inputString = digit;
    state.justCalculated = false;
    state.firstOperand = null;
    state.operator = null;
    state.waitingForSecond = false;
    clearHighlights();
    setExpression('');
    setDisplay(state.inputString);
    return;
  }

  // After an operator, start building second operand
  if (state.waitingForSecond) {
    state.inputString = digit;
    state.waitingForSecond = false;
    setDisplay(state.inputString);
    return;
  }

  // Don't exceed MAX_DIGITS
  const bare = state.inputString.replace('.', '').replace('-', '');
  if (bare.length >= MAX_DIGITS) return;

  // Replace leading zero (but keep "0.")
  if (state.inputString === '0') {
    state.inputString = digit;
  } else {
    state.inputString += digit;
  }

  setDisplay(state.inputString);
}

/** Handle decimal point */
function inputDecimal() {
  // After calculation, start "0."
  if (state.justCalculated) {
    state.inputString = '0.';
    state.justCalculated = false;
    state.firstOperand = null;
    state.operator = null;
    state.waitingForSecond = false;
    clearHighlights();
    setExpression('');
    setDisplay(state.inputString);
    return;
  }

  // Start new operand after operator
  if (state.waitingForSecond) {
    state.inputString = '0.';
    state.waitingForSecond = false;
    setDisplay(state.inputString);
    return;
  }

  // Only one decimal point per number
  if (state.inputString.includes('.')) return;

  state.inputString += '.';
  setDisplay(state.inputString);
}

/** Handle an operator press (+, −, ×, ÷) */
function inputOperator(op) {
  const current = parseFloat(state.inputString);

  // Chain calculation: if we already have an operator and a second operand
  if (state.operator !== null && !state.waitingForSecond) {
    const result = evaluate(state.firstOperand, state.operator, current);

    if (result === null) {
      showError('Error: ÷0');
      resetState();
      return;
    }

    const formatted = formatNumber(result);
    if (formatted === 'Error') { showError(); resetState(); return; }

    state.firstOperand = result;
    state.inputString  = formatted;
    setDisplay(formatted);
    setExpression(formatted + ' ' + op);
  } else {
    // First operand
    state.firstOperand = isNaN(current) ? 0 : current;
    setExpression(formatNumber(state.firstOperand) + ' ' + op);
  }

  state.operator         = op;
  state.waitingForSecond = true;
  state.justCalculated   = false;
  highlightOperator(op);
}

/** Handle equals */
function calculate() {
  if (state.operator === null || state.waitingForSecond) return;

  const second = parseFloat(state.inputString);
  const expr   = formatNumber(state.firstOperand) + ' ' + state.operator + ' ' + formatNumber(second) + ' =';

  const result = evaluate(state.firstOperand, state.operator, second);

  if (result === null) {
    showError('Error: ÷0');
    resetState();
    return;
  }

  const formatted = formatNumber(result);
  if (formatted === 'Error') { showError(); resetState(); return; }

  setExpression(expr);
  setDisplay(formatted);
  pulseEquals();

  // Keep result for chaining, clear operator
  state.inputString     = formatted;
  state.firstOperand    = result;
  state.operator        = null;
  state.waitingForSecond = false;
  state.justCalculated  = true;
  clearHighlights();
}

/** Handle AC — reset everything */
function allClear() {
  resetState();
  setDisplay('0');
  setExpression('');
  displayInput.classList.remove('error');
  clearHighlights();
}

function resetState() {
  state = {
    firstOperand:     null,
    operator:         null,
    waitingForSecond: false,
    inputString:      '0',
    justCalculated:   false,
  };
}

/** Handle C — delete last character */
function clearLast() {
  displayInput.classList.remove('error');

  // If result or error is showing, treat as AC
  if (state.justCalculated || displayInput.textContent === 'Error') {
    allClear();
    return;
  }

  if (state.waitingForSecond) return;   // nothing to delete yet

  if (state.inputString.length <= 1 || state.inputString === '-0') {
    state.inputString = '0';
  } else {
    state.inputString = state.inputString.slice(0, -1);
    // If we're left with just '-', reset to 0
    if (state.inputString === '-') state.inputString = '0';
  }

  setDisplay(state.inputString);
}

/** Handle % — convert to percentage */
function inputPercent() {
  const current = parseFloat(state.inputString);
  if (isNaN(current)) return;

  const result = current / 100;
  state.inputString = formatNumber(result);
  state.justCalculated = false;
  setDisplay(state.inputString);
}

/** Handle +/− — toggle sign */
function toggleSign() {
  if (state.inputString === '0') return;

  if (state.inputString.startsWith('-')) {
    state.inputString = state.inputString.slice(1);
  } else {
    state.inputString = '-' + state.inputString;
  }

  setDisplay(state.inputString);
}

/* ── Button press animation helper ──────────────────────── */
function flashButton(el) {
  el.classList.add('pressed');
  setTimeout(() => el.classList.remove('pressed'), 100);
}

/* ── Event listeners — buttons ───────────────────────────── */
digitButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    inputDigit(btn.dataset.digit);
    flashButton(btn);
  });
});

operatorButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    inputOperator(btn.dataset.op);
    flashButton(btn);
  });
});

btnAC.addEventListener('click', () => { allClear(); flashButton(btnAC); });
btnC.addEventListener('click',  () => { clearLast(); flashButton(btnC); });
btnDot.addEventListener('click', () => { inputDecimal(); flashButton(btnDot); });
btnSign.addEventListener('click', () => { toggleSign(); flashButton(btnSign); });
btnPercent.addEventListener('click', () => { inputPercent(); flashButton(btnPercent); });
btnEquals.addEventListener('click', () => { calculate(); flashButton(btnEquals); });

/* ── Keyboard support ─────────────────────────────────────
   Numbers 0–9   → digit input
   + - * /       → operator input  (/ maps to ÷, * to ×, - to −)
   Enter         → equals
   Escape        → AC
   Backspace     → C (delete last)
   .             → decimal
   %             → percent
──────────────────────────────────────────────────────────── */
const KEY_OP_MAP = {
  '+': '+',
  '-': '−',
  '*': '×',
  '/': '÷',
};

document.addEventListener('keydown', e => {
  // Digit
  if (e.key >= '0' && e.key <= '9') {
    inputDigit(e.key);
    const btn = document.querySelector(`[data-digit="${e.key}"]`);
    if (btn) flashButton(btn);
    return;
  }

  // Operator
  if (KEY_OP_MAP[e.key]) {
    e.preventDefault();   // prevent '/' triggering browser find
    const op = KEY_OP_MAP[e.key];
    inputOperator(op);
    const btn = document.querySelector(`[data-op="${op}"]`);
    if (btn) flashButton(btn);
    return;
  }

  switch (e.key) {
    case 'Enter':
    case '=':
      calculate();
      flashButton(btnEquals);
      break;
    case 'Escape':
      allClear();
      flashButton(btnAC);
      break;
    case 'Backspace':
      clearLast();
      flashButton(btnC);
      break;
    case '.':
    case ',':
      inputDecimal();
      flashButton(btnDot);
      break;
    case '%':
      inputPercent();
      flashButton(btnPercent);
      break;
  }
});
