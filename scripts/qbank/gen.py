#!/usr/bin/env python3
"""
ELL 1000 topic-wise question-bank generator.

Numerical questions are generated with COMPUTED answers (so they are provably
correct); conceptual questions are curated standard-textbook facts. Each question
carries a one-line worked solution. Output: a shareable PDF per topic.

Usage: python scripts/qbank/gen.py <topic_key>
"""
import random, sys, os, math, re
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

OUT_DIR = r"C:\Users\Duke\Downloads\ELL1000-Question-Bank"
FONTS = r"C:\Windows\Fonts"
pdfmetrics.registerFont(TTFont("AppFont", os.path.join(FONTS, "arial.ttf")))
pdfmetrics.registerFont(TTFont("AppFont-Bold", os.path.join(FONTS, "arialbd.ttf")))
pdfmetrics.registerFontFamily("AppFont", normal="AppFont", bold="AppFont-Bold")

random.seed(1000)
LETTERS = "ABCD"

# Arial lacks a few maths glyphs (they would render as empty boxes). Map them to
# readable equivalents. Multi-character sequences are replaced first.
GLYPH_SEQ = [
    ("10⁻⁷", "10^-7"), ("10⁻¹²", "10^-12"),
    ("e⁻¹", "e^-1"), ("e⁻ᵗ", "e^-t"),
    ("]⁻¹", "]^-1"), ("0⁺", "0+"), ("0⁻", "0-"),
]
GLYPH_MAP = {
    "⁺": "+", "⁻": "^-",
    "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4",
    "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9",
    "₊": "+", "₋": "-",
    "⇒": "=>", "∝": " is proportional to ",
    "∥": "||", "⊕": " XOR ",
}


def sanitize(text: str) -> str:
    """Replace glyphs the PDF font cannot draw, and tidy trailing '.0' so the
    values quoted in solutions match the way options are printed."""
    for a, b in GLYPH_SEQ:
        text = text.replace(a, b)
    text = "".join(GLYPH_MAP.get(ch, ch) for ch in text)
    return re.sub(r"(?<=\d)\.0(?![0-9])", "", text)


def fmt(x, unit=""):
    """Format a number cleanly (drop trailing zeros)."""
    if abs(x - round(x)) < 1e-9:
        s = str(int(round(x)))
    else:
        # 3 decimals so displayed options match the round(v, 2|3) used in solutions
        s = f"{x:.3f}".rstrip("0").rstrip(".")
    return f"{s} {unit}".strip()


def _perturb(value_str, k):
    """Derive an extra numeric distractor by scaling the correct answer."""
    m = re.match(r"^(-?[\d.]+)\s*(.*)$", value_str)
    if not m:
        return None
    try:
        v = float(m.group(1))
    except ValueError:
        return None
    unit = m.group(2)
    factors = [2, 0.5, 1.5, 0.25, 3, 0.75, 4, 1.25, 5, 0.2]
    nv = v * factors[k % len(factors)]
    if nv == v:
        return None
    return fmt(round(nv, 3), unit)


def mcq(prompt, correct, wrongs, sol):
    """Build an MCQ: four distinct options with the correct one placed randomly."""
    opts = [correct]
    for w in wrongs:
        if w not in opts and len(opts) < 4:
            opts.append(w)
    k = 0
    while len(opts) < 4 and k < 40:      # top up with scaled numeric distractors
        cand = _perturb(correct, k)
        k += 1
        if cand and cand not in opts:
            opts.append(cand)
    if len(opts) < 4:                    # non-numeric fallback: drop the question
        return None
    random.shuffle(opts)
    return {"q": prompt, "options": opts, "answer": opts.index(correct), "sol": sol}


def uniq(gen, n, seen):
    """Call gen() until n unique-prompt questions are produced."""
    out = []
    tries = 0
    while len(out) < n and tries < n * 40:
        tries += 1
        item = gen()
        if item and item["q"] not in seen:
            seen.add(item["q"])
            out.append(item)
    return out


# ─────────────────────────── Topic 1: Circuit Elements ───────────────────────────
def t1_numerical():
    gens = []

    def series_r():
        rs = [random.randint(1, 20) for _ in range(random.choice([2, 3]))]
        req = sum(rs)
        return mcq(
            f"Resistors of {', '.join(str(r)+' \u03a9' for r in rs)} are connected in series. "
            f"The equivalent resistance is:",
            fmt(req, "\u03a9"),
            [fmt(req - min(rs), "\u03a9"), fmt(round(req / len(rs), 2), "\u03a9"),
             fmt(req + random.randint(1, 5), "\u03a9")],
            f"Series: R_eq = {' + '.join(map(str, rs))} = {req} \u03a9.",
        )

    def parallel_r2():
        a, b = random.randint(2, 20), random.randint(2, 20)
        rp = a * b / (a + b)
        return mcq(
            f"Two resistors {a} \u03a9 and {b} \u03a9 are connected in parallel. "
            f"The equivalent resistance is:",
            fmt(round(rp, 2), "\u03a9"),
            [fmt(a + b, "\u03a9"), fmt(round((a + b) / 2, 2), "\u03a9"),
             fmt(round(a * b, 2), "\u03a9")],
            f"Parallel: R = ({a}\u00d7{b})/({a}+{b}) = {round(rp,2)} \u03a9.",
        )

    def parallel_r_equal():
        r = random.choice([6, 9, 12, 10, 8, 20])
        n = random.choice([2, 3, 4])
        rp = r / n
        return mcq(
            f"{n} equal resistors of {r} \u03a9 each are connected in parallel. "
            f"The equivalent resistance is:",
            fmt(round(rp, 2), "\u03a9"),
            [fmt(r * n, "\u03a9"), fmt(r, "\u03a9"), fmt(round(r / (n + 1), 2), "\u03a9")],
            f"Equal parallel: R/n = {r}/{n} = {round(rp,2)} \u03a9.",
        )

    def cap_series():
        a, b = random.choice([2, 3, 4, 6, 8]), random.choice([2, 3, 4, 6, 8])
        cs = a * b / (a + b)
        return mcq(
            f"Two capacitors {a} \u00b5F and {b} \u00b5F are connected in series. "
            f"The equivalent capacitance is:",
            fmt(round(cs, 2), "\u00b5F"),
            [fmt(a + b, "\u00b5F"), fmt(round((a + b) / 2, 2), "\u00b5F"),
             fmt(a * b, "\u00b5F")],
            f"Series C: ({a}\u00d7{b})/({a}+{b}) = {round(cs,2)} \u00b5F.",
        )

    def cap_parallel():
        cs = [random.randint(1, 12) for _ in range(random.choice([2, 3]))]
        cp = sum(cs)
        return mcq(
            f"Capacitors of {', '.join(str(c)+' \u00b5F' for c in cs)} are connected in parallel. "
            f"The equivalent capacitance is:",
            fmt(cp, "\u00b5F"),
            [fmt(round(1 / sum(1 / c for c in cs), 2), "\u00b5F"),
             fmt(round(cp / len(cs), 2), "\u00b5F"), fmt(cp + 1, "\u00b5F")],
            f"Parallel C add: {' + '.join(map(str, cs))} = {cp} \u00b5F.",
        )

    def ind_series():
        ls = [random.randint(1, 20) for _ in range(2)]
        return mcq(
            f"Two inductors {ls[0]} mH and {ls[1]} mH are connected in series (no mutual coupling). "
            f"The equivalent inductance is:",
            fmt(sum(ls), "mH"),
            [fmt(round(ls[0] * ls[1] / sum(ls), 2), "mH"), fmt(abs(ls[0] - ls[1]), "mH"),
             fmt(round(sum(ls) / 2, 2), "mH")],
            f"Series L add: {ls[0]} + {ls[1]} = {sum(ls)} mH.",
        )

    def ind_parallel():
        a, b = random.randint(2, 20), random.randint(2, 20)
        lp = a * b / (a + b)
        return mcq(
            f"Two inductors {a} mH and {b} mH are in parallel (no coupling). "
            f"The equivalent inductance is:",
            fmt(round(lp, 2), "mH"),
            [fmt(a + b, "mH"), fmt(round((a + b) / 2, 2), "mH"), fmt(a * b, "mH")],
            f"Parallel L: ({a}\u00d7{b})/({a}+{b}) = {round(lp,2)} mH.",
        )

    def ohm_i():
        v, r = random.choice([6, 9, 12, 24, 15, 20, 10]), random.choice([2, 3, 4, 5, 6, 10])
        return mcq(
            f"A {v} V source is connected across a {r} \u03a9 resistor. The current is:",
            fmt(round(v / r, 2), "A"),
            [fmt(v * r, "A"), fmt(round(r / v, 2), "A"), fmt(v - r, "A")],
            f"Ohm's law: I = V/R = {v}/{r} = {round(v/r,2)} A.",
        )

    def ohm_v():
        i, r = random.choice([1, 2, 3, 4, 5]), random.choice([2, 3, 5, 8, 10])
        return mcq(
            f"A current of {i} A flows through a {r} \u03a9 resistor. The voltage across it is:",
            fmt(i * r, "V"),
            [fmt(round(r / i, 2), "V"), fmt(i + r, "V"), fmt(round(i / r, 2), "V")],
            f"Ohm's law: V = IR = {i}\u00d7{r} = {i*r} V.",
        )

    def power_i2r():
        i, r = random.choice([1, 2, 3, 4]), random.choice([2, 3, 5, 10])
        return mcq(
            f"A current of {i} A flows through a {r} \u03a9 resistor. The power dissipated is:",
            fmt(i * i * r, "W"),
            [fmt(i * r, "W"), fmt(round(i * r * r, 2), "W"), fmt(round(r / i, 2), "W")],
            f"P = I\u00b2R = {i}\u00b2\u00d7{r} = {i*i*r} W.",
        )

    def power_v2r():
        v, r = random.choice([10, 12, 15, 20, 24]), random.choice([2, 4, 5, 6, 10])
        return mcq(
            f"A {v} V supply is applied across a {r} \u03a9 resistor. The power dissipated is:",
            fmt(round(v * v / r, 2), "W"),
            [fmt(round(v / r, 2), "W"), fmt(v * r, "W"), fmt(round(v * v / (2 * r), 2), "W")],
            f"P = V\u00b2/R = {v}\u00b2/{r} = {round(v*v/r,2)} W.",
        )

    def energy_cap():
        c, v = random.choice([2, 4, 5, 10]), random.choice([5, 10, 20, 50])
        e = 0.5 * c * v * v
        return mcq(
            f"A {c} F capacitor is charged to {v} V. The energy stored is:",
            fmt(e, "J"),
            [fmt(c * v, "J"), fmt(c * v * v, "J"), fmt(round(0.5 * c * v, 2), "J")],
            f"E = \u00bdCV\u00b2 = \u00bd\u00d7{c}\u00d7{v}\u00b2 = {fmt(e)} J.",
        )

    def energy_ind():
        l, i = random.choice([2, 4, 5, 10]), random.choice([2, 3, 4, 5])
        e = 0.5 * l * i * i
        return mcq(
            f"An inductor of {l} H carries a current of {i} A. The energy stored is:",
            fmt(e, "J"),
            [fmt(l * i, "J"), fmt(l * i * i, "J"), fmt(round(0.5 * l * i, 2), "J")],
            f"E = \u00bdLI\u00b2 = \u00bd\u00d7{l}\u00d7{i}\u00b2 = {fmt(e)} J.",
        )

    def charge_cap():
        c, v = random.choice([2, 5, 10, 100]), random.choice([5, 10, 12, 20])
        return mcq(
            f"A {c} \u00b5F capacitor is charged to {v} V. The charge stored is:",
            fmt(c * v, "\u00b5C"),
            [fmt(round(c / v, 2), "\u00b5C"), fmt(c + v, "\u00b5C"), fmt(round(v / c, 2), "\u00b5C")],
            f"Q = CV = {c}\u00d7{v} = {c*v} \u00b5C.",
        )

    def conductance():
        r = random.choice([2, 4, 5, 8, 10, 20, 25])
        return mcq(
            f"The conductance of a {r} \u03a9 resistor is:",
            fmt(round(1 / r, 3), "S"),
            [fmt(r, "S"), fmt(round(r / 2, 2), "S"), fmt(round(2 / r, 3), "S")],
            f"G = 1/R = 1/{r} = {round(1/r,3)} S.",
        )

    gens = [series_r, parallel_r2, parallel_r_equal, cap_series, cap_parallel,
            ind_series, ind_parallel, ohm_i, ohm_v, power_i2r, power_v2r,
            energy_cap, energy_ind, charge_cap, conductance]
    seen = set()
    out = []
    for g in gens:
        out += uniq(g, 4, seen)
    return out


def t1_conceptual():
    C = [
        ("Which of the following is a bilateral element?", ["Diode", "Resistor", "Transistor", "SCR"], 1,
         "A resistor conducts equally in both directions \u2014 bilateral."),
        ("Which of the following is a unilateral element?", ["Resistor", "Inductor", "Diode", "Capacitor"], 2,
         "A diode conducts in one direction only \u2014 unilateral."),
        ("Which of the following is an active element?", ["Resistor", "Independent voltage source", "Inductor", "Capacitor"], 1,
         "Sources deliver energy \u2014 active; R, L, C are passive."),
        ("Energy in a capacitor is stored in the form of:", ["Magnetic field", "Electric field", "Heat", "Chemical energy"], 1,
         "A capacitor stores energy in its electric field."),
        ("Energy in an inductor is stored in the form of:", ["Electric field", "Magnetic field", "Heat", "Static charge"], 1,
         "An inductor stores energy in its magnetic field."),
        ("At DC steady state, an ideal inductor behaves as a:", ["Open circuit", "Short circuit", "Resistor", "Capacitor"], 1,
         "V = L di/dt = 0 for constant current \u2192 short circuit."),
        ("At DC steady state, an ideal capacitor behaves as an:", ["Short circuit", "Open circuit", "Resistor", "Inductor"], 1,
         "I = C dv/dt = 0 for constant voltage \u2192 open circuit."),
        ("Ohm's law is applicable to:", ["All elements", "Linear resistors", "Diodes", "Capacitors only"], 1,
         "Ohm's law (V = IR) holds for linear resistors."),
        ("The SI unit of capacitance is the:", ["Henry", "Farad", "Ohm", "Siemens"], 1,
         "Capacitance is measured in farads (C/V)."),
        ("The SI unit of inductance is the:", ["Farad", "Henry", "Weber", "Tesla"], 1,
         "Inductance is measured in henries (Wb/A)."),
        ("The SI unit of conductance is the:", ["Ohm", "Siemens", "Farad", "Henry"], 1,
         "Conductance G = 1/R is measured in siemens."),
        ("An ideal voltage source has an internal resistance of:", ["Infinite", "Zero", "1 \u03a9", "Equal to load"], 1,
         "An ideal voltage source has zero internal resistance."),
        ("An ideal current source has an internal resistance of:", ["Zero", "Infinite", "1 \u03a9", "Equal to load"], 1,
         "An ideal current source has infinite internal resistance."),
        ("Which element only dissipates energy and cannot store it?", ["Capacitor", "Inductor", "Resistor", "Battery"], 2,
         "A resistor dissipates energy as heat; it cannot store it."),
        ("A capacitor opposes a sudden change in:", ["Current", "Voltage", "Charge", "Power"], 1,
         "Capacitor voltage cannot change instantaneously."),
        ("An inductor opposes a sudden change in:", ["Voltage", "Current", "Flux linkage rate", "Power"], 1,
         "Inductor current cannot change instantaneously."),
        ("The voltage across an ideal inductor carrying a constant current is:", ["Maximum", "Zero", "Infinite", "Equal to source"], 1,
         "V = L di/dt = 0 when di/dt = 0."),
        ("Superposition theorem is applicable only to:", ["Non-linear circuits", "Linear circuits", "AC circuits only", "DC circuits only"], 1,
         "Superposition requires linearity."),
        ("Resistors in series have an equivalent resistance equal to:", ["Their reciprocal sum", "The sum of resistances", "The smallest value", "The product/sum"], 1,
         "Series resistances add directly."),
        ("The equivalent resistance of resistors in parallel is always:", ["Greater than the largest", "Less than the smallest", "Equal to the average", "Equal to the sum"], 1,
         "Parallel resistance is smaller than the smallest branch."),
        ("Capacitors in series combine like:", ["Resistors in series", "Resistors in parallel", "Inductors in series", "Sources in series"], 1,
         "Series capacitors use the reciprocal (parallel-resistor) rule."),
        ("Capacitors in parallel:", ["Add reciprocally", "Add directly", "Cancel", "Halve"], 1,
         "Parallel capacitances add directly."),
        ("A p-n junction diode is a:", ["Linear bilateral element", "Non-linear unilateral element", "Linear unilateral element", "Non-linear bilateral element"], 1,
         "A diode is non-linear and unilateral."),
        ("One farad is equal to one:", ["Volt per coulomb", "Coulomb per volt", "Ampere per volt", "Joule per volt"], 1,
         "C = Q/V, so 1 F = 1 C/V."),
        ("The reciprocal of resistance is:", ["Reactance", "Conductance", "Impedance", "Admittance"], 1,
         "Conductance G = 1/R."),
        ("A short circuit has a resistance of:", ["Infinite", "Zero", "One ohm", "Undefined"], 1,
         "A short circuit is an ideal zero-resistance path."),
        ("An open circuit has a resistance of:", ["Zero", "Infinite", "One ohm", "Negative"], 1,
         "An open circuit has infinite resistance (no current)."),
        ("A dependent (controlled) source is controlled by:", ["Time only", "A circuit voltage or current", "Temperature", "Frequency only"], 1,
         "Its value depends on another circuit variable."),
        ("Which has a linear V\u2013I characteristic?", ["Diode", "Resistor", "Transistor", "Tunnel diode"], 1,
         "An ideal resistor's V\u2013I graph is a straight line."),
        ("Passive elements are those which:", ["Deliver energy", "Cannot deliver net energy", "Amplify signals", "Generate EMF"], 1,
         "Passive elements (R, L, C) cannot deliver net energy."),
        ("The relation Q = CV shows that capacitance is the charge stored per unit:", ["Current", "Voltage", "Time", "Resistance"], 1,
         "C = Q/V \u2014 charge per unit voltage."),
        ("Kirchhoff's laws are based on conservation of:", ["Only charge", "Only energy", "Charge (KCL) and energy (KVL)", "Momentum"], 2,
         "KCL \u2190 charge conservation; KVL \u2190 energy conservation."),
        ("A resistor is best described as:", ["Active and non-linear", "Passive, linear and bilateral", "Active and bilateral", "Passive and unilateral"], 1,
         "An ideal resistor is passive, linear and bilateral."),
        ("Two 1 \u03a9 resistors in parallel give an equivalent resistance of:", ["2 \u03a9", "0.5 \u03a9", "1 \u03a9", "0.25 \u03a9"], 1,
         "(1\u00d71)/(1+1) = 0.5 \u03a9."),
        ("The henry can be expressed as:", ["A/V", "V\u00b7s/A", "C/V", "\u03a9\u00b7s"], 1,
         "V = L di/dt \u21d2 H = V\u00b7s/A."),
        ("Power delivered to a pure resistor is:", ["Zero on average", "Always dissipated as heat", "Stored", "Negative"], 1,
         "Resistors always dissipate (never store) power."),
        ("Which quantity is the same for all elements connected in series?", ["Voltage", "Current", "Power", "Charge rate difference"], 1,
         "Series elements share the same current."),
        ("Which quantity is the same for all elements connected in parallel?", ["Current", "Voltage", "Power", "Resistance"], 1,
         "Parallel elements share the same voltage."),
        ("The property by which a coil opposes change in current is:", ["Capacitance", "Inductance", "Resistance", "Conductance"], 1,
         "Inductance opposes changes in current."),
        ("A network containing only R, L and C (no sources) is:", ["Active", "Passive", "Unilateral", "Non-linear"], 1,
         "Without sources the network is passive."),
    ]
    return [{"q": q, "options": o, "answer": a, "sol": s} for (q, o, a, s) in C]


def cset(items):
    return [{"q": q, "options": o, "answer": a, "sol": s} for (q, o, a, s) in items]


def batch(gens, target, _=0):
    """Round-robin the generators until `target` unique-prompt questions collected."""
    seen = set()
    out = []
    tries = 0
    while len(out) < target and tries < target * 120:
        for g in gens:
            if len(out) >= target:
                break
            item = g()
            if item and item["q"] not in seen:
                seen.add(item["q"])
                out.append(item)
        tries += 1
    return out


# \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Topic 2: DC Circuit Analysis \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
def t2_numerical():
    def vdiv():
        v, r1, r2 = random.choice([12, 24, 20, 10, 30]), random.randint(2, 10), random.randint(2, 10)
        vx = v * r2 / (r1 + r2)
        return mcq(f"In a series circuit, a {v} V source drives {r1} \u03a9 and {r2} \u03a9. "
                   f"The voltage across the {r2} \u03a9 resistor is:", fmt(round(vx, 2), "V"),
                   [fmt(round(v * r1 / (r1 + r2), 2), "V"), fmt(round(v / 2, 2), "V"), fmt(v, "V")],
                   f"Voltage divider: V\u00d7R2/(R1+R2) = {v}\u00d7{r2}/{r1+r2} = {round(vx,2)} V.")

    def idiv():
        i, r1, r2 = random.choice([6, 9, 12, 10]), random.randint(2, 10), random.randint(2, 10)
        ix = i * r2 / (r1 + r2)
        return mcq(f"A current of {i} A enters two parallel resistors {r1} \u03a9 and {r2} \u03a9. "
                   f"The current through the {r1} \u03a9 resistor is:", fmt(round(ix, 2), "A"),
                   [fmt(round(i * r1 / (r1 + r2), 2), "A"), fmt(round(i / 2, 2), "A"), fmt(i, "A")],
                   f"Current divider: I\u00d7R2/(R1+R2) = {i}\u00d7{r2}/{r1+r2} = {round(ix,2)} A.")

    def src_v2i():
        v, r = random.choice([12, 20, 24, 15, 30]), random.choice([2, 3, 4, 5, 6])
        return mcq(f"A {v} V voltage source in series with {r} \u03a9 is converted to an equivalent "
                   f"current source. The current source value is:", fmt(round(v / r, 2), "A"),
                   [fmt(v * r, "A"), fmt(round(r / v, 2), "A"), fmt(v, "A")],
                   f"Source transformation: I = V/R = {v}/{r} = {round(v/r,2)} A (R stays in parallel).")

    def src_i2v():
        i, r = random.choice([2, 3, 4, 5]), random.choice([2, 4, 5, 6, 10])
        return mcq(f"A {i} A current source in parallel with {r} \u03a9 is converted to an equivalent "
                   f"voltage source. The voltage source value is:", fmt(i * r, "V"),
                   [fmt(round(i / r, 2), "V"), fmt(round(r / i, 2), "V"), fmt(i, "V")],
                   f"Source transformation: V = I\u00d7R = {i}\u00d7{r} = {i*r} V (R stays in series).")

    def sp_equiv():
        r1, r2, r3 = random.randint(2, 8), random.randint(2, 8), random.randint(2, 8)
        req = r1 + r2 * r3 / (r2 + r3)
        return mcq(f"{r1} \u03a9 is in series with the parallel combination of {r2} \u03a9 and {r3} \u03a9. "
                   f"The total resistance is:", fmt(round(req, 2), "\u03a9"),
                   [fmt(r1 + r2 + r3, "\u03a9"), fmt(round(r1 * r2 * r3 / (r1 + r2 + r3), 2), "\u03a9"),
                    fmt(round((r1 + r2 + r3) / 3, 2), "\u03a9")],
                   f"R = {r1} + ({r2}\u2225{r3}) = {r1} + {round(r2*r3/(r2+r3),2)} = {round(req,2)} \u03a9.")

    def nodal_eq():
        n = random.randint(4, 9)
        return mcq(f"A circuit has {n} nodes. The number of independent node-voltage equations required is:",
                   fmt(n - 1), [fmt(n), fmt(n + 1), fmt(n - 2)],
                   f"Node equations = (nodes \u2212 1) = {n} \u2212 1 = {n-1} (one is the reference).")

    def mesh_eq():
        n = random.randint(3, 7); b = n + random.randint(2, 5)
        loops = b - n + 1
        return mcq(f"A planar network has {b} branches and {n} nodes. The number of independent mesh "
                   f"equations is:", fmt(loops), [fmt(b - n), fmt(b - n + 2), fmt(n - 1)],
                   f"Mesh equations = b \u2212 n + 1 = {b} \u2212 {n} + 1 = {loops}.")

    def kcl():
        a, b = random.randint(2, 9), random.randint(2, 9)
        return mcq(f"At a node, currents of {a} A and {b} A flow in. If one current of "
                   f"{a+b-1} A flows out along with another branch, the second outgoing current is:",
                   fmt(1, "A"), [fmt(a + b, "A"), fmt(abs(a - b), "A"), fmt(a + b - 1, "A")],
                   f"KCL: in = out \u21d2 {a}+{b} = {a+b-1}+x \u21d2 x = 1 A.")

    def power():
        v, i = random.choice([12, 24, 10, 20]), random.choice([2, 3, 4, 5])
        return mcq(f"A source delivers {i} A at {v} V. The power delivered is:", fmt(v * i, "W"),
                   [fmt(round(v / i, 2), "W"), fmt(v + i, "W"), fmt(round(v * i / 2, 2), "W")],
                   f"P = VI = {v}\u00d7{i} = {v*i} W.")

    return batch([vdiv, idiv, src_v2i, src_i2v, sp_equiv, nodal_eq, mesh_eq, kcl, power], 90)


def t2_conceptual():
    return cset([
        ("Kirchhoff's Current Law (KCL) is based on the conservation of:", ["Energy", "Charge", "Momentum", "Flux"], 1, "KCL \u2190 conservation of charge (no accumulation at a node)."),
        ("Kirchhoff's Voltage Law (KVL) is based on the conservation of:", ["Charge", "Energy", "Power", "Flux"], 1, "KVL \u2190 conservation of energy around a loop."),
        ("Mesh analysis is a direct application of:", ["KCL", "KVL", "Ohm's law only", "Superposition"], 1, "Mesh analysis writes KVL around each mesh."),
        ("Nodal analysis is a direct application of:", ["KVL", "KCL", "Thevenin's theorem", "Ohm's law only"], 1, "Nodal analysis writes KCL at each node."),
        ("A supernode is formed when:", ["A current source lies between two non-reference nodes", "A voltage source lies between two non-reference nodes", "A resistor connects two nodes", "Two nodes are shorted"], 1, "A voltage source between two non-reference nodes forms a supernode."),
        ("A supermesh is formed when:", ["A voltage source is shared by two meshes", "A current source is shared by two meshes", "Two meshes share a resistor", "A node has three branches"], 1, "A current source shared by two meshes forms a supermesh."),
        ("The passive sign convention assigns positive power when current enters the:", ["Negative terminal", "Positive (+) terminal", "Ground", "Source"], 1, "Current entering the + terminal \u2192 element absorbs (positive) power."),
        ("In nodal analysis, one node is chosen as the:", ["Supernode", "Reference (ground) node", "Floating node", "Source node"], 1, "One node is the reference (0 V)."),
        ("The number of independent KCL equations in a circuit with n nodes is:", ["n", "n \u2212 1", "n + 1", "2n"], 1, "Independent KCL equations = n \u2212 1."),
        ("Source transformation converts a voltage source in series with R into:", ["A current source in series with R", "A current source in parallel with R", "A voltage source in parallel with R", "An open circuit"], 1, "V-source + series R \u2194 I-source + parallel R."),
        ("Two ideal voltage sources of different values must never be connected in:", ["Series", "Parallel", "A loop with resistance", "Star"], 1, "Unequal ideal voltage sources in parallel violate KVL."),
        ("Choice of the reference node in nodal analysis:", ["Changes node voltages' differences", "Does not change any branch voltage or current", "Changes the circuit's currents", "Changes power dissipated"], 1, "Only absolute node potentials shift; branch quantities are unchanged."),
        ("An ideal ammeter has resistance:", ["Infinite", "Zero", "1 \u03a9", "Equal to load"], 1, "An ideal ammeter (series) has zero resistance."),
        ("An ideal voltmeter has resistance:", ["Zero", "Infinite", "1 \u03a9", "Equal to load"], 1, "An ideal voltmeter (parallel) has infinite resistance."),
        ("For a network with b branches and n nodes, the number of independent loops is:", ["b \u2212 n", "b \u2212 n + 1", "n \u2212 1", "b + n"], 1, "Independent loops = b \u2212 n + 1."),
        ("Voltage division applies to elements connected in:", ["Parallel", "Series", "Star", "Delta"], 1, "Voltage divides across series elements."),
        ("Current division applies to elements connected in:", ["Series", "Parallel", "Cascade", "Bridge"], 1, "Current divides among parallel branches."),
        ("A dependent source's value depends on:", ["Time", "Another circuit voltage or current", "Temperature", "Frequency"], 1, "A controlled source depends on another circuit variable."),
        ("In a series circuit the quantity common to all elements is:", ["Voltage", "Current", "Power", "Resistance"], 1, "Series elements carry the same current."),
        ("In a parallel circuit the quantity common to all elements is:", ["Current", "Voltage", "Power", "Charge"], 1, "Parallel elements share the same voltage."),
        ("The algebraic sum of currents at a node is:", ["Maximum", "Zero", "Infinite", "Equal to the source"], 1, "KCL: \u03a3I at a node = 0."),
        ("The algebraic sum of voltages around a closed loop is:", ["Zero", "Maximum", "Equal to source", "Infinite"], 0, "KVL: \u03a3V around a loop = 0."),
        ("Mesh analysis is most convenient for circuits with many:", ["Nodes", "Voltage sources / meshes", "Current sources", "Capacitors"], 1, "Mesh (KVL) suits voltage-source-rich planar circuits."),
        ("Nodal analysis is most convenient for circuits with many:", ["Meshes", "Current sources / nodes", "Voltage sources", "Inductors"], 1, "Nodal (KCL) suits current-source-rich circuits."),
        ("Two resistors carrying the same current must be connected in:", ["Parallel", "Series", "Delta", "Star"], 1, "Same current \u2192 series connection."),
    ])


# \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Topic 3: Network Theorems \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
def t3_numerical():
    def rload():
        rth = random.choice([4, 5, 6, 8, 10, 12, 20])
        return mcq(f"A network has Thevenin resistance R_Th = {rth} \u03a9. For maximum power transfer, "
                   f"the load resistance should be:", fmt(rth, "\u03a9"),
                   [fmt(2 * rth, "\u03a9"), fmt(round(rth / 2, 2), "\u03a9"), fmt(0, "\u03a9")],
                   f"Maximum power transfer: R_L = R_Th = {rth} \u03a9.")

    def pmax():
        vth, rth = random.choice([10, 12, 20, 24, 40, 30]), random.choice([2, 4, 5, 6, 10])
        p = vth * vth / (4 * rth)
        return mcq(f"For a source with V_Th = {vth} V and R_Th = {rth} \u03a9, the maximum power that can "
                   f"be delivered to a load is:", fmt(round(p, 2), "W"),
                   [fmt(round(vth * vth / rth, 2), "W"), fmt(round(vth * vth / (2 * rth), 2), "W"),
                    fmt(round(vth / (4 * rth), 2), "W")],
                   f"P_max = V_Th\u00b2/(4R_Th) = {vth}\u00b2/(4\u00d7{rth}) = {round(p,2)} W.")

    def norton_i():
        vth, rth = random.choice([10, 12, 20, 24, 40]), random.choice([2, 4, 5, 8, 10])
        return mcq(f"A Thevenin equivalent has V_Th = {vth} V and R_Th = {rth} \u03a9. The equivalent Norton "
                   f"current I_N is:", fmt(round(vth / rth, 2), "A"),
                   [fmt(vth * rth, "A"), fmt(round(rth / vth, 2), "A"), fmt(vth, "A")],
                   f"I_N = V_Th/R_Th = {vth}/{rth} = {round(vth/rth,2)} A.")

    def thev_v():
        i_n, rn = random.choice([2, 3, 4, 5]), random.choice([2, 4, 5, 6, 10])
        return mcq(f"A Norton equivalent has I_N = {i_n} A and R_N = {rn} \u03a9. The equivalent Thevenin "
                   f"voltage V_Th is:", fmt(i_n * rn, "V"),
                   [fmt(round(i_n / rn, 2), "V"), fmt(round(rn / i_n, 2), "V"), fmt(i_n, "V")],
                   f"V_Th = I_N\u00d7R_N = {i_n}\u00d7{rn} = {i_n*rn} V.")

    def load_i():
        vth, rth, rl = random.choice([12, 20, 24]), random.choice([2, 4, 6]), random.choice([2, 4, 6, 8])
        i = vth / (rth + rl)
        return mcq(f"A source (V_Th = {vth} V, R_Th = {rth} \u03a9) drives a load R_L = {rl} \u03a9. The load "
                   f"current is:", fmt(round(i, 2), "A"),
                   [fmt(round(vth / rth, 2), "A"), fmt(round(vth / rl, 2), "A"), fmt(round(vth / (rth * rl), 2), "A")],
                   f"I = V_Th/(R_Th+R_L) = {vth}/({rth}+{rl}) = {round(i,2)} A.")

    def load_p():
        vth, rth = random.choice([20, 24, 40]), random.choice([4, 5, 8, 10])
        p = vth * vth / (4 * rth)
        return mcq(f"At maximum power transfer with V_Th = {vth} V and R_Th = {rth} \u03a9, the voltage "
                   f"across the load equals:", fmt(round(vth / 2, 2), "V"),
                   [fmt(vth, "V"), fmt(round(vth / 4, 2), "V"), fmt(round(vth / rth, 2), "V")],
                   f"At R_L = R_Th the load voltage is half of V_Th = {round(vth/2,2)} V.")

    return batch([rload, pmax, norton_i, thev_v, load_i, load_p], 90)


def t3_conceptual():
    return cset([
        ("Thevenin resistance is found by:", ["Opening all sources", "Shorting voltage sources and opening current sources", "Shorting all sources", "Opening voltage and shorting current sources"], 1, "Deactivate sources: short V-sources, open I-sources."),
        ("Thevenin's theorem applies to:", ["Non-linear circuits only", "Linear circuits", "AC circuits only", "Unbalanced circuits only"], 1, "Thevenin's theorem requires linearity."),
        ("Norton's theorem is the dual of:", ["Superposition", "Thevenin's theorem", "Maximum power transfer", "Millman's theorem"], 1, "Norton (I-source \u2225 R) is the dual of Thevenin (V-source + R)."),
        ("Norton's equivalent consists of a current source in:", ["Series with resistance", "Parallel with resistance", "Series with inductance", "Parallel with capacitance"], 1, "Norton: current source in parallel with R_N."),
        ("The Norton resistance R_N compared with R_Th is:", ["Twice", "The same", "Half", "Zero"], 1, "R_N = R_Th."),
        ("Superposition theorem is applicable to:", ["Power", "Voltage and current in linear circuits", "Non-linear circuits", "Only AC"], 1, "Superposition works for V and I in linear circuits (not power)."),
        ("While applying superposition, an ideal voltage source is replaced by a:", ["Open circuit", "Short circuit", "Current source", "Resistor"], 1, "Deactivated voltage source \u2192 short circuit."),
        ("While applying superposition, an ideal current source is replaced by an:", ["Short circuit", "Open circuit", "Voltage source", "Resistor"], 1, "Deactivated current source \u2192 open circuit."),
        ("Maximum power is transferred to the load when R_L equals:", ["2R_Th", "R_Th", "R_Th/2", "0"], 1, "Maximum power transfer: R_L = R_Th."),
        ("The efficiency of power transfer at maximum power transfer is:", ["100%", "75%", "50%", "25%"], 2, "At R_L = R_Th, efficiency is only 50%."),
        ("Superposition cannot be used to directly compute:", ["Branch current", "Node voltage", "Power in a resistor", "Source current"], 2, "Power is non-linear, so it can't be superposed directly."),
        ("Thevenin's theorem reduces a two-terminal linear network to:", ["A single resistor", "A voltage source in series with a resistor", "A current source only", "An inductor"], 1, "Thevenin equivalent: V_Th in series with R_Th."),
        ("Millman's theorem is used to combine several parallel:", ["Resistors only", "Voltage sources with series resistance", "Current sources in series", "Capacitors"], 1, "Millman combines parallel practical voltage sources."),
        ("If R_L < R_Th, the load power is:", ["Maximum", "Less than maximum", "Infinite", "Zero"], 1, "Any R_L \u2260 R_Th gives less than maximum power."),
        ("Reciprocity theorem applies to networks that are linear and:", ["Active", "Bilateral (passive, single source)", "Non-linear", "Time-varying"], 1, "Reciprocity needs linear, bilateral, single-source networks."),
        ("The Thevenin voltage equals the network's:", ["Short-circuit current", "Open-circuit voltage at the terminals", "Load voltage", "Source voltage"], 1, "V_Th = open-circuit terminal voltage."),
        ("The Norton current equals the network's:", ["Open-circuit voltage", "Short-circuit current at the terminals", "Load current", "Source current"], 1, "I_N = short-circuit terminal current."),
        ("For maximum power transfer, the load receives what fraction of the total power?", ["All", "Half", "One-third", "One-quarter"], 1, "Load gets 50%; the rest is lost in R_Th."),
        ("Thevenin and Norton equivalents are related by:", ["V_Th = I_N/R", "V_Th = I_N \u00d7 R_N", "V_Th = I_N + R_N", "V_Th = I_N \u2212 R_N"], 1, "V_Th = I_N \u00d7 R_N and R_Th = R_N."),
        ("Which theorem is most useful for finding current in one particular branch of a large network?", ["Superposition", "Thevenin's theorem", "KCL", "Millman's theorem"], 1, "Thevenin reduces the rest of the network for one branch."),
    ])


# \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Topic 4: First-Order Transients \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
def t4_numerical():
    def tau_rc():
        r, c = random.randint(1, 20), random.randint(1, 20)
        return mcq(f"An RC circuit has R = {r} \u03a9 and C = {c} F. The time constant is:", fmt(r * c, "s"),
                   [fmt(round(r / c, 2), "s"), fmt(r + c, "s"), fmt(round(c / r, 2), "s")],
                   f"\u03c4 = RC = {r}\u00d7{c} = {r*c} s.")

    def tau_rl():
        r, l = random.randint(1, 20), random.randint(1, 40)
        return mcq(f"An RL circuit has R = {r} \u03a9 and L = {l} H. The time constant is:",
                   fmt(round(l / r, 2), "s"), [fmt(l * r, "s"), fmt(round(r / l, 2), "s"), fmt(l + r, "s")],
                   f"\u03c4 = L/R = {l}/{r} = {round(l/r,2)} s.")

    def val_tau():
        vf = random.choice([10, 20, 50, 100])
        v = round(0.632 * vf, 2)
        return mcq(f"In a charging RC circuit the final voltage is {vf} V. At t = \u03c4 the capacitor "
                   f"voltage is (approximately):", fmt(v, "V"),
                   [fmt(vf, "V"), fmt(round(0.368 * vf, 2), "V"), fmt(round(vf / 2, 2), "V")],
                   f"At t = \u03c4, v = 0.632\u00d7V_final = 0.632\u00d7{vf} = {v} V.")

    def decay_tau():
        v0 = random.choice([10, 20, 50, 100])
        v = round(0.368 * v0, 2)
        return mcq(f"A capacitor initially at {v0} V discharges through a resistor. At t = \u03c4 its "
                   f"voltage is (approximately):", fmt(v, "V"),
                   [fmt(round(0.632 * v0, 2), "V"), fmt(0, "V"), fmt(round(v0 / 2, 2), "V")],
                   f"Decay: v = V\u2080 e\u207b\u00b9 = 0.368\u00d7{v0} = {v} V at t = \u03c4.")

    def time_half():
        tau = random.choice([2, 4, 5, 10])
        t = round(0.693 * tau, 2)
        return mcq(f"An RC circuit has a time constant of {tau} s. The time for the capacitor voltage to "
                   f"decay to 50% of its initial value is:", fmt(t, "s"),
                   [fmt(tau, "s"), fmt(round(tau / 2, 2), "s"), fmt(round(1.386 * tau, 2), "s")],
                   f"t = \u03c4\u00b7ln2 = 0.693\u00d7{tau} = {t} s.")

    def time_63():
        tau = random.choice([2, 3, 5, 10])
        return mcq(f"For a first-order circuit with time constant {tau} s, the response reaches about "
                   f"63.2% of its final value after a time of:", fmt(tau, "s"),
                   [fmt(2 * tau, "s"), fmt(round(tau / 2, 2), "s"), fmt(5 * tau, "s")],
                   f"63.2% of the final value is reached at t = \u03c4 = {tau} s.")

    def settle():
        tau = random.choice([1, 2, 4, 5])
        return mcq(f"A first-order circuit has \u03c4 = {tau} s. It is considered to reach steady state "
                   f"(\u2248 99.3%) after approximately:", fmt(5 * tau, "s"),
                   [fmt(tau, "s"), fmt(2 * tau, "s"), fmt(round(0.5 * tau, 2), "s")],
                   f"Practical steady state \u2248 5\u03c4 = 5\u00d7{tau} = {5*tau} s.")

    return batch([tau_rc, tau_rl, val_tau, decay_tau, time_half, time_63, settle], 90)


def t4_conceptual():
    return cset([
        ("A circuit containing a single energy-storage element is a:", ["Zero-order circuit", "First-order circuit", "Second-order circuit", "Third-order circuit"], 1, "One L or one C \u2192 first-order circuit."),
        ("The natural (source-free) response of a first-order circuit is:", ["Sinusoidal", "Exponential", "Constant", "Parabolic"], 1, "Source-free first-order response decays exponentially."),
        ("At t = 0\u207a, the current through an inductor equals its value at:", ["t = \u221e", "t = 0\u207b", "Half the final value", "Zero always"], 1, "Inductor current is continuous: i_L(0\u207a) = i_L(0\u207b)."),
        ("At t = 0\u207a, the voltage across a capacitor equals its value at:", ["t = \u221e", "t = 0\u207b", "Zero always", "The source voltage"], 1, "Capacitor voltage is continuous: v_C(0\u207a) = v_C(0\u207b)."),
        ("At DC steady state, an inductor acts as a:", ["Open circuit", "Short circuit", "Resistor", "Capacitor"], 1, "Steady-state inductor \u2192 short circuit."),
        ("At DC steady state, a capacitor acts as an:", ["Short circuit", "Open circuit", "Resistor", "Inductor"], 1, "Steady-state capacitor \u2192 open circuit."),
        ("The time constant of an RC circuit is:", ["R/C", "RC", "C/R", "1/RC"], 1, "\u03c4 = RC."),
        ("The time constant of an RL circuit is:", ["RL", "L/R", "R/L", "1/RL"], 1, "\u03c4 = L/R."),
        ("A larger time constant means the circuit responds:", ["Faster", "More slowly", "Instantly", "Not at all"], 1, "Larger \u03c4 \u2192 slower response."),
        ("After one time constant, a decaying quantity falls to about:", ["63.2%", "36.8%", "50%", "13.5%"], 1, "e\u207b\u00b9 \u2248 36.8% of the initial value."),
        ("The complete response of a first-order circuit is the sum of:", ["Two natural responses", "Natural (transient) and forced (steady-state) responses", "Two forced responses", "Real and imaginary parts"], 1, "Complete = transient + steady-state."),
        ("The forced response of a DC-driven first-order circuit is:", ["Exponential", "A constant (steady-state) value", "Sinusoidal", "Zero"], 1, "DC forcing \u2192 constant steady-state response."),
        ("The unit of the time constant is:", ["Hertz", "Seconds", "Ohm", "Farad"], 1, "Time constant has units of seconds."),
        ("In an RL circuit, doubling R while keeping L fixed makes the time constant:", ["Double", "Half", "Same", "Four times"], 1, "\u03c4 = L/R \u2192 doubling R halves \u03c4."),
        ("A capacitor cannot have a sudden (step) change in:", ["Current", "Voltage", "Charge rate", "Power"], 1, "v_C cannot change instantaneously."),
        ("An inductor cannot have a sudden (step) change in:", ["Voltage", "Current", "Flux rate", "Power"], 1, "i_L cannot change instantaneously."),
        ("Practically, a first-order circuit is assumed to reach steady state after:", ["1\u03c4", "5\u03c4", "0.5\u03c4", "10\u03c4"], 1, "\u2248 5 time constants (\u2248 99.3%)."),
        ("The step response of an RC circuit rises:", ["Linearly", "Exponentially toward the final value", "Instantly", "Sinusoidally"], 1, "v_C(t) = V_f(1 \u2212 e\u207b\u1d57/\u03c4)."),
        ("At t = \u221e in a source-free RC circuit, the capacitor voltage is:", ["Maximum", "Zero", "Half", "Infinite"], 1, "Source-free \u2192 fully discharged (0 V) at t = \u221e."),
        ("The rate of decay of a first-order transient depends on:", ["The source only", "The time constant", "The initial value only", "Frequency"], 1, "Decay rate is set by \u03c4."),
    ])


# \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Topic 5: Second-Order Transients (RLC) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
def t5_numerical():
    def omega0():
        l, c = random.choice([1, 2, 4]), random.choice([0.25, 0.5, 1])
        w = 1 / math.sqrt(l * c)
        return mcq(f"A series RLC circuit has L = {fmt(l)} H and C = {fmt(c)} F. The undamped natural "
                   f"frequency \u03c9\u2080 is:", fmt(round(w, 3), "rad/s"),
                   [fmt(round(math.sqrt(l * c), 3), "rad/s"), fmt(round(1 / (l * c), 3), "rad/s"),
                    fmt(round(l * c, 3), "rad/s")],
                   f"\u03c9\u2080 = 1/\u221a(LC) = 1/\u221a({fmt(l)}\u00d7{fmt(c)}) = {round(w,3)} rad/s.")

    def alpha_series():
        r, l = random.randint(1, 20), random.randint(1, 10)
        a = r / (2 * l)
        return mcq(f"A series RLC circuit has R = {r} \u03a9 and L = {l} H. The neper (damping) frequency "
                   f"\u03b1 is:", fmt(round(a, 3), "rad/s"),
                   [fmt(round(2 * l / r, 3), "rad/s"), fmt(round(r / l, 3), "rad/s"),
                    fmt(round(r * l, 3), "rad/s")],
                   f"Series RLC: \u03b1 = R/(2L) = {r}/(2\u00d7{l}) = {round(a,3)} rad/s.")

    def alpha_parallel():
        r, c = random.randint(1, 20), random.choice([0.25, 0.5, 1, 2, 4, 5])
        a = 1 / (2 * r * c)
        return mcq(f"A parallel RLC circuit has R = {r} \u03a9 and C = {fmt(c)} F. The neper (damping) "
                   f"frequency \u03b1 is:", fmt(round(a, 3), "rad/s"),
                   [fmt(round(2 * r * c, 3), "rad/s"), fmt(round(r / (2 * c), 3), "rad/s"),
                    fmt(round(1 / (r * c), 3), "rad/s")],
                   f"Parallel RLC: \u03b1 = 1/(2RC) = 1/(2\u00d7{r}\u00d7{fmt(c)}) = {round(a,3)} rad/s.")

    def damping_type():
        cases = [(2, 8, "critically damped"), (5, 8, "overdamped"), (1, 8, "underdamped"),
                 (4, 4, "critically damped"), (6, 4, "overdamped"), (1, 4, "underdamped")]
        a, w, label = random.choice(cases)
        opts = ["overdamped", "underdamped", "critically damped", "undamped"]
        rel = ">" if a > w else ("=" if a == w else "<")
        return mcq(f"In a second-order circuit \u03b1 = {a} rad/s and \u03c9\u2080 = {w} rad/s. The response is:",
                   label, [o for o in opts if o != label][:3],
                   f"\u03b1 {rel} \u03c9\u2080 \u21d2 {label} response.")

    def omegad():
        w0, a = random.choice([5, 10, 13, 25]), random.choice([3, 4, 5, 12])
        if a >= w0:
            w0, a = 13, 5
        wd = math.sqrt(w0 * w0 - a * a)
        return mcq(f"An underdamped circuit has \u03c9\u2080 = {w0} rad/s and \u03b1 = {a} rad/s. The damped "
                   f"natural frequency \u03c9_d is:", fmt(round(wd, 3), "rad/s"),
                   [fmt(round(w0 + a, 3), "rad/s"), fmt(round(w0 - a, 3), "rad/s"),
                    fmt(round(math.sqrt(w0 * w0 + a * a), 3), "rad/s")],
                   f"\u03c9_d = \u221a(\u03c9\u2080\u00b2 \u2212 \u03b1\u00b2) = \u221a({w0}\u00b2\u2212{a}\u00b2) = {round(wd,3)} rad/s.")

    return batch([omega0, alpha_series, alpha_parallel, damping_type, omegad], 90)


def t5_conceptual():
    return cset([
        ("A circuit with two independent energy-storage elements is generally a:", ["First-order circuit", "Second-order circuit", "Zero-order circuit", "Linear resistor"], 1, "Two storage elements \u2192 second-order circuit."),
        ("When \u03b1 > \u03c9\u2080, the response of a second-order circuit is:", ["Underdamped", "Overdamped", "Critically damped", "Undamped"], 1, "\u03b1 > \u03c9\u2080 \u2192 overdamped (two real roots)."),
        ("When \u03b1 < \u03c9\u2080, the response is:", ["Overdamped", "Underdamped", "Critically damped", "Undamped"], 1, "\u03b1 < \u03c9\u2080 \u2192 underdamped (complex roots, oscillatory)."),
        ("When \u03b1 = \u03c9\u2080, the response is:", ["Overdamped", "Underdamped", "Critically damped", "Undamped"], 2, "\u03b1 = \u03c9\u2080 \u2192 critically damped (fastest non-oscillatory)."),
        ("The undamped natural frequency of an RLC circuit is:", ["1/(RC)", "1/\u221a(LC)", "R/(2L)", "\u221a(LC)"], 1, "\u03c9\u2080 = 1/\u221a(LC)."),
        ("For a series RLC circuit the damping factor \u03b1 equals:", ["1/(2RC)", "R/(2L)", "R/L", "2L/R"], 1, "Series RLC: \u03b1 = R/(2L)."),
        ("For a parallel RLC circuit the damping factor \u03b1 equals:", ["R/(2L)", "1/(2RC)", "RC", "2RC"], 1, "Parallel RLC: \u03b1 = 1/(2RC)."),
        ("The critically damped case returns to steady state:", ["Slowest", "Fastest without oscillation", "With oscillation", "Never"], 1, "Critical damping = fastest non-oscillatory settling."),
        ("An underdamped response is characterized by:", ["No oscillation", "Damped oscillations", "Constant value", "Exponential rise only"], 1, "Underdamped \u2192 decaying oscillations."),
        ("The damping ratio \u03b6 is defined as:", ["\u03c9\u2080/\u03b1", "\u03b1/\u03c9\u2080", "\u03b1\u00d7\u03c9\u2080", "\u03b1+\u03c9\u2080"], 1, "\u03b6 = \u03b1/\u03c9\u2080."),
        ("For an underdamped circuit, \u03b6 is:", ["Greater than 1", "Less than 1", "Equal to 1", "Zero always"], 1, "Underdamped \u21d2 \u03b6 < 1."),
        ("The damped natural frequency \u03c9_d equals:", ["\u03c9\u2080 + \u03b1", "\u221a(\u03c9\u2080\u00b2 \u2212 \u03b1\u00b2)", "\u03c9\u2080 \u2212 \u03b1", "\u221a(\u03c9\u2080\u00b2 + \u03b1\u00b2)"], 1, "\u03c9_d = \u221a(\u03c9\u2080\u00b2 \u2212 \u03b1\u00b2)."),
        ("The characteristic equation of a second-order circuit is of order:", ["One", "Two", "Three", "Zero"], 1, "Second-order \u2192 quadratic characteristic equation."),
        ("If R = 0 in a series RLC circuit, the response is:", ["Overdamped", "Undamped (pure oscillation)", "Critically damped", "Constant"], 1, "R = 0 \u21d2 \u03b1 = 0 \u21d2 sustained oscillation at \u03c9\u2080."),
        ("An overdamped response has roots that are:", ["Complex conjugate", "Real and distinct", "Real and equal", "Imaginary"], 1, "Overdamped \u2192 two real distinct roots."),
        ("A critically damped response has roots that are:", ["Complex", "Real and equal", "Imaginary", "Real and distinct"], 1, "Critically damped \u2192 real, equal roots."),
        ("Oscillations in a second-order circuit are caused by energy exchange between:", ["Two resistors", "Inductor and capacitor", "Two capacitors", "Source and resistor"], 1, "L and C exchange energy \u2192 oscillation."),
        ("Increasing R in a series RLC circuit tends to make the response more:", ["Oscillatory", "Damped", "Unstable", "Sinusoidal"], 1, "Higher R \u2192 more damping (\u03b1 = R/2L increases)."),
        ("The natural response type depends on the relative values of:", ["R and C only", "\u03b1 and \u03c9\u2080", "L and C only", "Source and load"], 1, "Damping is decided by \u03b1 vs \u03c9\u2080."),
        ("An LC circuit with no resistance is an example of an:", ["Overdamped system", "Undamped oscillator", "Critically damped system", "First-order system"], 1, "Lossless LC \u2192 undamped oscillator."),
    ])


# \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Topic 6: Single-Phase AC Circuits \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
def t6_numerical():
    def xl():
        f, l = random.choice([50, 60, 100, 400]), random.choice([0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.5, 1])
        x = 2 * math.pi * f * l
        return mcq(f"An inductor L = {fmt(l)} H is connected to a {f} Hz supply. Its inductive reactance is:",
                   fmt(round(x, 2), "\u03a9"),
                   [fmt(round(f * l, 2), "\u03a9"), fmt(round(1 / (2 * math.pi * f * l), 2), "\u03a9"),
                    fmt(round(math.pi * f * l, 2), "\u03a9")],
                   f"X_L = 2\u03c0fL = 2\u03c0\u00d7{f}\u00d7{fmt(l)} = {round(x,2)} \u03a9.")

    def xc():
        f, c = random.choice([50, 60]), random.choice([50, 100, 200])  # \u00b5F
        x = 1 / (2 * math.pi * f * c * 1e-6)
        return mcq(f"A capacitor C = {c} \u00b5F is connected to a {f} Hz supply. Its capacitive reactance is:",
                   fmt(round(x, 2), "\u03a9"),
                   [fmt(round(2 * math.pi * f * c * 1e-6, 6), "\u03a9"), fmt(round(1 / (f * c * 1e-6), 2), "\u03a9"),
                    fmt(round(x / 2, 2), "\u03a9")],
                   f"X_C = 1/(2\u03c0fC) = 1/(2\u03c0\u00d7{f}\u00d7{c}\u00b5F) = {round(x,2)} \u03a9.")

    def zrl():
        r, x = random.randint(2, 15), random.randint(2, 15)
        z = math.hypot(r, x)
        return mcq(f"A series RL circuit has R = {r} \u03a9 and X_L = {x} \u03a9. The impedance magnitude is:",
                   fmt(round(z, 2), "\u03a9"), [fmt(r + x, "\u03a9"), fmt(abs(r - x), "\u03a9"),
                                              fmt(round((r + x) / 2, 2), "\u03a9")],
                   f"Z = \u221a(R\u00b2+X\u00b2) = \u221a({r}\u00b2+{x}\u00b2) = {round(z,2)} \u03a9.")

    def vrms():
        vm = random.choice([100, 141.4, 200, 325, 155.6])
        return mcq(f"A sinusoidal voltage has a peak value of {fmt(vm)} V. Its RMS value is:",
                   fmt(round(vm / math.sqrt(2), 2), "V"),
                   [fmt(round(vm, 2), "V"), fmt(round(vm * math.sqrt(2), 2), "V"),
                    fmt(round(2 * vm / math.pi, 2), "V")],
                   f"V_rms = V_m/\u221a2 = {fmt(vm)}/1.414 = {round(vm/math.sqrt(2),2)} V.")

    def vpeak():
        vr = random.choice([100, 230, 110, 200])
        return mcq(f"An AC supply has an RMS value of {vr} V. Its peak value is:",
                   fmt(round(vr * math.sqrt(2), 2), "V"),
                   [fmt(round(vr / math.sqrt(2), 2), "V"), fmt(vr, "V"), fmt(round(2 * vr / math.pi, 2), "V")],
                   f"V_m = \u221a2\u00d7V_rms = 1.414\u00d7{vr} = {round(vr*math.sqrt(2),2)} V.")

    def power_pf():
        v, i, pf = random.choice([200, 230, 100]), random.choice([2, 5, 10]), random.choice([0.8, 0.6, 1.0, 0.5])
        p = v * i * pf
        return mcq(f"A load draws {i} A from a {v} V (RMS) supply at a power factor of {pf}. "
                   f"The active power is:", fmt(round(p, 2), "W"),
                   [fmt(round(v * i, 2), "W"), fmt(round(v * i * math.sqrt(1 - pf * pf), 2), "W"),
                    fmt(round(v * i / pf, 2), "W")],
                   f"P = VI\u00b7cos\u03c6 = {v}\u00d7{i}\u00d7{pf} = {round(p,2)} W.")

    def pf_from_z():
        r, x = random.choice([3, 6, 4, 8]), random.choice([4, 8, 3, 6])
        z = math.hypot(r, x)
        return mcq(f"A series circuit has R = {r} \u03a9 and reactance {x} \u03a9. The power factor is:",
                   fmt(round(r / z, 3)), [fmt(round(x / z, 3)), fmt(round(r / x, 3)), fmt(1.0)],
                   f"pf = cos\u03c6 = R/Z = {r}/{round(z,2)} = {fmt(round(r/z,3))}.")

    def hw_avg():
        vm = random.choice([100, 200, 314, 157])
        return mcq(f"A half-wave rectified sine wave has a peak of {vm} V. Its average (DC) value is:",
                   fmt(round(vm / math.pi, 2), "V"),
                   [fmt(round(2 * vm / math.pi, 2), "V"), fmt(round(vm / 2, 2), "V"),
                    fmt(round(vm / math.sqrt(2), 2), "V")],
                   f"Half-wave average = V_m/\u03c0 = {vm}/\u03c0 = {round(vm/math.pi,2)} V.")

    return batch([xl, xc, zrl, vrms, vpeak, power_pf, pf_from_z, hw_avg], 90)


def t6_conceptual():
    return cset([
        ("The RMS value of a sinusoid of peak V_m is:", ["V_m", "V_m/\u221a2", "2V_m/\u03c0", "V_m/2"], 1, "V_rms = V_m/\u221a2 = 0.707 V_m."),
        ("The average value of a pure sine wave over a full cycle is:", ["0.707 V_m", "Zero", "0.637 V_m", "V_m"], 1, "Over a full cycle the average of a sinusoid is zero."),
        ("The average power consumed by a pure inductor over a cycle is:", ["Maximum", "Zero", "Half", "V\u00b2/X"], 1, "Pure reactance consumes zero average power."),
        ("The average power consumed by a pure capacitor over a cycle is:", ["Zero", "Maximum", "VI", "V\u00b2/X"], 0, "Pure capacitor \u2192 zero average power."),
        ("In a purely inductive circuit, the current lags the voltage by:", ["0\u00b0", "90\u00b0", "45\u00b0", "180\u00b0"], 1, "Current lags voltage by 90\u00b0 in a pure inductor."),
        ("In a purely capacitive circuit, the current leads the voltage by:", ["0\u00b0", "90\u00b0", "45\u00b0", "180\u00b0"], 1, "Current leads voltage by 90\u00b0 in a pure capacitor."),
        ("Power factor is defined as the cosine of the angle between:", ["Two currents", "Voltage and current", "Two voltages", "P and Q"], 1, "pf = cos\u03c6, \u03c6 between V and I."),
        ("Apparent power is the product of RMS voltage and RMS:", ["Power", "Current", "Reactance", "Resistance"], 1, "S = V_rms \u00d7 I_rms (VA)."),
        ("The unit of reactive power is:", ["Watt", "VAR", "VA", "Joule"], 1, "Reactive power is measured in VAR."),
        ("The unit of apparent power is:", ["Watt", "VAR", "VA", "Henry"], 2, "Apparent power is in volt-amperes (VA)."),
        ("Inductive reactance X_L is given by:", ["1/(2\u03c0fL)", "2\u03c0fL", "2\u03c0fC", "1/(2\u03c0fC)"], 1, "X_L = 2\u03c0fL = \u03c9L."),
        ("Capacitive reactance X_C is given by:", ["2\u03c0fC", "1/(2\u03c0fC)", "2\u03c0fL", "\u03c9L"], 1, "X_C = 1/(2\u03c0fC)."),
        ("As frequency increases, the inductive reactance:", ["Decreases", "Increases", "Stays constant", "Becomes zero"], 1, "X_L = \u03c9L increases with frequency."),
        ("As frequency increases, the capacitive reactance:", ["Increases", "Decreases", "Stays constant", "Becomes infinite"], 1, "X_C = 1/\u03c9C decreases with frequency."),
        ("The form factor of a sine wave is:", ["1.0", "1.11", "1.414", "0.637"], 1, "Form factor = RMS/average = 1.11."),
        ("The peak factor (crest factor) of a sine wave is:", ["1.11", "1.414", "2.0", "0.707"], 1, "Peak factor = V_m/V_rms = \u221a2 = 1.414."),
        ("The impedance of a series RLC circuit is:", ["R + X_L + X_C", "\u221a(R\u00b2 + (X_L \u2212 X_C)\u00b2)", "R \u00d7 X", "R \u2212 X"], 1, "Z = \u221a(R\u00b2 + (X_L\u2212X_C)\u00b2)."),
        ("A power factor of unity means the load is effectively:", ["Purely inductive", "Purely resistive", "Purely capacitive", "Open"], 1, "Unity pf \u21d2 V and I in phase \u21d2 resistive."),
        ("The 'j' operator represents a phase shift of:", ["45\u00b0", "90\u00b0", "180\u00b0", "0\u00b0"], 1, "j corresponds to a +90\u00b0 rotation."),
        ("Active power in an AC circuit is given by:", ["VI", "VI cos\u03c6", "VI sin\u03c6", "V/I"], 1, "P = VI cos\u03c6 (watts)."),
        ("Reactive power in an AC circuit is given by:", ["VI cos\u03c6", "VI sin\u03c6", "VI", "V/I"], 1, "Q = VI sin\u03c6 (VAR)."),
    ])


# \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Topic 7: Resonance \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
def t7_numerical():
    def f0():
        l = random.choice([0.1, 0.2, 0.5, 1, 2, 0.05])          # H
        c = random.choice([10, 20, 50, 100, 200, 5])            # \u00b5F
        f = 1 / (2 * math.pi * math.sqrt(l * c * 1e-6))
        return mcq(f"A series RLC circuit has L = {fmt(l)} H and C = {c} \u00b5F. The resonant frequency is:",
                   fmt(round(f, 2), "Hz"),
                   [fmt(round(2 * math.pi * math.sqrt(l * c * 1e-6), 4), "Hz"),
                    fmt(round(1 / math.sqrt(l * c * 1e-6), 2), "Hz"), fmt(round(f / 2, 2), "Hz")],
                   f"f\u2080 = 1/(2\u03c0\u221a(LC)) = 1/(2\u03c0\u221a({fmt(l)}\u00d7{c}\u00b5F)) = {round(f,2)} Hz.")

    def qfactor():
        r = random.randint(2, 25)
        l = random.choice([0.1, 0.2, 0.5, 1, 2])
        c = random.choice([10, 20, 50, 100])
        q = (1 / r) * math.sqrt(l / (c * 1e-6))
        return mcq(f"A series RLC circuit has R = {r} \u03a9, L = {fmt(l)} H and C = {c} \u00b5F. "
                   f"Its quality factor Q is:", fmt(round(q, 2)),
                   [fmt(round(r * math.sqrt(l / (c * 1e-6)), 2)), fmt(round(q / 2, 2)), fmt(round(1 / q, 3))],
                   f"Q = (1/R)\u221a(L/C) = (1/{r})\u221a({fmt(l)}/{c}\u00b5F) = {round(q,2)}.")

    def bandwidth():
        f = random.choice([50, 100, 500, 1000, 2000])
        q = random.choice([2, 5, 10, 20, 25, 50])
        return mcq(f"A resonant circuit has f\u2080 = {f} Hz and Q = {q}. Its bandwidth is:",
                   fmt(round(f / q, 2), "Hz"), [fmt(f * q, "Hz"), fmt(round(q / f, 4), "Hz"), fmt(f, "Hz")],
                   f"BW = f\u2080/Q = {f}/{q} = {round(f/q,2)} Hz.")

    def z_at_res():
        r = random.randint(2, 40)
        return mcq(f"At resonance, a series RLC circuit with R = {r} \u03a9 has an impedance of:",
                   fmt(r, "\u03a9"), [fmt(0, "\u03a9"), fmt(2 * r, "\u03a9"), "Infinite"],
                   f"At resonance X_L = X_C, so Z = R = {r} \u03a9 (minimum).")

    def i_at_res():
        v, r = random.choice([100, 200, 230, 50]), random.choice([2, 4, 5, 10, 20])
        return mcq(f"A series RLC circuit with R = {r} \u03a9 is driven by {v} V at resonance. "
                   f"The current is:", fmt(round(v / r, 2), "A"),
                   [fmt(0, "A"), fmt(round(v / (2 * r), 2), "A"), fmt(v * r, "A")],
                   f"At resonance Z = R, so I = V/R = {v}/{r} = {round(v/r,2)} A (maximum).")

    def halfpower():
        f = random.choice([100, 500, 1000, 2000])
        bw = random.choice([10, 20, 50, 100])
        return mcq(f"A resonant circuit has f\u2080 = {f} Hz and bandwidth {bw} Hz. The upper half-power "
                   f"frequency is approximately:", fmt(round(f + bw / 2, 2), "Hz"),
                   [fmt(round(f - bw / 2, 2), "Hz"), fmt(f + bw, "Hz"), fmt(round(f / bw, 2), "Hz")],
                   f"f\u2082 \u2248 f\u2080 + BW/2 = {f} + {bw}/2 = {round(f+bw/2,2)} Hz.")

    return batch([f0, qfactor, bandwidth, z_at_res, i_at_res, halfpower], 90)


def t7_conceptual():
    return cset([
        ("At resonance in a series RLC circuit, the impedance is:", ["Maximum", "Minimum and equal to R", "Zero", "Infinite"], 1, "X_L = X_C cancel, leaving Z = R (minimum)."),
        ("At resonance in a series RLC circuit, the current is:", ["Minimum", "Maximum", "Zero", "Infinite"], 1, "Minimum impedance gives maximum current."),
        ("At resonance, the power factor of a circuit is:", ["Zero", "Unity", "0.5", "Lagging"], 1, "V and I are in phase \u2192 pf = 1."),
        ("The condition for resonance is:", ["X_L = 2X_C", "X_L = X_C", "R = X_L", "X_C = 2X_L"], 1, "Resonance occurs when X_L = X_C."),
        ("The resonant frequency of an RLC circuit is:", ["1/(2\u03c0LC)", "1/(2\u03c0\u221a(LC))", "2\u03c0\u221a(LC)", "\u221a(LC)/2\u03c0"], 1, "f\u2080 = 1/(2\u03c0\u221a(LC))."),
        ("A series resonant circuit is also called an:", ["Rejector circuit", "Acceptor circuit", "Filter circuit", "Open circuit"], 1, "Series resonance accepts maximum current \u2192 acceptor."),
        ("A parallel resonant circuit is also called a:", ["Acceptor circuit", "Rejector circuit", "Amplifier", "Short circuit"], 1, "Parallel resonance rejects current \u2192 rejector."),
        ("At resonance in an ideal parallel RLC circuit, the impedance is:", ["Minimum", "Maximum", "Zero", "Equal to X_L"], 1, "Parallel resonance gives maximum impedance."),
        ("At resonance in an ideal parallel RLC circuit, the line current is:", ["Maximum", "Minimum", "Infinite", "Unchanged"], 1, "Maximum impedance \u2192 minimum line current."),
        ("The quality factor Q of a series RLC circuit is:", ["R\u221a(L/C)", "(1/R)\u221a(L/C)", "\u221a(LC)/R", "R/\u221a(LC)"], 1, "Q = (1/R)\u221a(L/C) = \u03c9\u2080L/R."),
        ("Bandwidth of a resonant circuit is given by:", ["f\u2080 \u00d7 Q", "f\u2080/Q", "Q/f\u2080", "1/(f\u2080Q)"], 1, "BW = f\u2080/Q."),
        ("A higher Q factor indicates:", ["Wider bandwidth", "Narrower bandwidth and sharper selectivity", "More losses", "Lower resonant frequency"], 1, "High Q \u2192 narrow BW \u2192 sharp selectivity."),
        ("The half-power frequencies are those at which the current falls to:", ["50% of maximum", "70.7% of maximum", "90% of maximum", "Zero"], 1, "At half-power points I = 0.707 I_max."),
        ("At the half-power frequencies, the power is what fraction of maximum?", ["One-quarter", "One-half", "70.7%", "One-third"], 1, "Power is half the maximum at these points."),
        ("Selectivity of a resonant circuit improves when:", ["R increases", "R decreases", "L decreases", "C increases"], 1, "Lower R \u2192 higher Q \u2192 better selectivity."),
        ("At resonance, the voltage across L and across C in a series circuit are:", ["Equal and in phase", "Equal in magnitude but opposite in phase", "Both zero", "Unequal"], 1, "V_L and V_C are equal and 180\u00b0 out of phase, cancelling."),
        ("Resonant frequency depends upon:", ["R only", "L and C", "R and L", "R and C"], 1, "f\u2080 = 1/(2\u03c0\u221a(LC)) \u2014 independent of R."),
        ("Below the resonant frequency, a series RLC circuit behaves as:", ["Inductive", "Capacitive", "Resistive", "Open"], 1, "Below f\u2080, X_C > X_L \u2192 capacitive."),
        ("Above the resonant frequency, a series RLC circuit behaves as:", ["Capacitive", "Inductive", "Resistive", "Open"], 1, "Above f\u2080, X_L > X_C \u2192 inductive."),
        ("Resonant circuits are widely used in:", ["Power transmission only", "Tuning and filtering circuits", "Rectifiers", "Grounding"], 1, "Tuned circuits select a desired frequency."),
        ("In a series resonant circuit, the voltage magnification factor equals:", ["R", "Q", "1/Q", "BW"], 1, "V_L = V_C = Q \u00d7 V_supply at resonance."),
        ("At resonance the reactive power in the circuit is:", ["Maximum", "Zero (net)", "Equal to active power", "Infinite"], 1, "Inductive and capacitive VARs cancel."),
    ])


# \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Topic 8: Three-Phase AC \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
def t8_numerical():
    def star_vl():
        vph = random.choice([100, 110, 230, 240, 200, 120])
        return mcq(f"In a balanced star-connected system, the phase voltage is {vph} V. "
                   f"The line voltage is:", fmt(round(vph * math.sqrt(3), 2), "V"),
                   [fmt(vph, "V"), fmt(round(vph / math.sqrt(3), 2), "V"), fmt(round(vph * 3, 2), "V")],
                   f"Star: V_L = \u221a3 \u00d7 V_ph = 1.732\u00d7{vph} = {round(vph*math.sqrt(3),2)} V.")

    def star_vph():
        vl = random.choice([400, 415, 440, 380, 200])
        return mcq(f"In a balanced star-connected system, the line voltage is {vl} V. "
                   f"The phase voltage is:", fmt(round(vl / math.sqrt(3), 2), "V"),
                   [fmt(vl, "V"), fmt(round(vl * math.sqrt(3), 2), "V"), fmt(round(vl / 3, 2), "V")],
                   f"Star: V_ph = V_L/\u221a3 = {vl}/1.732 = {round(vl/math.sqrt(3),2)} V.")

    def delta_il():
        iph = random.choice([5, 10, 15, 20, 8, 12])
        return mcq(f"In a balanced delta-connected system, the phase current is {iph} A. "
                   f"The line current is:", fmt(round(iph * math.sqrt(3), 2), "A"),
                   [fmt(iph, "A"), fmt(round(iph / math.sqrt(3), 2), "A"), fmt(3 * iph, "A")],
                   f"Delta: I_L = \u221a3 \u00d7 I_ph = 1.732\u00d7{iph} = {round(iph*math.sqrt(3),2)} A.")

    def delta_iph():
        il = random.choice([10, 17.32, 20, 30, 25])
        return mcq(f"In a balanced delta-connected system, the line current is {fmt(il)} A. "
                   f"The phase current is:", fmt(round(il / math.sqrt(3), 2), "A"),
                   [fmt(il, "A"), fmt(round(il * math.sqrt(3), 2), "A"), fmt(round(il / 3, 2), "A")],
                   f"Delta: I_ph = I_L/\u221a3 = {fmt(il)}/1.732 = {round(il/math.sqrt(3),2)} A.")

    def power3ph():
        vl = random.choice([400, 415, 440])
        il = random.choice([5, 10, 15, 20])
        pf = random.choice([0.8, 0.9, 1.0, 0.85])
        p = math.sqrt(3) * vl * il * pf
        return mcq(f"A balanced three-phase load draws {il} A at {vl} V (line) with a power factor "
                   f"of {pf}. The total active power is:", fmt(round(p, 2), "W"),
                   [fmt(round(vl * il * pf, 2), "W"), fmt(round(3 * vl * il * pf, 2), "W"),
                    fmt(round(p / 3, 2), "W")],
                   f"P = \u221a3\u00b7V_L\u00b7I_L\u00b7cos\u03c6 = 1.732\u00d7{vl}\u00d7{il}\u00d7{pf} = {round(p,2)} W.")

    def wattmeter():
        w1, w2 = random.choice([1000, 1500, 2000, 800]), random.choice([500, 600, 400, 1000])
        return mcq(f"In the two-wattmeter method, the readings are W\u2081 = {w1} W and W\u2082 = {w2} W. "
                   f"The total three-phase power is:", fmt(w1 + w2, "W"),
                   [fmt(abs(w1 - w2), "W"), fmt(round((w1 + w2) / 3, 2), "W"),
                    fmt(round(math.sqrt(3) * (w1 + w2), 2), "W")],
                   f"Total power = W\u2081 + W\u2082 = {w1} + {w2} = {w1+w2} W.")

    def star_phase_i():
        vph, r = random.choice([230, 240, 200]), random.choice([10, 20, 25, 50])
        return mcq(f"A balanced star-connected load of {r} \u03a9 per phase has a phase voltage of {vph} V. "
                   f"The phase current is:", fmt(round(vph / r, 2), "A"),
                   [fmt(round(vph * math.sqrt(3) / r, 2), "A"), fmt(round(vph / (r * math.sqrt(3)), 2), "A"),
                    fmt(round(vph / (3 * r), 2), "A")],
                   f"I_ph = V_ph/R = {vph}/{r} = {round(vph/r,2)} A (in star, I_L = I_ph).")

    return batch([star_vl, star_vph, delta_il, delta_iph, power3ph, wattmeter, star_phase_i], 90)


def t8_conceptual():
    return cset([
        ("In a balanced star connection, the line current equals the:", ["\u221a3 \u00d7 phase current", "Phase current", "Phase current/\u221a3", "3 \u00d7 phase current"], 1, "Star: I_L = I_ph."),
        ("In a balanced delta connection, the line voltage equals the:", ["\u221a3 \u00d7 phase voltage", "Phase voltage", "Phase voltage/\u221a3", "3 \u00d7 phase voltage"], 1, "Delta: V_L = V_ph."),
        ("In a balanced star connection, the line voltage is:", ["Equal to phase voltage", "\u221a3 times the phase voltage", "Phase voltage/\u221a3", "3 times the phase voltage"], 1, "Star: V_L = \u221a3 V_ph."),
        ("In a balanced delta connection, the line current is:", ["Equal to phase current", "\u221a3 times the phase current", "Phase current/\u221a3", "3 times the phase current"], 1, "Delta: I_L = \u221a3 I_ph."),
        ("In a balanced star-connected system, the neutral current is:", ["Maximum", "Zero", "Equal to line current", "\u221a3 times phase current"], 1, "Balanced phasors sum to zero \u2192 no neutral current."),
        ("The phase difference between the phases of a three-phase supply is:", ["90\u00b0", "120\u00b0", "180\u00b0", "60\u00b0"], 1, "Three-phase voltages are 120\u00b0 apart."),
        ("The total power in a balanced three-phase circuit is:", ["V_L I_L cos\u03c6", "\u221a3 V_L I_L cos\u03c6", "3 V_L I_L cos\u03c6", "V_L I_L"], 1, "P = \u221a3 V_L I_L cos\u03c6."),
        ("The two-wattmeter method can measure power in:", ["Balanced loads only", "Both balanced and unbalanced three-phase loads", "Single-phase loads only", "DC circuits"], 1, "It works for balanced and unbalanced 3-\u03c6 loads."),
        ("In the two-wattmeter method, at unity power factor the two readings are:", ["Equal", "Opposite", "One is zero", "Both zero"], 0, "At pf = 1 both wattmeters read equally."),
        ("In the two-wattmeter method, one wattmeter reads zero when the power factor is:", ["1.0", "0.5", "0.866", "0"], 1, "At pf = 0.5 one wattmeter reads zero."),
        ("A three-phase system requires how many wattmeters by Blondel's theorem for a 3-wire system?", ["One", "Two", "Three", "Four"], 1, "3-wire system needs (3\u22121) = 2 wattmeters."),
        ("An advantage of a three-phase system over single-phase is:", ["Lower power", "Constant instantaneous power", "More conductors needed", "Higher losses"], 1, "Total instantaneous power in 3-\u03c6 is constant."),
        ("Three-phase induction motors are:", ["Not self-starting", "Self-starting", "Only used as generators", "DC machines"], 1, "3-\u03c6 produces a rotating field \u2192 self-starting."),
        ("For the same power transfer, a three-phase system compared with single-phase requires:", ["More conductor material", "Less conductor material", "The same", "Twice as much"], 1, "3-\u03c6 transmission uses less copper for the same power."),
        ("The phase sequence RYB means the phases reach their maxima in the order:", ["R, B, Y", "R, Y, B", "Y, R, B", "B, Y, R"], 1, "Phase sequence RYB = R then Y then B."),
        ("An unbalanced star load with no neutral wire causes:", ["Equal phase voltages", "Shift of the star (neutral) point", "Zero current", "Unity power factor"], 1, "Without a neutral, the star point shifts."),
        ("In a three-phase four-wire system, the fourth wire is the:", ["Earth", "Neutral", "Phase", "Shield"], 1, "The fourth conductor is the neutral."),
        ("For a balanced three-phase load, the sum of the three phase currents is:", ["Maximum", "Zero", "\u221a3 I_ph", "3 I_ph"], 1, "Balanced currents 120\u00b0 apart sum to zero."),
        ("Reactive power in a balanced three-phase circuit is:", ["\u221a3 V_L I_L cos\u03c6", "\u221a3 V_L I_L sin\u03c6", "V_L I_L sin\u03c6", "3 V_L I_L"], 1, "Q = \u221a3 V_L I_L sin\u03c6."),
        ("Apparent power in a balanced three-phase circuit is:", ["\u221a3 V_L I_L", "V_L I_L", "3 V_L I_L cos\u03c6", "\u221a3 V_L I_L cos\u03c6"], 0, "S = \u221a3 V_L I_L (VA)."),
        ("Star-connected loads are preferred when the required phase voltage is:", ["Higher than line voltage", "Lower than line voltage", "Equal to line voltage", "Zero"], 1, "In star, V_ph = V_L/\u221a3 (lower)."),
        ("Delta connection has no:", ["Phase current", "Neutral point", "Line voltage", "Power"], 1, "A delta connection provides no neutral."),
    ])


# \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Topic 9: Diode Circuits \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
def t9_numerical():
    def hw_dc():
        vm = random.randint(20, 340)
        return mcq(f"A half-wave rectifier has a peak input of {vm} V. The average (DC) output voltage is:",
                   fmt(round(vm / math.pi, 2), "V"),
                   [fmt(round(2 * vm / math.pi, 2), "V"), fmt(round(vm / 2, 2), "V"),
                    fmt(round(vm / math.sqrt(2), 2), "V")],
                   f"Half-wave: V_dc = V_m/\u03c0 = {vm}/3.1416 = {round(vm/math.pi,2)} V.")

    def fw_dc():
        vm = random.randint(20, 340)
        return mcq(f"A full-wave rectifier has a peak input of {vm} V. The average (DC) output voltage is:",
                   fmt(round(2 * vm / math.pi, 2), "V"),
                   [fmt(round(vm / math.pi, 2), "V"), fmt(round(vm / 2, 2), "V"),
                    fmt(round(vm / math.sqrt(2), 2), "V")],
                   f"Full-wave: V_dc = 2V_m/\u03c0 = 2\u00d7{vm}/3.1416 = {round(2*vm/math.pi,2)} V.")

    def hw_rms():
        vm = random.randint(20, 340)
        return mcq(f"A half-wave rectifier has a peak output of {vm} V. The RMS output voltage is:",
                   fmt(round(vm / 2, 2), "V"),
                   [fmt(round(vm / math.sqrt(2), 2), "V"), fmt(round(vm / math.pi, 2), "V"), fmt(vm, "V")],
                   f"Half-wave RMS = V_m/2 = {vm}/2 = {round(vm/2,2)} V.")

    def fw_rms():
        vm = random.randint(20, 340)
        return mcq(f"A full-wave rectifier has a peak output of {vm} V. The RMS output voltage is:",
                   fmt(round(vm / math.sqrt(2), 2), "V"),
                   [fmt(round(vm / 2, 2), "V"), fmt(round(2 * vm / math.pi, 2), "V"), fmt(vm, "V")],
                   f"Full-wave RMS = V_m/\u221a2 = {vm}/1.414 = {round(vm/math.sqrt(2),2)} V.")

    def piv_ct():
        vm = random.randint(20, 340)
        return mcq(f"In a centre-tapped full-wave rectifier with a peak secondary (half-winding) voltage "
                   f"of {vm} V, the PIV of each diode is:", fmt(2 * vm, "V"),
                   [fmt(vm, "V"), fmt(round(vm / 2, 2), "V"), fmt(round(vm * math.sqrt(2), 2), "V")],
                   f"Centre-tapped rectifier: PIV = 2V_m = 2\u00d7{vm} = {2*vm} V.")

    def piv_bridge():
        vm = random.randint(20, 340)
        return mcq(f"In a bridge rectifier with a peak input of {vm} V, the PIV of each diode is:",
                   fmt(vm, "V"), [fmt(2 * vm, "V"), fmt(round(vm / 2, 2), "V"), fmt(round(vm / math.pi, 2), "V")],
                   f"Bridge rectifier: PIV = V_m = {vm} V (half that of a centre-tapped circuit).")

    def diode_drop():
        vs = random.choice([5, 9, 10, 12, 15])
        r = random.choice([100, 200, 500, 1000])
        i = (vs - 0.7) / r * 1000
        return mcq(f"A silicon diode (V_\u03b3 = 0.7 V) is in series with {r} \u03a9 across {vs} V DC. "
                   f"The circuit current is:", fmt(round(i, 2), "mA"),
                   [fmt(round(vs / r * 1000, 2), "mA"), fmt(round((vs + 0.7) / r * 1000, 2), "mA"),
                    fmt(round((vs - 0.3) / r * 1000, 2), "mA")],
                   f"I = (V\u2212V_\u03b3)/R = ({vs}\u22120.7)/{r} = {round(i,2)} mA.")

    return batch([hw_dc, fw_dc, hw_rms, fw_rms, piv_ct, piv_bridge, diode_drop], 90)


def t9_conceptual():
    return cset([
        ("The ripple factor of a half-wave rectifier is approximately:", ["0.48", "1.21", "0.81", "0.5"], 1, "Half-wave ripple factor \u2248 1.21."),
        ("The ripple factor of a full-wave rectifier is approximately:", ["1.21", "0.48", "0.81", "1.11"], 1, "Full-wave ripple factor \u2248 0.48."),
        ("The maximum theoretical efficiency of a half-wave rectifier is:", ["81.2%", "40.6%", "50%", "100%"], 1, "Half-wave rectifier efficiency \u2248 40.6%."),
        ("The maximum theoretical efficiency of a full-wave rectifier is:", ["40.6%", "81.2%", "100%", "50%"], 1, "Full-wave rectifier efficiency \u2248 81.2%."),
        ("The output frequency of a half-wave rectifier fed from 50 Hz is:", ["25 Hz", "50 Hz", "100 Hz", "150 Hz"], 1, "Half-wave output ripple frequency = supply frequency."),
        ("The output ripple frequency of a full-wave rectifier fed from 50 Hz is:", ["50 Hz", "100 Hz", "25 Hz", "200 Hz"], 1, "Full-wave ripple frequency = 2\u00d7 supply = 100 Hz."),
        ("A bridge rectifier uses how many diodes?", ["One", "Two", "Four", "Six"], 2, "A bridge rectifier uses four diodes."),
        ("A centre-tapped full-wave rectifier uses how many diodes?", ["One", "Two", "Four", "Three"], 1, "Centre-tapped full-wave uses two diodes."),
        ("PIV stands for:", ["Peak Internal Voltage", "Peak Inverse Voltage", "Positive Input Voltage", "Peak Instant Value"], 1, "PIV = Peak Inverse Voltage."),
        ("A clipper circuit is used to:", ["Shift the DC level", "Limit (remove) part of a waveform", "Amplify a signal", "Rectify fully"], 1, "Clippers clip off part of the waveform."),
        ("A clamper circuit is used to:", ["Remove part of a waveform", "Shift the DC level of a waveform", "Rectify", "Filter ripple"], 1, "A clamper shifts the DC level."),
        ("A clamper circuit essentially requires a:", ["Resistor only", "Capacitor and a diode", "Inductor", "Transformer"], 1, "Clampers use a capacitor with a diode."),
        ("The barrier (knee) potential of a silicon diode is about:", ["0.3 V", "0.7 V", "1.2 V", "0 V"], 1, "Silicon diode knee voltage \u2248 0.7 V."),
        ("The barrier potential of a germanium diode is about:", ["0.7 V", "0.3 V", "1.1 V", "0.5 V"], 1, "Germanium diode knee voltage \u2248 0.3 V."),
        ("A diode conducts when it is:", ["Reverse biased", "Forward biased beyond the knee voltage", "Unbiased", "At breakdown only"], 1, "Conduction begins past the knee in forward bias."),
        ("In reverse bias, the diode current is:", ["Large", "A very small leakage current", "Zero exactly", "Equal to forward current"], 1, "Only a small reverse saturation (leakage) current flows."),
        ("A Zener diode is normally operated in the:", ["Forward region", "Reverse breakdown region", "Cut-off region", "Saturation region"], 1, "A Zener works in reverse breakdown for regulation."),
        ("A Zener diode is mainly used as a:", ["Rectifier", "Voltage regulator", "Amplifier", "Oscillator"], 1, "Zener diodes regulate voltage."),
        ("A filter capacitor placed after a rectifier serves to:", ["Increase ripple", "Reduce ripple and smooth output", "Rectify", "Increase frequency"], 1, "A shunt capacitor smooths the output."),
        ("The transformer utilisation factor is better in a:", ["Half-wave rectifier", "Bridge rectifier", "Clamper", "Clipper"], 1, "A bridge rectifier uses the transformer more effectively."),
        ("An ideal diode behaves as a short circuit when:", ["Reverse biased", "Forward biased", "Unbiased", "At breakdown"], 1, "Ideal diode: short in forward bias, open in reverse."),
        ("Rectification is the conversion of:", ["DC to AC", "AC to DC", "AC to AC", "DC to DC"], 1, "A rectifier converts AC into DC."),
    ])


# \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Topic 10: Two-Port Networks \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
def t10_numerical():
    def z_t_network():
        z1, z2, z3 = random.randint(2, 20), random.randint(2, 20), random.randint(2, 20)
        return mcq(f"A T-network has a series arm {z1} \u03a9 at port 1, a shunt arm {z3} \u03a9, and a series "
                   f"arm {z2} \u03a9 at port 2. The parameter Z\u2081\u2081 is:", fmt(z1 + z3, "\u03a9"),
                   [fmt(z3, "\u03a9"), fmt(z1 + z2, "\u03a9"), fmt(z1 + z2 + z3, "\u03a9")],
                   f"Z\u2081\u2081 = (input series + shunt) = {z1} + {z3} = {z1+z3} \u03a9 (port 2 open).")

    def z12_t():
        z3 = random.randint(2, 25)
        return mcq(f"In a T-network whose shunt (common) arm is {z3} \u03a9, the transfer parameter Z\u2081\u2082 is:",
                   fmt(z3, "\u03a9"), [fmt(2 * z3, "\u03a9"), fmt(0, "\u03a9"), fmt(round(z3 / 2, 2), "\u03a9")],
                   f"Z\u2081\u2082 = Z\u2082\u2081 = shunt (common) arm = {z3} \u03a9.")

    def abcd_recip():
        a, b, c = random.randint(2, 6), random.randint(1, 5), random.randint(1, 4)
        d = (1 + b * c) / a
        return mcq(f"A reciprocal two-port network has A = {a}, B = {b} and C = {c}. "
                   f"The parameter D is:", fmt(round(d, 3)),
                   [fmt(round(a * b * c, 3)), fmt(round(a, 3)), fmt(round(b * c, 3))],
                   f"Reciprocity: AD \u2212 BC = 1 \u21d2 D = (1 + BC)/A = (1+{b}\u00d7{c})/{a} = {round(d,3)}.")

    def y_from_z():
        z = random.randint(2, 20)
        return mcq(f"A two-port network has Z\u2081\u2081 = Z\u2082\u2082 = {z} \u03a9 and Z\u2081\u2082 = Z\u2082\u2081 = 0. "
                   f"The parameter Y\u2081\u2081 is:", fmt(round(1 / z, 3), "S"),
                   [fmt(z, "S"), fmt(round(z / 2, 2), "S"), fmt(0, "S")],
                   f"With Z\u2081\u2082 = 0 the ports decouple, so Y\u2081\u2081 = 1/Z\u2081\u2081 = 1/{z} = {round(1/z,3)} S.")

    def pi_network():
        y = random.randint(2, 15)
        return mcq(f"In a \u03c0-network, the common shunt admittance between the ports is {y} S. "
                   f"The parameter Y\u2081\u2082 is:", fmt(-y, "S"),
                   [fmt(y, "S"), fmt(0, "S"), fmt(round(1 / y, 3), "S")],
                   f"Y\u2081\u2082 = Y\u2082\u2081 = \u2212(common branch admittance) = \u2212{y} S.")

    return batch([z_t_network, z12_t, abcd_recip, y_from_z, pi_network], 90)


def t10_conceptual():
    return cset([
        ("A two-port network has how many pairs of terminals?", ["One", "Two", "Three", "Four"], 1, "Two ports = two terminal pairs (four terminals)."),
        ("Z-parameters are also called:", ["Admittance parameters", "Open-circuit impedance parameters", "Hybrid parameters", "Transmission parameters"], 1, "Z-parameters are found with ports open-circuited."),
        ("Y-parameters are also called:", ["Open-circuit parameters", "Short-circuit admittance parameters", "ABCD parameters", "Hybrid parameters"], 1, "Y-parameters are found with ports short-circuited."),
        ("The condition for reciprocity in terms of Z-parameters is:", ["Z\u2081\u2081 = Z\u2082\u2082", "Z\u2081\u2082 = Z\u2082\u2081", "Z\u2081\u2081 = Z\u2081\u2082", "Z\u2081\u2082 = 0"], 1, "Reciprocal \u21d2 Z\u2081\u2082 = Z\u2082\u2081."),
        ("The condition for symmetry in terms of Z-parameters is:", ["Z\u2081\u2082 = Z\u2082\u2081", "Z\u2081\u2081 = Z\u2082\u2082", "Z\u2081\u2081 = Z\u2081\u2082", "Z\u2082\u2082 = 0"], 1, "Symmetrical \u21d2 Z\u2081\u2081 = Z\u2082\u2082."),
        ("The condition for reciprocity in terms of Y-parameters is:", ["Y\u2081\u2081 = Y\u2082\u2082", "Y\u2081\u2082 = Y\u2082\u2081", "Y\u2081\u2081 = Y\u2081\u2082", "Y\u2082\u2081 = 0"], 1, "Reciprocal \u21d2 Y\u2081\u2082 = Y\u2082\u2081."),
        ("The condition for reciprocity in terms of ABCD parameters is:", ["A = D", "AD \u2212 BC = 1", "AB = CD", "A + D = 1"], 1, "Reciprocal \u21d2 AD \u2212 BC = 1."),
        ("The condition for symmetry in terms of ABCD parameters is:", ["AD \u2212 BC = 1", "A = D", "B = C", "A = B"], 1, "Symmetrical \u21d2 A = D."),
        ("The condition for reciprocity in terms of h-parameters is:", ["h\u2081\u2082 = h\u2082\u2081", "h\u2081\u2082 = \u2212h\u2082\u2081", "h\u2081\u2081 = h\u2082\u2082", "h\u2081\u2081h\u2082\u2082 = 1"], 1, "Reciprocal \u21d2 h\u2081\u2082 = \u2212h\u2082\u2081."),
        ("ABCD parameters are also known as:", ["Hybrid parameters", "Transmission parameters", "Impedance parameters", "Admittance parameters"], 1, "ABCD = transmission (chain) parameters."),
        ("Hybrid (h) parameters are most useful for analysing:", ["Transmission lines", "Transistor circuits", "Power systems", "Filters"], 1, "h-parameters are standard for BJT modelling."),
        ("The h-parameter h\u2081\u2081 has the unit of:", ["Siemens", "Ohm", "Dimensionless", "Farad"], 1, "h\u2081\u2081 is an input impedance (ohms)."),
        ("The h-parameter h\u2082\u2082 has the unit of:", ["Ohm", "Siemens", "Dimensionless", "Henry"], 1, "h\u2082\u2082 is an output admittance (siemens)."),
        ("The h-parameters h\u2081\u2082 and h\u2082\u2081 are:", ["Both in ohms", "Dimensionless ratios", "Both in siemens", "In farads"], 1, "They are voltage and current ratios (unitless)."),
        ("The Y-parameter matrix is the inverse of the:", ["h-matrix", "Z-matrix", "ABCD matrix", "S-matrix"], 1, "[Y] = [Z]\u207b\u00b9."),
        ("For a two-port network to be reciprocal it must contain no:", ["Resistors", "Dependent sources", "Capacitors", "Inductors"], 1, "Dependent (active) sources destroy reciprocity."),
        ("Cascade (series) connection of two-port networks is most easily handled with:", ["Z-parameters", "ABCD parameters", "Y-parameters", "h-parameters"], 1, "Cascaded networks multiply their ABCD matrices."),
        ("Series connection of two two-port networks is best handled with:", ["Y-parameters", "Z-parameters", "ABCD parameters", "S-parameters"], 1, "Series connection \u2192 Z-matrices add."),
        ("Parallel connection of two two-port networks is best handled with:", ["Z-parameters", "Y-parameters", "ABCD parameters", "h-parameters"], 1, "Parallel connection \u2192 Y-matrices add."),
        ("In the ABCD representation, parameter B has units of:", ["Siemens", "Ohm", "Dimensionless", "Henry"], 1, "B is a transfer impedance (ohms)."),
        ("In the ABCD representation, parameter C has units of:", ["Ohm", "Siemens", "Dimensionless", "Farad"], 1, "C is a transfer admittance (siemens)."),
        ("A two-port network with only passive bilateral elements is always:", ["Non-reciprocal", "Reciprocal", "Symmetrical", "Active"], 1, "Passive bilateral networks are reciprocal."),
    ])


# \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Topic 11: BJT \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
def t11_numerical():
    def alpha_from_beta():
        b = random.choice([49, 50, 99, 100, 199, 200, 24, 80, 150])
        a = b / (b + 1)
        return mcq(f"A transistor has \u03b2 = {b}. Its \u03b1 is:", fmt(round(a, 4)),
                   [fmt(round((b + 1) / b, 4)), fmt(round(1 / b, 4)), fmt(round(b / (b - 1), 4))],
                   f"\u03b1 = \u03b2/(\u03b2+1) = {b}/{b+1} = {round(a,4)}.")

    def beta_from_alpha():
        a = random.choice([0.95, 0.98, 0.99, 0.96, 0.90, 0.992])
        b = a / (1 - a)
        return mcq(f"A transistor has \u03b1 = {a}. Its \u03b2 is:", fmt(round(b, 2)),
                   [fmt(round((1 - a) / a, 4)), fmt(round(1 / a, 4)), fmt(round(a * 100, 2))],
                   f"\u03b2 = \u03b1/(1\u2212\u03b1) = {a}/{round(1-a,4)} = {round(b,2)}.")

    def ie_from_ib_alpha():
        ib = random.choice([20, 30, 40, 50, 25])          # \u00b5A
        a = random.choice([0.98, 0.99, 0.95, 0.96])
        ie = ib * 1e-6 / (1 - a) * 1000                    # mA
        return mcq(f"For a BJT with I_B = {ib} \u00b5A and \u03b1 = {a}, the emitter current I_E is:",
                   fmt(round(ie, 3), "mA"),
                   [fmt(round(ib * a / 1000, 3), "mA"), fmt(round(ib / 1000, 3), "mA"),
                    fmt(round(ie / 2, 3), "mA")],
                   f"I_B = (1\u2212\u03b1)I_E \u21d2 I_E = I_B/(1\u2212\u03b1) = {ib}\u00b5A/{round(1-a,3)} = {round(ie,3)} mA.")

    def ic_from_beta_ib():
        b = random.choice([50, 100, 150, 200, 80])
        ib = random.choice([10, 20, 30, 40, 50])          # \u00b5A
        ic = b * ib / 1000                                 # mA
        return mcq(f"A transistor with \u03b2 = {b} has a base current of {ib} \u00b5A. "
                   f"The collector current is:", fmt(round(ic, 3), "mA"),
                   [fmt(round(ib / b, 4), "mA"), fmt(round(ib / 1000, 3), "mA"),
                    fmt(round(ic * 2, 3), "mA")],
                   f"I_C = \u03b2\u00b7I_B = {b}\u00d7{ib}\u00b5A = {round(ic,3)} mA.")

    def ie_sum():
        ic = random.choice([1, 2, 4, 5, 10])              # mA
        ib = random.choice([10, 20, 40, 50])              # \u00b5A
        ie = ic + ib / 1000
        return mcq(f"A transistor has I_C = {ic} mA and I_B = {ib} \u00b5A. The emitter current is:",
                   fmt(round(ie, 3), "mA"),
                   [fmt(round(ic - ib / 1000, 3), "mA"), fmt(ic, "mA"), fmt(round(ib / 1000, 3), "mA")],
                   f"I_E = I_C + I_B = {ic} mA + {ib} \u00b5A = {round(ie,3)} mA.")

    def ic_from_alpha_ie():
        a = random.choice([0.95, 0.98, 0.99, 0.97])
        ie = random.choice([1, 2, 5, 10, 4])              # mA
        return mcq(f"A transistor has \u03b1 = {a} and I_E = {ie} mA. The collector current is:",
                   fmt(round(a * ie, 3), "mA"),
                   [fmt(round(ie / a, 3), "mA"), fmt(round((1 - a) * ie, 3), "mA"), fmt(ie, "mA")],
                   f"I_C = \u03b1\u00b7I_E = {a}\u00d7{ie} = {round(a*ie,3)} mA.")

    def vce_calc():
        vcc = random.choice([10, 12, 15, 20])
        ic = random.choice([1, 2, 4, 5])                   # mA
        rc = random.choice([1, 2, 2.2, 3])                 # k\u03a9
        vce = vcc - ic * rc
        if vce <= 0:
            vcc, ic, rc = 20, 2, 2
            vce = vcc - ic * rc
        return mcq(f"In a common-emitter circuit, V_CC = {vcc} V, I_C = {ic} mA and R_C = {fmt(rc)} k\u03a9. "
                   f"The collector-emitter voltage V_CE is:", fmt(round(vce, 2), "V"),
                   [fmt(round(vcc + ic * rc, 2), "V"), fmt(vcc, "V"), fmt(round(ic * rc, 2), "V")],
                   f"V_CE = V_CC \u2212 I_C R_C = {vcc} \u2212 {ic}\u00d7{fmt(rc)} = {round(vce,2)} V.")

    return batch([alpha_from_beta, beta_from_alpha, ie_from_ib_alpha, ic_from_beta_ib,
                  ie_sum, ic_from_alpha_ie, vce_calc], 90)


def t11_conceptual():
    return cset([
        ("A BJT has how many pn junctions?", ["One", "Two", "Three", "Four"], 1, "A BJT has two junctions (emitter-base, collector-base)."),
        ("For a transistor to work in the active region, the emitter junction is:", ["Reverse biased", "Forward biased", "Unbiased", "At breakdown"], 1, "Active region: EB forward, CB reverse biased."),
        ("For active-region operation, the collector junction must be:", ["Forward biased", "Reverse biased", "Unbiased", "Shorted"], 1, "The collector-base junction is reverse biased."),
        ("In the saturation region, both junctions of a BJT are:", ["Reverse biased", "Forward biased", "Unbiased", "Open"], 1, "Saturation: both junctions forward biased."),
        ("In the cut-off region, both junctions of a BJT are:", ["Forward biased", "Reverse biased", "One of each", "Shorted"], 1, "Cut-off: both junctions reverse biased."),
        ("The relation between \u03b1 and \u03b2 is:", ["\u03b1 = \u03b2(1+\u03b2)", "\u03b1 = \u03b2/(1+\u03b2)", "\u03b1 = (1+\u03b2)/\u03b2", "\u03b1 = 1/\u03b2"], 1, "\u03b1 = \u03b2/(\u03b2+1)."),
        ("The relation for \u03b2 in terms of \u03b1 is:", ["\u03b2 = \u03b1(1\u2212\u03b1)", "\u03b2 = \u03b1/(1\u2212\u03b1)", "\u03b2 = (1\u2212\u03b1)/\u03b1", "\u03b2 = 1/\u03b1"], 1, "\u03b2 = \u03b1/(1\u2212\u03b1)."),
        ("The emitter current of a BJT equals:", ["I_C \u2212 I_B", "I_C + I_B", "I_C \u00d7 I_B", "I_B \u2212 I_C"], 1, "I_E = I_C + I_B."),
        ("The value of \u03b1 for a typical transistor is:", ["Greater than 1", "Slightly less than 1", "Exactly 1", "Zero"], 1, "\u03b1 is typically 0.95\u20130.99."),
        ("Which transistor configuration has the highest current gain?", ["Common base", "Common emitter", "Common collector", "All equal"], 1, "CE has high current gain (\u03b2)."),
        ("Which transistor configuration has a current gain of less than unity?", ["Common emitter", "Common base", "Common collector", "None"], 1, "CB current gain \u03b1 < 1."),
        ("Which configuration is used as a buffer / impedance matcher?", ["Common emitter", "Common collector (emitter follower)", "Common base", "Cascode"], 1, "Emitter follower: high Z_in, low Z_out, gain \u2248 1."),
        ("The common-emitter amplifier produces a phase shift of:", ["0\u00b0", "180\u00b0", "90\u00b0", "45\u00b0"], 1, "CE output is inverted (180\u00b0)."),
        ("The common-collector configuration has a voltage gain of approximately:", ["100", "Unity", "Zero", "10"], 1, "Emitter follower voltage gain \u2248 1."),
        ("In a BJT, the most heavily doped region is the:", ["Base", "Emitter", "Collector", "All equal"], 1, "The emitter is the most heavily doped."),
        ("In a BJT, the thinnest and most lightly doped region is the:", ["Emitter", "Base", "Collector", "Substrate"], 1, "The base is thin and lightly doped."),
        ("The physically largest region of a BJT (for heat dissipation) is the:", ["Emitter", "Base", "Collector", "Gate"], 2, "The collector is largest to dissipate heat."),
        ("A BJT is a:", ["Voltage-controlled device", "Current-controlled device", "Unipolar device", "Passive device"], 1, "BJT output current is controlled by base current."),
        ("For a transistor to work as an amplifier, it must operate in the:", ["Saturation region", "Active region", "Cut-off region", "Breakdown region"], 1, "Linear amplification requires the active region."),
        ("For a transistor used as a switch, the two states are:", ["Active and saturation", "Cut-off and saturation", "Active and cut-off", "Breakdown and active"], 1, "Switching uses cut-off (OFF) and saturation (ON)."),
        ("The DC load line is drawn between which two points?", ["Two active points", "Cut-off and saturation points", "Two saturation points", "Origin and Q-point"], 1, "The load line joins the cut-off and saturation points."),
        ("The operating (quiescent) point of a transistor is called the:", ["Load point", "Q-point", "Knee point", "Cut-off point"], 1, "The DC operating point is the Q-point."),
        ("Which current in a BJT is the smallest?", ["Emitter current", "Base current", "Collector current", "All equal"], 1, "The base current is the smallest."),
        ("Thermal runaway in a BJT is prevented by:", ["Increasing V_CC", "Proper biasing and stabilisation", "Removing R_C", "Using higher \u03b2"], 1, "Stabilised bias (e.g. emitter resistor) prevents runaway."),
    ])


# \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Topic 12: Operational Amplifiers \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
def t12_numerical():
    def inv_gain():
        rf, r1 = random.randint(10, 200), random.randint(1, 20)
        return mcq(f"An inverting amplifier has R_f = {rf} k\u03a9 and R\u2081 = {r1} k\u03a9. Its voltage gain is:",
                   fmt(-rf / r1), [fmt(rf / r1), fmt(1 + rf / r1), fmt(round(-r1 / rf, 3))],
                   f"Inverting gain = \u2212R_f/R\u2081 = \u2212{rf}/{r1} = {fmt(-rf/r1)}.")

    def noninv_gain():
        rf, r1 = random.randint(10, 200), random.randint(1, 20)
        return mcq(f"A non-inverting amplifier has R_f = {rf} k\u03a9 and R\u2081 = {r1} k\u03a9. Its voltage gain is:",
                   fmt(1 + rf / r1), [fmt(rf / r1), fmt(-rf / r1), fmt(round(1 + r1 / rf, 3))],
                   f"Non-inverting gain = 1 + R_f/R\u2081 = 1 + {rf}/{r1} = {fmt(1+rf/r1)}.")

    def inv_vout():
        rf, r1 = random.choice([100, 50, 200, 150]), random.choice([10, 20, 25, 5])
        vin = random.choice([0.1, 0.2, 0.5, 1, 0.05])
        vo = -(rf / r1) * vin
        return mcq(f"An inverting amplifier (R_f = {rf} k\u03a9, R\u2081 = {r1} k\u03a9) has an input of {fmt(vin)} V. "
                   f"The output voltage is:", fmt(round(vo, 3), "V"),
                   [fmt(round(-vo, 3), "V"), fmt(round(vo / 2, 3), "V"), fmt(vin, "V")],
                   f"V_o = \u2212(R_f/R\u2081)\u00b7V_in = \u2212({rf}/{r1})\u00d7{fmt(vin)} = {round(vo,3)} V.")

    def noninv_vout():
        rf, r1 = random.choice([90, 100, 180, 50]), random.choice([10, 20, 25])
        vin = random.choice([0.1, 0.2, 0.5, 1])
        vo = (1 + rf / r1) * vin
        return mcq(f"A non-inverting amplifier (R_f = {rf} k\u03a9, R\u2081 = {r1} k\u03a9) has an input of "
                   f"{fmt(vin)} V. The output voltage is:", fmt(round(vo, 3), "V"),
                   [fmt(round(-(rf / r1) * vin, 3), "V"), fmt(round((rf / r1) * vin, 3), "V"),
                    fmt(vin, "V")],
                   f"V_o = (1 + R_f/R\u2081)\u00b7V_in = (1+{rf}/{r1})\u00d7{fmt(vin)} = {round(vo,3)} V.")

    def summing():
        rf = random.choice([10, 20, 50, 100])
        r = random.choice([10, 20, 5])
        v1, v2 = random.choice([1, 2, 3]), random.choice([1, 2, 4])
        vo = -(rf / r) * (v1 + v2)
        return mcq(f"A summing amplifier has R_f = {rf} k\u03a9 and two equal input resistors of {r} k\u03a9 "
                   f"with inputs {v1} V and {v2} V. The output is:", fmt(round(vo, 3), "V"),
                   [fmt(round(-vo, 3), "V"), fmt(round(-(rf / r) * v1, 3), "V"),
                    fmt(round(v1 + v2, 3), "V")],
                   f"V_o = \u2212(R_f/R)(V\u2081+V\u2082) = \u2212({rf}/{r})({v1}+{v2}) = {round(vo,3)} V.")

    def diff_amp():
        v1, v2 = random.randint(1, 9), random.randint(1, 9)
        g = random.choice([1, 2, 5, 10])
        vo = g * (v2 - v1)
        return mcq(f"A difference amplifier with a gain of {g} has inputs V\u2081 = {v1} V (inverting) and "
                   f"V\u2082 = {v2} V (non-inverting). The output is:", fmt(vo, "V"),
                   [fmt(g * (v1 + v2), "V"), fmt(g * (v1 - v2), "V"), fmt(v2 - v1, "V")],
                   f"V_o = A(V\u2082 \u2212 V\u2081) = {g}\u00d7({v2}\u2212{v1}) = {vo} V.")

    def cmrr():
        ad = random.choice([100, 1000, 500, 2000])
        ac = random.choice([0.1, 0.5, 1, 0.01])
        db = 20 * math.log10(ad / ac)
        return mcq(f"An op-amp has a differential gain of {ad} and a common-mode gain of {fmt(ac)}. "
                   f"Its CMRR in dB is approximately:", fmt(round(db, 2), "dB"),
                   [fmt(round(ad / ac, 2), "dB"), fmt(round(10 * math.log10(ad / ac), 2), "dB"),
                    fmt(round(20 * math.log10(ac / ad), 2), "dB")],
                   f"CMRR(dB) = 20\u00b7log\u2081\u2080(A_d/A_c) = 20\u00b7log\u2081\u2080({ad}/{fmt(ac)}) = {round(db,2)} dB.")

    return batch([inv_gain, noninv_gain, inv_vout, noninv_vout, summing, diff_amp, cmrr], 90)


def t12_conceptual():
    return cset([
        ("An ideal op-amp has an open-loop voltage gain of:", ["Unity", "Infinite", "Zero", "100"], 1, "Ideal op-amp gain A \u2192 \u221e."),
        ("An ideal op-amp has an input impedance of:", ["Zero", "Infinite", "1 k\u03a9", "Equal to R_f"], 1, "Ideal input impedance is infinite (no input current)."),
        ("An ideal op-amp has an output impedance of:", ["Infinite", "Zero", "1 k\u03a9", "Very high"], 1, "Ideal output impedance is zero."),
        ("The bandwidth of an ideal op-amp is:", ["Zero", "Infinite", "1 MHz", "20 kHz"], 1, "An ideal op-amp has infinite bandwidth."),
        ("The concept of a 'virtual ground' applies to which configuration?", ["Non-inverting amplifier", "Inverting amplifier", "Voltage follower", "Comparator"], 1, "In an inverting amp the \u2212 input sits at \u2248 0 V."),
        ("The gain of an inverting amplifier is:", ["1 + R_f/R\u2081", "\u2212R_f/R\u2081", "R\u2081/R_f", "Unity"], 1, "A_v = \u2212R_f/R\u2081."),
        ("The gain of a non-inverting amplifier is:", ["\u2212R_f/R\u2081", "1 + R_f/R\u2081", "R_f/R\u2081", "Unity"], 1, "A_v = 1 + R_f/R\u2081."),
        ("A voltage follower has a voltage gain of:", ["Zero", "Unity", "Infinite", "\u22121"], 1, "The follower gives V_o = V_in (gain = 1)."),
        ("A voltage follower is mainly used as a:", ["Rectifier", "Buffer / impedance matcher", "Oscillator", "Filter"], 1, "High Z_in and low Z_out make it a buffer."),
        ("CMRR stands for:", ["Common Mode Resistance Ratio", "Common Mode Rejection Ratio", "Current Mode Rejection Ratio", "Combined Mode Response Ratio"], 1, "CMRR = Common Mode Rejection Ratio."),
        ("A high CMRR indicates that the op-amp:", ["Amplifies noise", "Rejects common-mode signals well", "Has low gain", "Is unstable"], 1, "High CMRR = good rejection of common-mode noise."),
        ("Slew rate of an op-amp is measured in:", ["V/Hz", "V/\u00b5s", "A/s", "dB"], 1, "Slew rate is the maximum dV_o/dt, in V/\u00b5s."),
        ("An op-amp integrator has which element in its feedback path?", ["Resistor", "Capacitor", "Inductor", "Diode"], 1, "An integrator uses a feedback capacitor."),
        ("An op-amp differentiator has a capacitor in its:", ["Feedback path", "Input path", "Output", "Supply"], 1, "The differentiator has the capacitor at the input."),
        ("The output of an op-amp integrator for a constant DC input is a:", ["Constant", "Ramp", "Square wave", "Sine wave"], 1, "Integrating a constant gives a linear ramp."),
        ("An op-amp used without feedback acts as a:", ["Buffer", "Comparator", "Integrator", "Filter"], 1, "Open-loop op-amp = comparator (saturates)."),
        ("The two inputs of an op-amp are called:", ["Base and emitter", "Inverting and non-inverting", "Source and drain", "Positive and neutral"], 1, "The (\u2212) inverting and (+) non-inverting inputs."),
        ("Negative feedback in an op-amp circuit:", ["Increases gain", "Stabilises gain and increases bandwidth", "Causes oscillation", "Reduces input impedance always"], 1, "Negative feedback trades gain for stability and bandwidth."),
        ("In an ideal op-amp, the differential input voltage is:", ["Very large", "Virtually zero", "Equal to supply", "Infinite"], 1, "Virtual short: V\u208a \u2248 V\u208b."),
        ("The input bias current of an ideal op-amp is:", ["Large", "Zero", "1 mA", "Equal to output current"], 1, "Ideal op-amp draws no input current."),
        ("An op-amp summing amplifier performs:", ["Multiplication", "Weighted addition of inputs", "Division", "Differentiation"], 1, "It sums the (weighted) input voltages."),
        ("The op-amp IC 741 is a:", ["Digital IC", "General-purpose operational amplifier", "Timer", "Voltage regulator"], 1, "The 741 is a classic general-purpose op-amp."),
    ])


# \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Topic 13: Digital Circuits \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
def t13_numerical():
    def bin2dec():
        n = random.randint(5, 255)
        b = bin(n)[2:]
        return mcq(f"The decimal equivalent of the binary number {b} is:", fmt(n),
                   [fmt(n + 1), fmt(n - 1), fmt(int(b) % 1000 if len(b) < 4 else n + 2)],
                   f"({b})\u2082 = {n} in decimal.")

    def dec2bin():
        n = random.randint(5, 255)
        b = bin(n)[2:]
        return mcq(f"The binary equivalent of the decimal number {n} is:", b,
                   [bin(n + 1)[2:], bin(n - 1)[2:], bin(n * 2)[2:]],
                   f"{n}\u2081\u2080 = ({b})\u2082.")

    def dec2hex():
        n = random.randint(16, 4000)
        h = hex(n)[2:].upper()
        return mcq(f"The hexadecimal equivalent of the decimal number {n} is:", h,
                   [hex(n + 1)[2:].upper(), hex(n - 1)[2:].upper(), oct(n)[2:]],
                   f"{n}\u2081\u2080 = ({h})\u2081\u2086.")

    def combos():
        n = random.randint(2, 8)
        return mcq(f"How many different input combinations are possible for a {n}-input logic gate?",
                   fmt(2 ** n), [fmt(n ** 2), fmt(2 * n), fmt(2 ** n - 1)],
                   f"Combinations = 2\u207f = 2^{n} = {2**n}.")

    def and_low():
        n = random.randint(2, 8)
        return mcq(f"How many input combinations produce a LOW output from a {n}-input AND gate?",
                   fmt(2 ** n - 1), [fmt(2 ** n), fmt(1), fmt(n)],
                   f"An AND gate is HIGH for only one combination (all 1s), so 2^{n} \u2212 1 = {2**n-1} give LOW.")

    def or_low():
        n = random.randint(2, 8)
        return mcq(f"How many input combinations produce a LOW output from a {n}-input OR gate?",
                   fmt(1), [fmt(2 ** n - 1), fmt(2 ** n), fmt(n)],
                   f"An OR gate is LOW only when all inputs are 0 \u2192 exactly 1 combination.")

    def minterms():
        n = random.randint(2, 5)
        return mcq(f"A Boolean function of {n} variables has how many possible minterms?",
                   fmt(2 ** n), [fmt(n ** 2), fmt(2 * n), fmt(n)],
                   f"Minterms = 2\u207f = 2^{n} = {2**n}.")

    def kmap_cells():
        n = random.randint(2, 5)
        return mcq(f"A Karnaugh map for {n} variables contains how many cells?", fmt(2 ** n),
                   [fmt(n ** 2), fmt(4 * n), fmt(2 * n)],
                   f"K-map cells = 2\u207f = 2^{n} = {2**n}.")

    return batch([bin2dec, dec2bin, dec2hex, combos, and_low, or_low, minterms, kmap_cells], 90)


def t13_conceptual():
    return cset([
        ("Which of the following is a universal gate?", ["AND", "NAND", "OR", "NOT"], 1, "NAND (and NOR) can realise any logic function."),
        ("Which pair are the universal gates?", ["AND and OR", "NAND and NOR", "NOT and AND", "XOR and OR"], 1, "NAND and NOR are the universal gates."),
        ("The output of an AND gate is HIGH only when:", ["Any input is HIGH", "All inputs are HIGH", "All inputs are LOW", "Inputs differ"], 1, "AND is HIGH only for all-HIGH inputs."),
        ("The output of an OR gate is LOW only when:", ["Any input is HIGH", "All inputs are LOW", "All inputs are HIGH", "Inputs differ"], 1, "OR is LOW only when every input is LOW."),
        ("The output of an XOR gate is HIGH when its two inputs are:", ["Equal", "Different", "Both HIGH", "Both LOW"], 1, "XOR = 1 when inputs differ."),
        ("The output of an XNOR gate is HIGH when its two inputs are:", ["Different", "Equal", "Both LOW only", "Both HIGH only"], 1, "XNOR = 1 when inputs are the same."),
        ("A NOT gate is also called an:", ["Buffer", "Inverter", "Driver", "Comparator"], 1, "A NOT gate inverts its input."),
        ("De Morgan's first theorem states that (A\u00b7B)' equals:", ["A' \u00b7 B'", "A' + B'", "A + B", "A \u00b7 B"], 1, "(AB)' = A' + B'."),
        ("De Morgan's second theorem states that (A + B)' equals:", ["A' + B'", "A' \u00b7 B'", "A \u00b7 B", "A + B"], 1, "(A+B)' = A'\u00b7B'."),
        ("In Boolean algebra, A + A equals:", ["2A", "A", "0", "1"], 1, "Idempotent law: A + A = A."),
        ("In Boolean algebra, A \u00b7 A equals:", ["A\u00b2", "A", "0", "1"], 1, "Idempotent law: A\u00b7A = A."),
        ("In Boolean algebra, A + A' equals:", ["0", "1", "A", "A'"], 1, "Complement law: A + A' = 1."),
        ("In Boolean algebra, A \u00b7 A' equals:", ["1", "0", "A", "A'"], 1, "Complement law: A\u00b7A' = 0."),
        ("In Boolean algebra, A + 1 equals:", ["A", "1", "0", "A'"], 1, "A + 1 = 1."),
        ("In Boolean algebra, A \u00b7 0 equals:", ["A", "0", "1", "A'"], 1, "A\u00b70 = 0."),
        ("A Karnaugh map is used for:", ["Amplification", "Simplifying Boolean expressions", "Rectification", "Filtering"], 1, "K-maps minimise logic expressions."),
        ("Combinational logic output depends on:", ["Past inputs", "Present inputs only", "Clock only", "Memory state"], 1, "Combinational circuits have no memory."),
        ("Sequential logic output depends on present inputs and:", ["Nothing else", "Past state (memory)", "Supply voltage", "Temperature"], 1, "Sequential circuits store state."),
        ("A half adder adds how many bits?", ["One", "Two", "Three", "Four"], 1, "A half adder adds two single bits."),
        ("A full adder has how many inputs?", ["Two", "Three", "Four", "One"], 1, "A full adder takes A, B and a carry-in."),
        ("The binary number system uses base:", ["8", "2", "10", "16"], 1, "Binary is base 2."),
        ("The hexadecimal number system uses base:", ["8", "16", "10", "2"], 1, "Hexadecimal is base 16."),
        ("The sum output of a half adder is implemented using which gate?", ["AND", "XOR", "OR", "NAND"], 1, "Sum = A \u2295 B (XOR)."),
        ("The carry output of a half adder is implemented using which gate?", ["XOR", "AND", "OR", "NOT"], 1, "Carry = A\u00b7B (AND)."),
    ])


# \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Topic 14: Magnetic Circuits \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
def t14_numerical():
    def mmf():
        n, i = random.choice([100, 200, 500, 1000, 250]), random.choice([1, 2, 5, 0.5, 3])
        return mcq(f"A coil of {n} turns carries a current of {fmt(i)} A. The magnetomotive force is:",
                   fmt(round(n * i, 2), "AT"),
                   [fmt(round(n / i, 2), "AT"), fmt(round(i / n, 4), "AT"), fmt(n, "AT")],
                   f"MMF = N\u00b7I = {n}\u00d7{fmt(i)} = {round(n*i,2)} ampere-turns.")

    def h_field():
        n, i = random.choice([200, 400, 500, 1000]), random.choice([1, 2, 4, 5])
        l = random.choice([0.2, 0.4, 0.5, 1])
        h = n * i / l
        return mcq(f"A coil of {n} turns carrying {i} A is wound on a core of mean length {fmt(l)} m. "
                   f"The magnetic field strength H is:", fmt(round(h, 2), "AT/m"),
                   [fmt(round(n * i * l, 2), "AT/m"), fmt(round(n * i, 2), "AT/m"),
                    fmt(round(l / (n * i), 5), "AT/m")],
                   f"H = NI/l = {n}\u00d7{i}/{fmt(l)} = {round(h,2)} AT/m.")

    def flux():
        mmf_v = random.choice([500, 1000, 2000, 1500])
        rel = random.choice([1e5, 2e5, 5e5, 4e5])
        f = mmf_v / rel
        return mcq(f"A magnetic circuit has an MMF of {mmf_v} AT and a reluctance of "
                   f"{rel:.0e} AT/Wb. The flux is:", fmt(round(f, 5), "Wb"),
                   [fmt(round(mmf_v * rel, 2), "Wb"), fmt(round(rel / mmf_v, 2), "Wb"),
                    fmt(round(f * 2, 5), "Wb")],
                   f"\u03a6 = MMF/S = {mmf_v}/{rel:.0e} = {round(f,5)} Wb.")

    def flux_density():
        f = random.choice([0.001, 0.002, 0.005, 0.01])
        a = random.choice([0.001, 0.002, 0.005, 0.01])
        b = f / a
        return mcq(f"A magnetic flux of {fmt(f)} Wb passes through a cross-section of {fmt(a)} m\u00b2. "
                   f"The flux density is:", fmt(round(b, 3), "T"),
                   [fmt(round(f * a, 6), "T"), fmt(round(a / f, 3), "T"), fmt(round(b / 2, 3), "T")],
                   f"B = \u03a6/A = {fmt(f)}/{fmt(a)} = {round(b,3)} T.")

    def reluctance():
        l = random.choice([0.2, 0.5, 1, 0.4])
        a = random.choice([0.001, 0.002, 0.005])
        mur = random.choice([500, 1000, 2000])
        s = l / (4e-7 * math.pi * mur * a)
        return mcq(f"A core has mean length {fmt(l)} m, area {fmt(a)} m\u00b2 and relative permeability "
                   f"{mur}. Its reluctance is approximately:", f"{s:.3g} AT/Wb",
                   [f"{s*2:.3g} AT/Wb", f"{s/2:.3g} AT/Wb", f"{1/s:.3g} AT/Wb"],
                   f"S = l/(\u00b5\u2080\u00b5_r A) = {fmt(l)}/(4\u03c0\u00d710\u207b\u2077\u00d7{mur}\u00d7{fmt(a)}) \u2248 {s:.3g} AT/Wb.")

    return batch([mmf, h_field, flux, flux_density, reluctance], 90)


def t14_conceptual():
    return cset([
        ("Magnetomotive force (MMF) is the product of current and:", ["Length", "Number of turns", "Area", "Permeability"], 1, "MMF = N\u00b7I ampere-turns."),
        ("The unit of magnetic flux is the:", ["Tesla", "Weber", "Henry", "Ampere-turn"], 1, "Magnetic flux is measured in webers."),
        ("The unit of flux density is the:", ["Weber", "Tesla", "Henry", "Ampere/metre"], 1, "Flux density B is measured in tesla (Wb/m\u00b2)."),
        ("The unit of reluctance is:", ["Wb/AT", "AT/Wb", "Ohm", "Henry"], 1, "Reluctance is measured in ampere-turns per weber."),
        ("Reluctance in a magnetic circuit is analogous to which electrical quantity?", ["Current", "Resistance", "Voltage", "Capacitance"], 1, "Reluctance \u2194 resistance."),
        ("Magnetic flux is analogous to which electrical quantity?", ["Voltage", "Current", "Resistance", "Power"], 1, "Flux \u2194 current."),
        ("MMF is analogous to which electrical quantity?", ["Current", "EMF (voltage)", "Resistance", "Charge"], 1, "MMF \u2194 EMF."),
        ("Reluctance of a magnetic path is directly proportional to its:", ["Area", "Length", "Permeability", "Flux"], 1, "S = l/(\u00b5A) \u2014 proportional to length."),
        ("Reluctance of a magnetic path is inversely proportional to:", ["Length", "Permeability \u00d7 area", "Flux", "MMF"], 1, "S = l/(\u00b5A)."),
        ("The permeability of free space \u00b5\u2080 is:", ["4\u03c0 \u00d7 10\u207b\u2077 H/m", "8.85 \u00d7 10\u207b\u00b9\u00b2 F/m", "1 H/m", "4\u03c0 \u00d7 10\u2077 H/m"], 0, "\u00b5\u2080 = 4\u03c0\u00d710\u207b\u2077 H/m."),
        ("Relative permeability of a ferromagnetic material is:", ["Less than 1", "Very much greater than 1", "Exactly 1", "Zero"], 1, "Ferromagnetics have \u00b5_r in the hundreds or thousands."),
        ("Relative permeability of air is approximately:", ["1000", "1", "0", "500"], 1, "For air \u00b5_r \u2248 1."),
        ("The B\u2013H curve of a magnetic material shows:", ["Linear behaviour always", "Saturation at high H", "Constant permeability", "Zero flux"], 1, "B saturates as H increases."),
        ("Hysteresis loss in a magnetic material is proportional to the:", ["Square of frequency", "Area of the hysteresis loop", "Reluctance", "Air-gap length"], 1, "Loss per cycle \u221d loop area."),
        ("Eddy current loss is reduced by:", ["Using a solid core", "Laminating the core", "Increasing frequency", "Using copper cores"], 1, "Laminations break eddy current paths."),
        ("The magnetic field strength H has units of:", ["Tesla", "Ampere-turns per metre", "Weber", "Henry"], 1, "H is in AT/m."),
        ("The relation between B and H is:", ["B = H/\u00b5", "B = \u00b5H", "B = \u00b5/H", "B = H\u00b2"], 1, "B = \u00b5H = \u00b5\u2080\u00b5_r H."),
        ("An air gap in a magnetic circuit:", ["Reduces reluctance", "Greatly increases reluctance", "Has no effect", "Increases flux"], 1, "Air has low permeability \u2192 high reluctance."),
        ("Reluctances in series in a magnetic circuit:", ["Add reciprocally", "Add directly", "Cancel", "Multiply"], 1, "Series reluctances add, like series resistances."),
        ("Residual magnetism (retentivity) is the flux density remaining when H is:", ["Maximum", "Reduced to zero", "Negative maximum", "Doubled"], 1, "Residual flux remains at H = 0."),
        ("Coercivity is the reverse magnetic field needed to reduce B to:", ["Maximum", "Zero", "Half", "Saturation"], 1, "Coercive force drives B back to zero."),
        ("Kirchhoff's laws applied to magnetic circuits are analogous to:", ["Only KCL", "Both KCL and KVL", "Ohm's law only", "Faraday's law"], 1, "Flux at a junction and MMF around a loop follow analogous laws."),
    ])


# \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Topic 15: Transformers \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
def t15_numerical():
    def turns_v():
        n1, n2 = random.choice([100, 200, 500, 1000]), random.choice([50, 100, 250, 20])
        v1 = random.choice([230, 400, 100, 200])
        v2 = v1 * n2 / n1
        return mcq(f"A transformer has N\u2081 = {n1} and N\u2082 = {n2} turns with a primary voltage of {v1} V. "
                   f"The secondary voltage is:", fmt(round(v2, 2), "V"),
                   [fmt(round(v1 * n1 / n2, 2), "V"), fmt(v1, "V"), fmt(round(v2 / 2, 2), "V")],
                   f"V\u2082 = V\u2081\u00d7(N\u2082/N\u2081) = {v1}\u00d7{n2}/{n1} = {round(v2,2)} V.")

    def turns_i():
        n1, n2 = random.choice([200, 400, 1000]), random.choice([50, 100, 200])
        i1 = random.choice([1, 2, 5, 10])
        i2 = i1 * n1 / n2
        return mcq(f"A transformer has N\u2081 = {n1} and N\u2082 = {n2} turns with a primary current of {i1} A. "
                   f"The secondary current is:", fmt(round(i2, 2), "A"),
                   [fmt(round(i1 * n2 / n1, 2), "A"), fmt(i1, "A"), fmt(round(i2 * 2, 2), "A")],
                   f"I\u2082 = I\u2081\u00d7(N\u2081/N\u2082) = {i1}\u00d7{n1}/{n2} = {round(i2,2)} A (VA balance).")

    def emf_eq():
        f = random.choice([50, 60])
        n = random.choice([100, 200, 500, 1000])
        phi = random.choice([0.01, 0.02, 0.005, 0.05])
        e = 4.44 * f * n * phi
        return mcq(f"A transformer winding of {n} turns links a peak flux of {fmt(phi)} Wb at {f} Hz. "
                   f"The induced EMF is:", fmt(round(e, 2), "V"),
                   [fmt(round(1.11 * f * n * phi, 2), "V"), fmt(round(4.44 * n * phi, 2), "V"),
                    fmt(round(f * n * phi, 2), "V")],
                   f"E = 4.44\u00b7f\u00b7N\u00b7\u03a6_m = 4.44\u00d7{f}\u00d7{n}\u00d7{fmt(phi)} = {round(e,2)} V.")

    def efficiency():
        out = random.choice([5, 10, 20, 50, 100])          # kW
        loss = random.choice([0.2, 0.5, 1, 0.4])            # kW
        eff = out / (out + loss) * 100
        return mcq(f"A transformer delivers {out} kW output with total losses of {fmt(loss)} kW. "
                   f"Its efficiency is:", fmt(round(eff, 2), "%"),
                   [fmt(round(out / (out - loss) * 100, 2), "%"), fmt(round(loss / out * 100, 2), "%"),
                    fmt(round(eff - 5, 2), "%")],
                   f"\u03b7 = output/(output+losses) = {out}/({out}+{fmt(loss)}) = {round(eff,2)}%.")

    def regulation():
        vnl = random.choice([240, 250, 420, 110])
        vfl = vnl - random.choice([5, 10, 20, 4])
        reg = (vnl - vfl) / vfl * 100
        return mcq(f"A transformer has a no-load secondary voltage of {vnl} V and a full-load voltage "
                   f"of {vfl} V. Its voltage regulation is:", fmt(round(reg, 2), "%"),
                   [fmt(round((vnl - vfl) / vnl * 100, 2), "%"), fmt(round(vnl - vfl, 2), "%"),
                    fmt(round(reg * 2, 2), "%")],
                   f"Regulation = (V_nl \u2212 V_fl)/V_fl \u00d7100 = ({vnl}\u2212{vfl})/{vfl} = {round(reg,2)}%.")

    def kva_ratio():
        v1, v2 = random.choice([2300, 11000, 400]), random.choice([230, 400, 110])
        kva = random.choice([5, 10, 25, 50])
        i2 = kva * 1000 / v2
        return mcq(f"A {kva} kVA transformer has a secondary voltage of {v2} V. "
                   f"The rated secondary current is:", fmt(round(i2, 2), "A"),
                   [fmt(round(kva * 1000 / v1, 2), "A"), fmt(round(v2 / kva, 2), "A"), fmt(kva, "A")],
                   f"I\u2082 = kVA\u00d71000/V\u2082 = {kva}\u00d71000/{v2} = {round(i2,2)} A.")

    return batch([turns_v, turns_i, emf_eq, efficiency, regulation, kva_ratio], 90)


def t15_conceptual():
    return cset([
        ("A transformer works on the principle of:", ["Self induction", "Mutual induction", "Electrostatic induction", "Hysteresis"], 1, "Transformers use mutual induction."),
        ("A transformer can operate on:", ["DC only", "AC only", "Both AC and DC", "Pulsating DC only"], 1, "It needs changing flux \u2192 AC only."),
        ("The EMF equation of a transformer is:", ["E = 2.22 fN\u03a6", "E = 4.44 fN\u03a6_m", "E = 1.11 fN\u03a6", "E = fN\u03a6"], 1, "E = 4.44 f N \u03a6_m."),
        ("In an ideal transformer, the efficiency is:", ["50%", "100%", "90%", "0%"], 1, "An ideal transformer has no losses."),
        ("A step-up transformer has a turns ratio N\u2082/N\u2081 that is:", ["Less than 1", "Greater than 1", "Equal to 1", "Zero"], 1, "Step-up: more secondary turns."),
        ("In a transformer, if voltage is stepped up, the current is:", ["Stepped up", "Stepped down", "Unchanged", "Zero"], 1, "VA is constant, so current falls."),
        ("Copper losses in a transformer vary with:", ["Frequency", "The square of the load current", "Voltage only", "Core material"], 1, "Cu loss = I\u00b2R, varying as load\u00b2."),
        ("Iron (core) losses in a transformer are:", ["Proportional to load", "Practically constant at all loads", "Zero", "Proportional to load\u00b2"], 1, "Core loss depends on flux/frequency, not load."),
        ("Iron losses consist of hysteresis loss and:", ["Copper loss", "Eddy current loss", "Friction loss", "Windage loss"], 1, "Iron loss = hysteresis + eddy current."),
        ("Maximum efficiency in a transformer occurs when:", ["Copper loss = 0", "Copper loss = iron loss", "Iron loss = 0", "Load is maximum"], 1, "\u03b7_max when variable loss = constant loss."),
        ("The open-circuit test on a transformer gives:", ["Copper losses", "Iron (core) losses", "Total losses", "Regulation"], 1, "OC test \u2192 no-load/core losses."),
        ("The short-circuit test on a transformer gives:", ["Iron losses", "Copper losses (full load)", "Magnetising current", "Efficiency"], 1, "SC test \u2192 full-load copper losses."),
        ("The open-circuit test is usually performed on the:", ["HV side", "LV side", "Either with equal accuracy", "Neutral"], 1, "OC test is done on the LV side (rated V applied)."),
        ("The short-circuit test is usually performed on the:", ["LV side", "HV side", "Neutral", "Tertiary"], 1, "SC test is done on the HV side."),
        ("A transformer's voltage regulation should ideally be:", ["Maximum", "As low as possible", "Exactly 50%", "Unity"], 1, "Low regulation = better voltage stability."),
        ("The no-load current of a transformer is mainly:", ["Resistive", "Magnetising (reactive)", "Zero", "Equal to full load"], 1, "No-load current is largely magnetising."),
        ("Leakage flux in a transformer causes:", ["Increased efficiency", "Leakage reactance", "Zero regulation", "Higher output"], 1, "Leakage flux appears as series reactance."),
        ("Transformer cores are laminated to reduce:", ["Copper loss", "Eddy current loss", "Hysteresis loss", "Leakage flux"], 1, "Laminations reduce eddy currents."),
        ("Transformer core material is usually:", ["Copper", "Silicon steel", "Aluminium", "Carbon"], 1, "CRGO silicon steel has low core loss."),
        ("An autotransformer uses:", ["Two isolated windings", "A single winding common to both circuits", "Three windings", "No winding"], 1, "An autotransformer shares one winding."),
        ("The efficiency of a large power transformer is typically:", ["50\u201360%", "Above 95%", "Around 75%", "Below 50%"], 1, "Power transformers exceed 95\u201399% efficiency."),
        ("A transformer transfers energy from primary to secondary through:", ["Direct connection", "A magnetic field", "An electrostatic field", "Conduction"], 1, "Energy is coupled via the magnetic field."),
        ("The frequency of the secondary voltage of a transformer is:", ["Double the primary", "Same as the primary", "Half the primary", "Zero"], 1, "Frequency is unchanged by a transformer."),
    ])


# \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Topic 16: Electromechanical Energy Conversion \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
def t16_numerical():
    def field_energy():
        l = random.choice([0.05, 0.1, 0.15, 0.2, 0.25, 0.4, 0.5, 0.75, 1, 1.5, 2, 2.5])
        i = random.randint(2, 20)
        e = 0.5 * l * i * i
        return mcq(f"The energy stored in a magnetic field of a coil with L = {fmt(l)} H carrying "
                   f"{i} A is:", fmt(round(e, 3), "J"),
                   [fmt(round(l * i, 3), "J"), fmt(round(l * i * i, 3), "J"), fmt(round(e / 2, 3), "J")],
                   f"W = \u00bdLI\u00b2 = \u00bd\u00d7{fmt(l)}\u00d7{i}\u00b2 = {round(e,3)} J.")

    def force_align():
        b = random.choice([0.4, 0.5, 0.6, 0.8, 1, 1.1, 1.2, 1.4, 1.5, 1.6])
        a = random.choice([0.0005, 0.001, 0.0015, 0.002, 0.0025, 0.004, 0.005, 0.008, 0.01])
        f = b * b * a / (2 * 4e-7 * math.pi)
        return mcq(f"The force of attraction across an air gap with flux density {fmt(b)} T and area "
                   f"{fmt(a)} m\u00b2 is approximately:", f"{f:.4g} N",
                   [f"{f*2:.4g} N", f"{f/2:.4g} N", f"{b*a:.4g} N"],
                   f"F = B\u00b2A/(2\u00b5\u2080) = {fmt(b)}\u00b2\u00d7{fmt(a)}/(2\u00d74\u03c0\u00d710\u207b\u2077) \u2248 {f:.4g} N.")

    def torque_power():
        p = random.choice([250, 500, 750, 1000, 1500, 2000, 3000, 4000, 5000, 7500, 10000])
        n = random.choice([500, 600, 720, 750, 900, 1000, 1200, 1440, 1500, 3000])
        t = p * 60 / (2 * math.pi * n)
        return mcq(f"A machine delivers {p} W at {n} rpm. The developed torque is:",
                   fmt(round(t, 2), "N\u00b7m"),
                   [fmt(round(p / n, 3), "N\u00b7m"), fmt(round(p * n, 2), "N\u00b7m"),
                    fmt(round(2 * math.pi * n / p, 4), "N\u00b7m")],
                   f"T = P/\u03c9 = P\u00d760/(2\u03c0N) = {p}\u00d760/(2\u03c0\u00d7{n}) = {round(t,2)} N\u00b7m.")

    def mech_power():
        t = random.randint(2, 60)
        n = random.choice([500, 600, 720, 750, 900, 1000, 1200, 1440, 1500, 3000])
        p = 2 * math.pi * n * t / 60
        return mcq(f"A motor develops a torque of {t} N\u00b7m at {n} rpm. The mechanical power output is:",
                   fmt(round(p, 2), "W"),
                   [fmt(round(t * n, 2), "W"), fmt(round(t / n, 4), "W"), fmt(round(p / 2, 2), "W")],
                   f"P = 2\u03c0NT/60 = 2\u03c0\u00d7{n}\u00d7{t}/60 = {round(p,2)} W.")

    return batch([field_energy, force_align, torque_power, mech_power], 90)


def t16_conceptual():
    return cset([
        ("Electromechanical energy conversion takes place through the medium of a:", ["Electric field only", "Magnetic (or electric) coupling field", "Thermal field", "Gravitational field"], 1, "A coupling field stores and transfers the energy."),
        ("In a motor, energy is converted from:", ["Mechanical to electrical", "Electrical to mechanical", "Heat to electrical", "Chemical to mechanical"], 1, "A motor converts electrical \u2192 mechanical energy."),
        ("In a generator, energy is converted from:", ["Electrical to mechanical", "Mechanical to electrical", "Electrical to heat", "Magnetic to chemical"], 1, "A generator converts mechanical \u2192 electrical energy."),
        ("The energy balance equation includes electrical input, mechanical output, stored field energy and:", ["Nothing else", "Losses", "Voltage", "Reluctance"], 1, "Input = output + stored energy + losses."),
        ("Force of alignment acts so as to:", ["Increase reluctance", "Reduce the reluctance of the magnetic path", "Reduce flux", "Increase the air gap"], 1, "Parts move to minimise reluctance."),
        ("The energy stored in a magnetic field of an inductor is:", ["LI", "\u00bdLI\u00b2", "L\u00b2I", "\u00bdL\u00b2I"], 1, "W = \u00bdLI\u00b2."),
        ("Coenergy is graphically the area:", ["Above the \u03bb\u2013i curve", "Below the \u03bb\u2013i curve", "The whole rectangle", "Zero"], 1, "Coenergy is the area under the \u03bb\u2013i curve."),
        ("For a linear magnetic system, energy and coenergy are:", ["Different", "Equal", "Zero", "Negative"], 1, "In a linear system W = W'."),
        ("The force developed in a singly-excited system is obtained from the:", ["Integral of flux", "Rate of change of coenergy with position", "Reluctance directly", "Current only"], 1, "F = \u2202W'/\u2202x at constant current."),
        ("Reluctance torque arises due to variation of:", ["Resistance", "Reluctance with rotor position", "Voltage", "Frequency"], 1, "Torque appears when reluctance varies with angle."),
        ("Losses in electromechanical conversion include copper, core and:", ["Only friction", "Mechanical (friction and windage) losses", "Voltage drop", "Reactive power"], 1, "Friction and windage are mechanical losses."),
        ("In rotary motion, mechanical power equals torque multiplied by:", ["Speed in rpm", "Angular velocity in rad/s", "Radius", "Force"], 1, "P = T\u03c9."),
        ("The angular velocity \u03c9 in rad/s for N rpm is:", ["N/60", "2\u03c0N/60", "60/N", "\u03c0N"], 1, "\u03c9 = 2\u03c0N/60."),
        ("An electromechanical energy conversion device is fundamentally:", ["Unidirectional", "Reversible (motor or generator)", "Only a motor", "Only a generator"], 1, "The same machine can motor or generate."),
        ("The coupling field in most practical machines is:", ["Electric field", "Magnetic field", "Thermal field", "Acoustic field"], 1, "Magnetic coupling stores far more energy density."),
        ("In a singly-excited system, torque is produced only if:", ["Reluctance is constant", "Reluctance varies with rotor position", "Current is DC", "Flux is zero"], 1, "Constant reluctance \u2192 no reluctance torque."),
        ("Energy stored in the coupling field during conversion is:", ["Permanently lost", "Temporarily stored and returned", "Converted to heat", "Zero"], 1, "Field energy is stored and later returned."),
        ("A doubly-excited machine has windings on:", ["Stator only", "Both stator and rotor", "Rotor only", "Neither"], 1, "Doubly excited = both members excited."),
        ("Mechanical work done by a machine equals force multiplied by:", ["Time", "Displacement", "Velocity", "Mass"], 1, "W = F \u00d7 d."),
        ("The direction of the developed force is such that it tends to:", ["Oppose flux", "Align the members and increase inductance", "Reduce current", "Increase the gap"], 1, "Force acts to increase inductance (reduce reluctance)."),
    ])


# \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Topic 17: DC Machines \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
def t17_numerical():
    def emf_dc():
        p = random.choice([2, 4, 6])
        z = random.choice([400, 500, 600, 800])
        n = random.choice([1000, 1200, 1500, 750])
        phi = random.choice([0.01, 0.02, 0.025, 0.03])
        a = p  # lap winding
        e = p * phi * z * n / (60 * a)
        return mcq(f"A {p}-pole lap-wound DC generator has {z} conductors, flux/pole {fmt(phi)} Wb "
                   f"and runs at {n} rpm. The generated EMF is:", fmt(round(e, 2), "V"),
                   [fmt(round(e * p, 2), "V"), fmt(round(e / 2, 2), "V"), fmt(round(e * 60, 2), "V")],
                   f"E = P\u03a6ZN/(60A); lap \u21d2 A = P, so E = \u03a6ZN/60 = {fmt(phi)}\u00d7{z}\u00d7{n}/60 = {round(e,2)} V.")

    def emf_wave():
        p = random.choice([4, 6, 8])
        z = random.choice([400, 500, 600])
        n = random.choice([1000, 1500, 750])
        phi = random.choice([0.02, 0.025, 0.01])
        a = 2  # wave winding
        e = p * phi * z * n / (60 * a)
        return mcq(f"A {p}-pole wave-wound DC generator has {z} conductors, flux/pole {fmt(phi)} Wb "
                   f"and runs at {n} rpm. The generated EMF is:", fmt(round(e, 2), "V"),
                   [fmt(round(e * 2 / p, 2), "V"), fmt(round(e / 2, 2), "V"), fmt(round(e * 2, 2), "V")],
                   f"E = P\u03a6ZN/(60A); wave \u21d2 A = 2, giving {round(e,2)} V.")

    def back_emf():
        v = random.choice([220, 230, 250, 200])
        ia = random.choice([10, 20, 25, 50])
        ra = random.choice([0.1, 0.2, 0.5, 0.25])
        eb = v - ia * ra
        return mcq(f"A DC motor has V = {v} V, armature current {ia} A and armature resistance "
                   f"{fmt(ra)} \u03a9. The back EMF is:", fmt(round(eb, 2), "V"),
                   [fmt(round(v + ia * ra, 2), "V"), fmt(v, "V"), fmt(round(ia * ra, 2), "V")],
                   f"E_b = V \u2212 I_a R_a = {v} \u2212 {ia}\u00d7{fmt(ra)} = {round(eb,2)} V.")

    def gen_emf_terminal():
        e = random.choice([230, 250, 240, 220])
        ia = random.choice([10, 20, 25, 40])
        ra = random.choice([0.1, 0.2, 0.25, 0.5])
        v = e - ia * ra
        return mcq(f"A DC generator has a generated EMF of {e} V, armature current {ia} A and "
                   f"armature resistance {fmt(ra)} \u03a9. Its terminal voltage is:", fmt(round(v, 2), "V"),
                   [fmt(round(e + ia * ra, 2), "V"), fmt(e, "V"), fmt(round(ia * ra, 2), "V")],
                   f"V = E \u2212 I_a R_a = {e} \u2212 {ia}\u00d7{fmt(ra)} = {round(v,2)} V.")

    def torque_dc():
        eb = random.choice([200, 220, 230])
        ia = random.choice([10, 20, 25])
        n = random.choice([1000, 1500, 750])
        t = eb * ia * 60 / (2 * math.pi * n)
        return mcq(f"A DC motor has a back EMF of {eb} V, armature current {ia} A and runs at {n} rpm. "
                   f"The developed torque is:", fmt(round(t, 2), "N\u00b7m"),
                   [fmt(round(eb * ia, 2), "N\u00b7m"), fmt(round(eb / ia, 2), "N\u00b7m"), fmt(round(t / 2, 2), "N\u00b7m")],
                   f"T = E_b I_a \u00d7 60/(2\u03c0N) = {eb}\u00d7{ia}\u00d760/(2\u03c0\u00d7{n}) = {round(t,2)} N\u00b7m.")

    def shunt_field_i():
        v = random.choice([220, 230, 250])
        rsh = random.choice([100, 110, 220, 200])
        return mcq(f"A DC shunt motor has a supply of {v} V and a shunt field resistance of {rsh} \u03a9. "
                   f"The field current is:", fmt(round(v / rsh, 3), "A"),
                   [fmt(round(rsh / v, 3), "A"), fmt(round(v * rsh, 2), "A"), fmt(v, "A")],
                   f"I_sh = V/R_sh = {v}/{rsh} = {round(v/rsh,3)} A.")

    return batch([emf_dc, emf_wave, back_emf, gen_emf_terminal, torque_dc, shunt_field_i], 90)


def t17_conceptual():
    return cset([
        ("The EMF equation of a DC machine is:", ["E = 4.44 fN\u03a6", "E = P\u03a6ZN/(60A)", "E = NI/l", "E = BIL"], 1, "E = P\u03a6ZN/60A."),
        ("In a lap winding, the number of parallel paths A equals:", ["2", "The number of poles P", "Z", "1"], 1, "Lap winding: A = P."),
        ("In a wave winding, the number of parallel paths A equals:", ["P", "2", "Z", "4"], 1, "Wave winding: A = 2 always."),
        ("Lap windings are preferred for:", ["High voltage, low current", "High current, low voltage", "Small machines only", "AC machines"], 1, "More parallel paths \u2192 higher current capability."),
        ("Wave windings are preferred for:", ["High current, low voltage", "High voltage, low current", "Very large currents", "Single-phase supply"], 1, "Fewer paths \u2192 higher voltage per path."),
        ("The function of a commutator in a DC generator is to:", ["Increase voltage", "Convert alternating EMF to unidirectional (DC)", "Reduce speed", "Produce flux"], 1, "The commutator rectifies the armature EMF."),
        ("The back EMF of a DC motor is given by:", ["V + I_aR_a", "V \u2212 I_aR_a", "V \u00d7 I_a", "I_aR_a"], 1, "E_b = V \u2212 I_aR_a."),
        ("The back EMF in a DC motor:", ["Aids the supply voltage", "Opposes the supply voltage", "Has no effect", "Doubles the current"], 1, "Back EMF opposes the applied voltage (Lenz's law)."),
        ("At the instant of starting, the back EMF of a DC motor is:", ["Maximum", "Zero", "Equal to V", "Negative"], 1, "Speed = 0 \u21d2 E_b = 0 \u21d2 large starting current."),
        ("A DC motor starter is used to limit the:", ["Field current", "Heavy starting armature current", "Speed", "Torque"], 1, "It adds resistance to limit starting current."),
        ("The speed of a DC motor is proportional to:", ["Flux", "Back EMF / flux", "Armature current", "Torque"], 1, "N \u221d E_b/\u03a6."),
        ("Torque developed in a DC motor is proportional to:", ["\u03a6/I_a", "\u03a6 \u00d7 I_a", "I_a only", "N only"], 1, "T \u221d \u03a6I_a."),
        ("A DC series motor should never be started:", ["With load", "On no load", "With a starter", "At rated voltage"], 1, "On no load a series motor races to dangerous speed."),
        ("Which DC motor has the highest starting torque?", ["Shunt motor", "Series motor", "Compound motor", "All equal"], 1, "T \u221d I_a\u00b2 in a series motor \u2192 high starting torque."),
        ("A DC shunt motor is considered a:", ["Variable speed motor", "Approximately constant speed motor", "Zero speed motor", "Synchronous motor"], 1, "Shunt motors run at nearly constant speed."),
        ("In a DC shunt motor, the field winding is connected:", ["In series with the armature", "In parallel with the armature", "To a separate AC supply", "To the commutator"], 1, "Shunt field is across the armature."),
        ("Armature reaction in a DC machine is the effect of:", ["Field flux on armature", "Armature flux on the main field flux", "Friction", "Eddy currents"], 1, "Armature MMF distorts the main field."),
        ("Armature reaction is reduced by using:", ["Larger air gap only", "Interpoles and compensating windings", "Higher speed", "Series field"], 1, "Interpoles/compensating windings counter it."),
        ("Speed control of a DC shunt motor above rated speed is achieved by:", ["Armature voltage control", "Field weakening", "Adding armature resistance", "Reducing supply"], 1, "N \u221d 1/\u03a6, so weakening the field raises speed."),
        ("The Ward-Leonard method is used for:", ["Starting only", "Wide-range smooth speed control", "Braking only", "Power factor correction"], 1, "Ward-Leonard gives smooth wide-range speed control."),
        ("Iron losses in a DC machine occur mainly in the:", ["Field winding", "Armature core", "Brushes", "Commutator"], 1, "The rotating armature core suffers hysteresis and eddy losses."),
        ("The purpose of brushes in a DC machine is to:", ["Generate flux", "Collect current from the commutator", "Reduce speed", "Cool the machine"], 1, "Brushes provide the sliding electrical contact."),
        ("A DC machine works as a generator when the mechanical input drives it and:", ["E_b > V", "E > V (it supplies current)", "E = 0", "I_a = 0"], 1, "Generated EMF exceeds terminal voltage \u2192 delivers current."),
    ])


# \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Topic 18: Three-Phase Induction Motor \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
def t18_numerical():
    def sync_speed():
        f = random.choice([50, 60])
        p = random.choice([2, 4, 6, 8, 10, 12])
        ns = 120 * f / p
        return mcq(f"A {p}-pole induction motor is supplied at {f} Hz. Its synchronous speed is:",
                   fmt(round(ns, 2), "rpm"),
                   [fmt(round(60 * f / p, 2), "rpm"), fmt(round(120 * p / f, 2), "rpm"),
                    fmt(round(ns / 2, 2), "rpm")],
                   f"N_s = 120f/P = 120\u00d7{f}/{p} = {round(ns,2)} rpm.")

    def slip():
        f = random.choice([50, 60])
        p = random.choice([4, 6, 2])
        ns = 120 * f / p
        n = round(ns * random.choice([0.94, 0.95, 0.96, 0.97]))
        s = (ns - n) / ns * 100
        return mcq(f"A {p}-pole, {f} Hz induction motor runs at {n} rpm. Its slip is:",
                   fmt(round(s, 2), "%"),
                   [fmt(round((ns - n) / n * 100, 2), "%"), fmt(round(n / ns * 100, 2), "%"),
                    fmt(round(s * 2, 2), "%")],
                   f"N_s = {round(ns)} rpm; s = (N_s\u2212N)/N_s = ({round(ns)}\u2212{n})/{round(ns)} = {round(s,2)}%.")

    def rotor_freq():
        f = random.choice([50, 60])
        s = random.choice([0.02, 0.03, 0.04, 0.05, 0.01])
        return mcq(f"An induction motor operates at a slip of {fmt(s*100)}% from a {f} Hz supply. "
                   f"The rotor frequency is:", fmt(round(s * f, 3), "Hz"),
                   [fmt(f, "Hz"), fmt(round(f / s, 2), "Hz"), fmt(round(s, 3), "Hz")],
                   f"f_r = s\u00b7f = {fmt(s)}\u00d7{f} = {round(s*f,3)} Hz.")

    def rotor_speed():
        f = random.choice([50, 60])
        p = random.choice([4, 6, 2])
        s = random.choice([0.02, 0.04, 0.05, 0.03])
        ns = 120 * f / p
        n = ns * (1 - s)
        return mcq(f"A {p}-pole, {f} Hz induction motor runs with a slip of {fmt(s*100)}%. "
                   f"Its rotor speed is:", fmt(round(n, 2), "rpm"),
                   [fmt(round(ns, 2), "rpm"), fmt(round(ns * s, 2), "rpm"), fmt(round(ns * (1 + s), 2), "rpm")],
                   f"N = N_s(1\u2212s) = {round(ns)}\u00d7(1\u2212{fmt(s)}) = {round(n,2)} rpm.")

    def rotor_cu_loss():
        pg = random.choice([1000, 2000, 5000, 10000])
        s = random.choice([0.02, 0.04, 0.05, 0.03])
        return mcq(f"An induction motor has an air-gap (rotor input) power of {pg} W and a slip of "
                   f"{fmt(s*100)}%. The rotor copper loss is:", fmt(round(s * pg, 2), "W"),
                   [fmt(round(pg * (1 - s), 2), "W"), fmt(pg, "W"), fmt(round(pg / s, 2), "W")],
                   f"Rotor Cu loss = s \u00d7 rotor input = {fmt(s)}\u00d7{pg} = {round(s*pg,2)} W.")

    def mech_power_im():
        pg = random.choice([1000, 2000, 5000, 8000])
        s = random.choice([0.02, 0.04, 0.05])
        pm = pg * (1 - s)
        return mcq(f"An induction motor has a rotor input of {pg} W and a slip of {fmt(s*100)}%. "
                   f"The gross mechanical power developed is:", fmt(round(pm, 2), "W"),
                   [fmt(round(pg * s, 2), "W"), fmt(pg, "W"), fmt(round(pg / (1 - s), 2), "W")],
                   f"P_m = (1\u2212s)\u00d7rotor input = (1\u2212{fmt(s)})\u00d7{pg} = {round(pm,2)} W.")

    return batch([sync_speed, slip, rotor_freq, rotor_speed, rotor_cu_loss, mech_power_im], 90)


def t18_conceptual():
    return cset([
        ("The synchronous speed of an induction motor is given by:", ["120P/f", "120f/P", "60f/P", "f/120P"], 1, "N_s = 120f/P rpm."),
        ("Slip of an induction motor is defined as:", ["(N \u2212 N_s)/N", "(N_s \u2212 N)/N_s", "N/N_s", "N_s/N"], 1, "s = (N_s \u2212 N)/N_s."),
        ("At standstill, the slip of an induction motor is:", ["0", "1", "0.5", "Infinite"], 1, "N = 0 \u21d2 s = 1."),
        ("At synchronous speed, the slip would be:", ["1", "0", "0.5", "2"], 1, "N = N_s \u21d2 s = 0."),
        ("An induction motor can never run at synchronous speed because:", ["Of friction only", "No relative motion means no rotor EMF or torque", "The supply is AC", "Of high slip"], 1, "Zero slip \u21d2 no induced rotor current \u21d2 no torque."),
        ("The rotor frequency of an induction motor is:", ["f", "s\u00b7f", "f/s", "2f"], 1, "f_r = s\u00b7f."),
        ("An induction motor is essentially a:", ["Synchronous machine", "Rotating transformer", "DC machine", "Static device"], 1, "It behaves like a transformer with a rotating secondary."),
        ("The rotating magnetic field in a three-phase induction motor is produced by:", ["The rotor winding", "The three-phase stator winding", "Permanent magnets", "DC excitation"], 1, "Balanced 3-\u03c6 stator currents create the RMF."),
        ("A three-phase induction motor is:", ["Not self-starting", "Self-starting", "Started only by a DC source", "Started by hand"], 1, "The RMF makes it self-starting."),
        ("The rotor copper loss in an induction motor equals:", ["(1\u2212s) \u00d7 rotor input", "s \u00d7 rotor input", "Rotor input", "Zero"], 1, "Rotor Cu loss = s \u00d7 P_airgap."),
        ("Gross mechanical power developed equals:", ["s \u00d7 rotor input", "(1 \u2212 s) \u00d7 rotor input", "Rotor input", "Stator input"], 1, "P_mech = (1\u2212s)P_airgap."),
        ("The starting torque of an induction motor can be increased by:", ["Reducing rotor resistance", "Increasing rotor resistance (slip-ring motor)", "Increasing frequency", "Reducing voltage"], 1, "Added rotor resistance boosts starting torque."),
        ("A squirrel-cage rotor has:", ["Slip rings", "Short-circuited bars", "A commutator", "Brushes"], 1, "Cage bars are shorted by end rings."),
        ("External rotor resistance can be added only in a:", ["Squirrel-cage motor", "Slip-ring (wound rotor) motor", "Synchronous motor", "DC motor"], 1, "Only wound-rotor machines allow external resistance."),
        ("The torque of an induction motor is proportional to the square of the:", ["Frequency", "Applied voltage", "Slip", "Speed"], 1, "T \u221d V\u00b2 for an induction motor."),
        ("Typical full-load slip of an induction motor is about:", ["20\u201330%", "2\u20135%", "50%", "0%"], 1, "Full-load slip is usually a few percent."),
        ("The no-load test of an induction motor gives:", ["Copper losses", "Core, friction and windage losses", "Full-load torque", "Slip"], 1, "No-load test \u2192 constant (rotational) losses."),
        ("The blocked-rotor test of an induction motor gives:", ["Core losses", "Copper losses and leakage reactance", "Efficiency", "No-load current"], 1, "Blocked-rotor \u2248 short-circuit test."),
        ("The speed of an induction motor can be varied by changing:", ["Only the load", "Supply frequency, poles or voltage", "Brush position", "Commutator"], 1, "V/f control, pole changing or voltage control."),
        ("The power factor of an induction motor at no load is:", ["High and leading", "Low and lagging", "Unity", "Zero"], 1, "At no load it draws mostly magnetising current."),
        ("An induction motor draws a starting current of about how many times full-load current (DOL)?", ["1\u20132 times", "5\u20137 times", "0.5 times", "20 times"], 1, "Direct-on-line starting draws 5\u20137\u00d7 rated current."),
        ("A star-delta starter reduces the starting current to about:", ["Same as DOL", "One-third of DOL", "Twice DOL", "Zero"], 1, "Star-delta starting gives \u2153 of the DOL current."),
        ("Maximum torque of an induction motor is independent of:", ["Supply voltage", "Rotor resistance", "Stator reactance", "Frequency"], 1, "T_max is independent of rotor resistance (only the slip at which it occurs changes)."),
    ])


# \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Topic 19: Single-Phase Induction Motor \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
def t19_numerical():
    def sync_speed1():
        f = random.choice([50, 60])
        p = random.choice([2, 4, 6, 8])
        ns = 120 * f / p
        return mcq(f"A single-phase, {p}-pole induction motor operates at {f} Hz. Its synchronous "
                   f"speed is:", fmt(round(ns, 2), "rpm"),
                   [fmt(round(60 * f / p, 2), "rpm"), fmt(round(120 * p / f, 2), "rpm"), fmt(round(ns / 2, 2), "rpm")],
                   f"N_s = 120f/P = 120\u00d7{f}/{p} = {round(ns,2)} rpm.")

    def slip_fwd():
        f, p = random.choice([50, 60]), random.choice([2, 4, 6, 8])
        ns = 120 * f / p
        n = round(ns * random.choice([0.90, 0.92, 0.93, 0.94, 0.95, 0.96, 0.97, 0.98]))
        s = (ns - n) / ns
        return mcq(f"A single-phase induction motor with N_s = {round(ns)} rpm runs at {n} rpm. "
                   f"The slip with respect to the forward field is:", fmt(round(s, 4)),
                   [fmt(round(2 - s, 4)), fmt(round(1 - s, 4)), fmt(round(s * 10, 4))],
                   f"s = (N_s\u2212N)/N_s = ({round(ns)}\u2212{n})/{round(ns)} = {round(s,4)}.")

    def slip_bwd():
        s = round(random.randint(10, 90) / 1000, 3)
        return mcq(f"A single-phase induction motor has a forward slip of {fmt(s)}. Its slip with "
                   f"respect to the backward field is:", fmt(round(2 - s, 3)),
                   [fmt(s), fmt(round(1 - s, 3)), fmt(round(1 + s, 3))],
                   f"Backward slip = 2 \u2212 s = 2 \u2212 {fmt(s)} = {round(2-s,3)}.")

    def cap_current():
        v, xc = random.choice([110, 200, 220, 230, 240]), random.randint(10, 120)
        return mcq(f"The starting capacitor of a single-phase motor has a reactance of {xc} \u03a9 across "
                   f"{v} V. The capacitor branch current is:", fmt(round(v / xc, 2), "A"),
                   [fmt(round(v * xc, 2), "A"), fmt(round(xc / v, 3), "A"), fmt(v, "A")],
                   f"I = V/X_C = {v}/{xc} = {round(v/xc,2)} A.")

    return batch([sync_speed1, slip_fwd, slip_bwd, cap_current], 90)


def t19_conceptual():
    return cset([
        ("A single-phase induction motor is:", ["Self-starting", "Not self-starting", "Always synchronous", "A DC machine"], 1, "It produces no starting torque on its own."),
        ("The reason a single-phase induction motor is not self-starting is that it produces:", ["A rotating field", "A pulsating (not rotating) field", "No flux", "DC flux"], 1, "A single winding gives a pulsating field."),
        ("According to double revolving field theory, the pulsating field is resolved into:", ["Two equal fields rotating in opposite directions", "One rotating field", "Three fields", "A DC field"], 0, "Two counter-rotating half-amplitude fields."),
        ("Once running, a single-phase induction motor continues to run because:", ["Both fields are equal", "The forward field torque dominates", "The backward field vanishes", "Slip becomes zero"], 1, "Forward torque exceeds backward torque once turning."),
        ("If forward slip is s, the backward slip is:", ["s", "1 \u2212 s", "2 \u2212 s", "1 + s"], 2, "Backward slip = 2 \u2212 s."),
        ("A split-phase motor achieves starting torque using:", ["A single winding", "Auxiliary (starting) winding with different R/X ratio", "DC excitation", "A commutator"], 1, "The auxiliary winding creates a phase difference."),
        ("A capacitor-start motor uses a capacitor in series with the:", ["Main winding", "Starting (auxiliary) winding", "Rotor", "Supply"], 1, "The capacitor is in the auxiliary winding."),
        ("The capacitor in a capacitor-start motor is disconnected by a:", ["Fuse", "Centrifugal switch", "Relay coil", "Commutator"], 1, "A centrifugal switch opens near 75% speed."),
        ("Which single-phase motor has the highest starting torque?", ["Shaded pole", "Capacitor-start", "Split-phase", "Reluctance"], 1, "Capacitor-start gives high starting torque."),
        ("A shaded-pole motor is used for:", ["Heavy industrial loads", "Small fans and light loads", "Traction", "Cranes"], 1, "Shaded-pole motors are small and low torque."),
        ("The efficiency of a shaded-pole motor is:", ["Very high", "Very low", "About 95%", "100%"], 1, "Shaded-pole motors are inefficient."),
        ("A capacitor-run motor has a capacitor that is:", ["Disconnected after starting", "Permanently in circuit", "In the rotor", "Across the supply only"], 1, "The run capacitor stays connected."),
        ("Single-phase induction motors are commonly used in:", ["Heavy industry", "Domestic appliances", "Power plants", "Traction"], 1, "Fans, pumps, refrigerators, washing machines."),
        ("The equivalent circuit of a single-phase induction motor considers:", ["Only forward field", "Both forward and backward fields", "Only backward field", "No fields"], 1, "Both counter-rotating fields are modelled."),
        ("At standstill in a single-phase motor, the forward and backward torques are:", ["Unequal", "Equal and opposite (net zero)", "Both zero", "Additive"], 1, "Equal and opposite torques \u2192 zero net starting torque."),
        ("The direction of rotation of a single-phase induction motor is reversed by:", ["Reversing supply leads", "Reversing the connections of the starting winding", "Changing frequency", "Adding a capacitor"], 1, "Reverse the auxiliary winding connections."),
        ("A universal motor can run on:", ["AC only", "Both AC and DC", "DC only", "Three-phase only"], 1, "Universal (series) motors work on AC and DC."),
        ("A permanent capacitor motor has a power factor that is:", ["Poor", "Improved", "Zero", "Leading always"], 1, "The run capacitor improves the power factor."),
        ("Single-phase induction motors are generally available in which power range?", ["Above 100 kW", "Fractional kW to a few kW", "Only 1 MW", "Only 50 kW"], 1, "They are typically fractional-horsepower machines."),
        ("Compared with three-phase motors of the same rating, single-phase motors have:", ["Higher efficiency", "Lower efficiency and power factor", "Identical performance", "No losses"], 1, "The backward field adds losses, lowering performance."),
    ])


# \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Topic 20: Synchronous Machines \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
def t20_numerical():
    def sync_speed_sm():
        f = random.choice([50, 60])
        p = random.choice([2, 4, 6, 8, 10, 12, 16])
        ns = 120 * f / p
        return mcq(f"A {p}-pole synchronous machine operates at {f} Hz. Its synchronous speed is:",
                   fmt(round(ns, 2), "rpm"),
                   [fmt(round(60 * f / p, 2), "rpm"), fmt(round(120 * p / f, 2), "rpm"),
                    fmt(round(ns / 2, 2), "rpm")],
                   f"N_s = 120f/P = 120\u00d7{f}/{p} = {round(ns,2)} rpm.")

    def poles_from_speed():
        f = random.choice([50, 60])
        p = random.choice([2, 4, 6, 8, 12])
        ns = 120 * f / p
        return mcq(f"A synchronous generator runs at {round(ns)} rpm on a {f} Hz system. "
                   f"The number of poles is:", fmt(p),
                   [fmt(p * 2), fmt(max(2, p // 2)), fmt(p + 2)],
                   f"P = 120f/N_s = 120\u00d7{f}/{round(ns)} = {p} poles.")

    def freq_from_speed():
        p = random.choice([2, 4, 6, 8])
        n = random.choice([1500, 1000, 750, 3000, 600])
        f = p * n / 120
        return mcq(f"A {p}-pole alternator runs at {n} rpm. The frequency of the generated EMF is:",
                   fmt(round(f, 2), "Hz"),
                   [fmt(round(120 * n / p, 2), "Hz"), fmt(round(n / p, 2), "Hz"), fmt(round(f * 2, 2), "Hz")],
                   f"f = PN/120 = {p}\u00d7{n}/120 = {round(f,2)} Hz.")

    def emf_alt():
        f = random.choice([50, 60])
        n = random.choice([100, 200, 300])
        phi = random.choice([0.02, 0.05, 0.03])
        kw = random.choice([0.95, 0.96, 1.0])
        e = 4.44 * kw * f * n * phi
        return mcq(f"An alternator winding has {n} turns/phase, winding factor {kw}, flux/pole "
                   f"{fmt(phi)} Wb at {f} Hz. The EMF per phase is:", fmt(round(e, 2), "V"),
                   [fmt(round(4.44 * f * n * phi, 2), "V"), fmt(round(1.11 * kw * f * n * phi, 2), "V"),
                    fmt(round(e / 2, 2), "V")],
                   f"E = 4.44\u00b7K_w\u00b7f\u00b7N\u00b7\u03a6 = 4.44\u00d7{kw}\u00d7{f}\u00d7{n}\u00d7{fmt(phi)} = {round(e,2)} V.")

    def voltage_reg_sm():
        enl = random.choice([440, 420, 250, 260])
        vfl = enl - random.choice([20, 40, 10, 30])
        reg = (enl - vfl) / vfl * 100
        return mcq(f"An alternator has a no-load EMF of {enl} V and a full-load terminal voltage of "
                   f"{vfl} V. Its voltage regulation is:", fmt(round(reg, 2), "%"),
                   [fmt(round((enl - vfl) / enl * 100, 2), "%"), fmt(round(enl - vfl, 2), "%"),
                    fmt(round(reg / 2, 2), "%")],
                   f"Regulation = (E\u2212V)/V \u00d7100 = ({enl}\u2212{vfl})/{vfl} = {round(reg,2)}%.")

    return batch([sync_speed_sm, poles_from_speed, freq_from_speed, emf_alt, voltage_reg_sm], 90)


def t20_conceptual():
    return cset([
        ("A synchronous motor always runs at:", ["Slip speed", "Synchronous speed", "Variable speed", "Above synchronous speed"], 1, "It runs exactly at N_s = 120f/P."),
        ("The synchronous speed is given by:", ["120P/f", "120f/P", "60f/P", "Pf/120"], 1, "N_s = 120f/P."),
        ("A synchronous motor is:", ["Self-starting", "Not self-starting", "Started by slip", "Always self-starting"], 1, "It develops no starting torque on its own."),
        ("A synchronous motor is usually started as a(n):", ["DC motor", "Induction motor using damper windings", "Series motor", "Universal motor"], 1, "Damper (amortisseur) windings give induction starting."),
        ("The field winding of a synchronous machine is excited by:", ["AC", "DC", "Pulsating current", "No supply"], 1, "The rotor field needs DC excitation."),
        ("In a synchronous generator, the armature winding is usually on the:", ["Rotor", "Stator", "Commutator", "Yoke"], 1, "Stationary armature simplifies HV connections."),
        ("An over-excited synchronous motor operates at a power factor that is:", ["Lagging", "Leading", "Unity only", "Zero"], 1, "Over-excitation gives leading pf."),
        ("An under-excited synchronous motor operates at a power factor that is:", ["Leading", "Lagging", "Unity", "Zero"], 1, "Under-excitation gives lagging pf."),
        ("A synchronous condenser is an over-excited synchronous motor running:", ["On full load", "On no load for power factor correction", "As a generator", "At slip speed"], 1, "It supplies reactive power to improve pf."),
        ("The V-curve of a synchronous motor is a plot of armature current versus:", ["Speed", "Field excitation", "Torque", "Time"], 1, "V-curves plot I_a against field current."),
        ("The torque angle (load angle) of a synchronous machine is the angle between:", ["V and I", "E and V (excitation and terminal voltage)", "Two phases", "Flux and current"], 1, "\u03b4 is between the excitation EMF and terminal voltage."),
        ("If the load on a synchronous motor increases, its speed:", ["Decreases", "Remains constant", "Increases", "Becomes zero"], 1, "Speed stays synchronous; the load angle increases."),
        ("Hunting in a synchronous machine refers to:", ["Loss of excitation", "Oscillation of the rotor about its equilibrium position", "Overheating", "Short circuit"], 1, "Hunting is rotor oscillation around the load angle."),
        ("Hunting is reduced by using:", ["Higher excitation", "Damper windings", "More poles", "Lower frequency"], 1, "Damper windings suppress oscillation."),
        ("The open-circuit characteristic of an alternator is a plot of:", ["Current vs speed", "No-load EMF vs field current", "Torque vs slip", "Power vs time"], 1, "OCC = no-load EMF against excitation."),
        ("The synchronous impedance method of finding regulation is also called the:", ["MMF method", "EMF method", "Potier method", "ZPF method"], 1, "It is known as the EMF method."),
        ("Salient pole rotors are used for:", ["High speed turbo-alternators", "Low speed hydro-generators", "Only motors", "DC machines"], 1, "Salient poles suit low-speed hydro machines."),
        ("Cylindrical (non-salient) pole rotors are used for:", ["Low speed machines", "High speed turbo-alternators", "Only single-phase", "DC generators"], 1, "Cylindrical rotors suit 3000 rpm turbo-alternators."),
        ("Two alternators can be paralleled only if voltage, frequency, phase sequence and which else match?", ["Power rating", "Phase (waveform in phase)", "Size", "Efficiency"], 1, "The voltages must also be in phase."),
        ("If a synchronous motor loses synchronism, it:", ["Runs faster", "Stalls / pulls out of step", "Runs as a generator", "Runs at half speed"], 1, "Beyond pull-out torque the motor loses synchronism."),
        ("The maximum torque a synchronous motor can develop occurs at a load angle of:", ["0\u00b0", "90\u00b0", "180\u00b0", "45\u00b0"], 1, "P \u221d sin\u03b4, maximum at \u03b4 = 90\u00b0."),
        ("Voltage regulation of an alternator at leading power factor may be:", ["Always positive", "Negative", "Always zero", "Infinite"], 1, "At leading pf, terminal voltage can rise \u2192 negative regulation."),
        ("Synchronous machines are used as generators in:", ["Torch lights", "Power stations", "Toys", "Watches"], 1, "Almost all bulk generation uses synchronous alternators."),
    ])


# \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Topic 21: Star-Delta & Equivalent Resistance \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
def t21_numerical():
    def delta_to_star_equal():
        r = random.choice([3, 6, 9, 12, 15, 18, 21, 24, 30, 33, 36, 45, 60, 90])
        return mcq(f"Three equal resistors of {r} \u03a9 are connected in delta. Each resistance of the "
                   f"equivalent star is:", fmt(round(r / 3, 3), "\u03a9"),
                   [fmt(3 * r, "\u03a9"), fmt(r, "\u03a9"), fmt(round(r / 2, 3), "\u03a9")],
                   f"Delta to star (equal): R_Y = R_\u0394/3 = {r}/3 = {round(r/3,3)} \u03a9.")

    def star_to_delta_equal():
        r = random.choice([2, 3, 4, 5, 6, 8, 9, 10, 12, 15, 20, 25, 30])
        return mcq(f"Three equal resistors of {r} \u03a9 are connected in star. Each resistance of the "
                   f"equivalent delta is:", fmt(3 * r, "\u03a9"),
                   [fmt(round(r / 3, 3), "\u03a9"), fmt(r, "\u03a9"), fmt(2 * r, "\u03a9")],
                   f"Star to delta (equal): R_\u0394 = 3R_Y = 3\u00d7{r} = {3*r} \u03a9.")

    def delta_to_star_general():
        rab, rbc, rca = random.randint(2, 30), random.randint(2, 30), random.randint(2, 30)
        s = rab + rbc + rca
        ra = rab * rca / s
        return mcq(f"A delta network has R_AB = {rab} \u03a9, R_BC = {rbc} \u03a9 and R_CA = {rca} \u03a9. "
                   f"The equivalent star resistance at node A is:", fmt(round(ra, 3), "\u03a9"),
                   [fmt(round(rab * rbc / s, 3), "\u03a9"), fmt(round(rbc * rca / s, 3), "\u03a9"),
                    fmt(round(s / 3, 3), "\u03a9")],
                   f"R_A = (R_AB\u00d7R_CA)/(R_AB+R_BC+R_CA) = ({rab}\u00d7{rca})/{s} = {round(ra,3)} \u03a9.")

    def star_to_delta_general():
        ra, rb, rc = random.randint(2, 20), random.randint(2, 20), random.randint(2, 20)
        rab = ra + rb + ra * rb / rc
        return mcq(f"A star network has R_A = {ra} \u03a9, R_B = {rb} \u03a9 and R_C = {rc} \u03a9. "
                   f"The equivalent delta resistance R_AB is:", fmt(round(rab, 3), "\u03a9"),
                   [fmt(round(ra + rb, 3), "\u03a9"), fmt(round(rb + rc + rb * rc / ra, 3), "\u03a9"),
                    fmt(round(ra * rb / rc, 3), "\u03a9")],
                   f"R_AB = R_A + R_B + (R_A\u00b7R_B)/R_C = {ra}+{rb}+({ra}\u00d7{rb})/{rc} = {round(rab,3)} \u03a9.")

    def wheatstone_balance():
        r1, r2, r3 = random.randint(2, 40), random.randint(2, 40), random.randint(2, 40)
        r4 = r2 * r3 / r1
        return mcq(f"In a Wheatstone bridge, R1 = {r1} \u03a9, R2 = {r2} \u03a9 and R3 = {r3} \u03a9. "
                   f"For balance, the fourth arm R4 must be:", fmt(round(r4, 3), "\u03a9"),
                   [fmt(round(r1 * r2 / r3, 3), "\u03a9"), fmt(round(r1 * r3 / r2, 3), "\u03a9"),
                    fmt(round(r1 + r2 + r3, 3), "\u03a9")],
                   f"Balance: R1/R2 = R3/R4 \u21d2 R4 = R2\u00b7R3/R1 = ({r2}\u00d7{r3})/{r1} = {round(r4,3)} \u03a9.")

    def delta_terminal_r():
        ra, rb, rc = random.randint(2, 25), random.randint(2, 25), random.randint(2, 25)
        req = ra * (rb + rc) / (ra + rb + rc)
        return mcq(f"A delta network has sides {ra} \u03a9 (A-B), {rb} \u03a9 (B-C) and {rc} \u03a9 (C-A). "
                   f"The resistance measured between terminals A and B is:", fmt(round(req, 3), "\u03a9"),
                   [fmt(ra, "\u03a9"), fmt(round(ra + rb + rc, 3), "\u03a9"), fmt(round(rb + rc, 3), "\u03a9")],
                   f"R_AB = R_AB \u2225 (R_BC + R_CA) = {ra}\u2225({rb}+{rc}) = {round(req,3)} \u03a9.")

    def two_parallel_pairs():
        a, b, c, d = (random.randint(2, 20), random.randint(2, 20),
                      random.randint(2, 20), random.randint(2, 20))
        req = a * b / (a + b) + c * d / (c + d)
        return mcq(f"({a} \u03a9 \u2225 {b} \u03a9) is connected in series with ({c} \u03a9 \u2225 {d} \u03a9). "
                   f"The total resistance is:", fmt(round(req, 3), "\u03a9"),
                   [fmt(a + b + c + d, "\u03a9"), fmt(round((a + b) * (c + d) / (a + b + c + d), 3), "\u03a9"),
                    fmt(round(req / 2, 3), "\u03a9")],
                   f"R = ({a}\u2225{b}) + ({c}\u2225{d}) = {round(a*b/(a+b),3)} + {round(c*d/(c+d),3)} = {round(req,3)} \u03a9.")

    def three_parallel():
        a, b, c = random.randint(2, 24), random.randint(2, 24), random.randint(2, 24)
        req = 1 / (1 / a + 1 / b + 1 / c)
        return mcq(f"Three resistors {a} \u03a9, {b} \u03a9 and {c} \u03a9 are connected in parallel. "
                   f"The equivalent resistance is:", fmt(round(req, 3), "\u03a9"),
                   [fmt(a + b + c, "\u03a9"), fmt(round((a + b + c) / 3, 3), "\u03a9"),
                    fmt(round(a * b * c / (a + b + c), 3), "\u03a9")],
                   f"1/R = 1/{a}+1/{b}+1/{c} \u21d2 R = {round(req,3)} \u03a9.")

    return batch([delta_to_star_equal, star_to_delta_equal, delta_to_star_general,
                  star_to_delta_general, wheatstone_balance, delta_terminal_r,
                  two_parallel_pairs, three_parallel], 90)


def t21_conceptual():
    return cset([
        ("A star network of three equal resistances R is equivalent to a delta of:", ["R/3 each", "3R each", "R each", "2R each"], 1, "R_\u0394 = 3R_Y for equal resistances."),
        ("A delta network of three equal resistances R is equivalent to a star of:", ["3R each", "R/3 each", "R each", "R/2 each"], 1, "R_Y = R_\u0394/3 for equal resistances."),
        ("The star-delta transformation is used to simplify networks that are:", ["Purely series", "Neither purely series nor purely parallel", "Only parallel", "Open circuited"], 1, "It handles bridge-type networks that resist series/parallel reduction."),
        ("Star connection is also known as:", ["Mesh connection", "Wye (Y) or T connection", "Delta connection", "Pi connection"], 1, "Star = Y or T configuration."),
        ("Delta connection is also known as:", ["Y connection", "Mesh or Pi (\u03c0) connection", "T connection", "Star connection"], 1, "Delta = mesh or \u03c0 configuration."),
        ("In a delta-to-star conversion, each star resistance equals the product of the two adjacent delta resistances divided by:", ["Their difference", "The sum of all three delta resistances", "The third resistance", "Three"], 1, "R_A = (R_AB\u00b7R_CA)/\u03a3R."),
        ("In a star-to-delta conversion, R_AB equals R_A + R_B plus:", ["R_C", "(R_A\u00b7R_B)/R_C", "R_A\u00b7R_B", "(R_A+R_B)/R_C"], 1, "R_AB = R_A + R_B + R_A R_B/R_C."),
        ("A Wheatstone bridge is balanced when:", ["All arms are equal only", "The ratio of adjacent arms is equal (R1/R2 = R3/R4)", "The supply is zero", "The galvanometer is removed"], 1, "Balance condition: R1/R2 = R3/R4."),
        ("At balance, the current through the galvanometer of a Wheatstone bridge is:", ["Maximum", "Zero", "Half the supply current", "Infinite"], 1, "No potential difference across it \u21d2 zero current."),
        ("A balanced Wheatstone bridge can be solved without star-delta because:", ["It has no resistors", "The bridge arm carries no current and can be removed", "It is purely series", "It is non-linear"], 1, "The zero-current arm can be opened or shorted."),
        ("The equivalent resistance of n equal resistors R in parallel is:", ["nR", "R/n", "R", "R+n"], 1, "Equal parallel resistors: R/n."),
        ("Star-delta transformation is valid for:", ["Only DC circuits", "Both DC and AC (with impedances)", "Only AC circuits", "Only non-linear circuits"], 1, "It applies to impedances in AC too."),
        ("When converting star to delta, the delta resistances are generally:", ["Smaller than the star values", "Larger than the star values", "Equal to them", "Zero"], 1, "Delta values are larger (3\u00d7 for the balanced case)."),
        ("Three resistances connected between three terminals with a common node form a:", ["Delta", "Star", "Bridge", "Ladder"], 1, "A common (neutral) node defines a star."),
        ("Three resistances connected in a closed loop between three terminals form a:", ["Star", "Delta", "T network", "Y network"], 1, "A closed triangular loop is a delta."),
        ("The total resistance of resistors in series is always:", ["Less than the smallest", "Greater than the largest", "Equal to the average", "Zero"], 1, "Series resistances add, exceeding the largest."),
        ("A star-delta starter for induction motors is based on the fact that star connection reduces the:", ["Frequency", "Applied phase voltage (and hence starting current)", "Number of poles", "Torque angle only"], 1, "Star gives V_L/\u221a3 per phase, cutting starting current."),
        ("If one arm of a delta network is open, the network becomes:", ["A star", "Two resistors in series", "A short circuit", "Unchanged"], 1, "The remaining two arms form a series path."),
        ("Star-delta conversion preserves:", ["Internal node voltages", "The terminal (external) behaviour of the network", "Power dissipation in each element", "The number of elements"], 1, "Equivalence holds only at the three external terminals."),
        ("The unbalanced Wheatstone bridge is most conveniently solved using:", ["Ohm's law alone", "Star-delta transformation or Thevenin's theorem", "Series reduction only", "Superposition only"], 1, "Bridge networks need \u0394-Y or Thevenin."),
        ("For three unequal resistances in delta, the sum used in the conversion denominator is:", ["The product of all three", "The sum of all three", "The largest one", "The smallest one"], 1, "Denominator = R_AB + R_BC + R_CA."),
        ("Equivalent resistance between any two terminals of a balanced delta of R each is:", ["R", "2R/3", "3R", "R/3"], 1, "R \u2225 2R = 2R/3."),
    ])


TOPICS = {
    "t1": ("Topic 1 \u2014 Circuit Elements (R, L, C, Diode)", t1_numerical, t1_conceptual),
    "t2": ("Topic 2 \u2014 DC Circuit Analysis (KCL, KVL, Mesh & Nodal)", t2_numerical, t2_conceptual),
    "t3": ("Topic 3 \u2014 Network Theorems", t3_numerical, t3_conceptual),
    "t4": ("Topic 4 \u2014 First-Order Transients (RL, RC)", t4_numerical, t4_conceptual),
    "t5": ("Topic 5 \u2014 Second-Order Transients (RLC)", t5_numerical, t5_conceptual),
    "t6": ("Topic 6 \u2014 Single-Phase AC Circuits", t6_numerical, t6_conceptual),
    "t7": ("Topic 7 \u2014 Resonance in AC Circuits", t7_numerical, t7_conceptual),
    "t8": ("Topic 8 \u2014 Three-Phase AC Circuits", t8_numerical, t8_conceptual),
    "t9": ("Topic 9 \u2014 Diode Circuits (Rectifiers, Clippers, Clampers)", t9_numerical, t9_conceptual),
    "t10": ("Topic 10 \u2014 Two-Port Networks", t10_numerical, t10_conceptual),
    "t11": ("Topic 11 \u2014 Bipolar Junction Transistor (BJT)", t11_numerical, t11_conceptual),
    "t12": ("Topic 12 \u2014 Operational Amplifiers", t12_numerical, t12_conceptual),
    "t13": ("Topic 13 \u2014 Digital Circuits", t13_numerical, t13_conceptual),
    "t14": ("Topic 14 \u2014 Magnetic Circuits", t14_numerical, t14_conceptual),
    "t15": ("Topic 15 \u2014 Transformers", t15_numerical, t15_conceptual),
    "t16": ("Topic 16 \u2014 Electromechanical Energy Conversion", t16_numerical, t16_conceptual),
    "t17": ("Topic 17 \u2014 DC Machines", t17_numerical, t17_conceptual),
    "t18": ("Topic 18 \u2014 Three-Phase Induction Motor", t18_numerical, t18_conceptual),
    "t19": ("Topic 19 \u2014 Single-Phase Induction Motor", t19_numerical, t19_conceptual),
    "t20": ("Topic 20 \u2014 Synchronous Machines", t20_numerical, t20_conceptual),
    "t21": ("Topic 21 \u2014 Star-Delta Transformation & Equivalent Resistance",
            t21_numerical, t21_conceptual),
}


def build_pdf(key):
    title, num_fn, con_fn = TOPICS[key]
    con = con_fn()
    num = num_fn()
    need = max(0, 100 - len(con))          # keep every concept question, fill to 100 with numericals
    questions = con + num[:need]
    random.shuffle(questions)

    styles = getSampleStyleSheet()
    base = ParagraphStyle("q", parent=styles["Normal"], fontName="AppFont", fontSize=10.5, leading=14)
    opt = ParagraphStyle("o", parent=base, leftIndent=14)
    ans = ParagraphStyle("a", parent=base, textColor=colors.HexColor("#137a3f"), fontName="AppFont-Bold", leftIndent=14, spaceAfter=8)
    h1 = ParagraphStyle("h1", parent=styles["Title"], fontName="AppFont-Bold", fontSize=20)
    sub = ParagraphStyle("sub", parent=styles["Normal"], fontName="AppFont", fontSize=11, textColor=colors.grey, spaceAfter=4)

    story = [Paragraph("ELL 1000 \u2014 Introduction to Electrical Engineering", h1),
             Paragraph(sanitize("Question Bank \u00b7 " + title), sub),
             Paragraph(f"{len(questions)} multiple-choice questions with answers &amp; worked solutions. "
                       "Numerical answers are computed (verified correct).", sub),
             Spacer(1, 8)]

    def esc(t):
        t = sanitize(str(t))
        return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

    for i, q in enumerate(questions, 1):
        story.append(Paragraph(f"<b>Q{i}.</b> {esc(q['q'])}", base))
        for j, o in enumerate(q["options"]):
            story.append(Paragraph(f"({LETTERS[j]}) {esc(o)}", opt))
        story.append(Paragraph(f"Answer: {LETTERS[q['answer']]}. &nbsp;{esc(q['sol'])}", ans))

    slug = title.split(chr(0x2014))[1].strip().split("(")[0].strip()
    slug = re.sub(r"[^A-Za-z0-9]+", "_", slug).strip("_")
    out_path = os.path.join(OUT_DIR, f"ELL1000_{key}_{slug}.pdf")
    doc = SimpleDocTemplate(out_path, pagesize=A4, topMargin=15 * mm, bottomMargin=15 * mm,
                            leftMargin=16 * mm, rightMargin=16 * mm, title=title)
    doc.build(story)
    print(f"{len(questions)} questions -> {out_path}")
    return out_path


if __name__ == "__main__":
    args = sys.argv[1:] or ["t1"]
    keys = list(TOPICS.keys()) if args == ["all"] else args
    for k in keys:
        build_pdf(k)
