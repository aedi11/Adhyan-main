#!/usr/bin/env python3
"""
Export the generated ELL 1000 question bank into the Adhyan app.

Produces src/lib/data/ell1000-bank.json:
    { "topics": [{id,title,blurb,questionIds}], "questions": [{id,prompt,options,explanation}] }

Unlike the PDF build we do NOT down-convert maths glyphs here — browsers have
full Unicode fonts, so ⇒ ∝ ∥ ⊕ and subscripts render correctly on screen. We do
still normalise a trailing ".0" so an option and its solution read the same.

Run: python scripts/qbank/export_app.py
"""
import json, os, random, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gen  # noqa: E402

OUT = os.path.join("src", "lib", "data", "ell1000-bank.json")

# Short blurb per topic (shown under the topic heading in the teacher view).
BLURBS = {
    "t1": "Linear/non-linear elements, R, L, C and the diode.",
    "t2": "Sources, source transformation, KCL/KVL, mesh and nodal analysis.",
    "t3": "Thevenin, Norton, superposition and maximum power transfer.",
    "t4": "Natural and step response of RL and RC circuits.",
    "t5": "Source-free and step response of series/parallel RLC circuits.",
    "t6": "Sinusoids, phasors, RMS, impedance and AC power.",
    "t7": "Series and parallel resonance, Q factor and bandwidth.",
    "t8": "Star/delta connections, line and phase quantities, three-phase power.",
    "t9": "Half-wave, full-wave and bridge rectifiers, clippers and clampers.",
    "t10": "Z, Y, hybrid and ABCD parameters; reciprocity and symmetry.",
    "t11": "BJT construction, configurations, biasing and characteristics.",
    "t12": "Ideal op-amp, inverting/non-inverting, summing and integrator circuits.",
    "t13": "Logic gates, Boolean algebra, number systems and K-maps.",
    "t14": "MMF, reluctance, flux density and the B-H curve.",
    "t15": "EMF equation, losses, efficiency, regulation and testing.",
    "t16": "Field energy, coenergy, force of alignment and energy balance.",
    "t17": "EMF and torque equations, characteristics and speed control.",
    "t18": "Rotating field, slip, rotor frequency, torque and starting.",
    "t19": "Double revolving field theory and starting methods.",
    "t20": "Synchronous speed, excitation, V-curves and regulation.",
    "t21": "Star-delta conversion, equivalent resistance and Wheatstone bridge.",
}


def tidy(text: str) -> str:
    """Normalise a trailing '.0' so options and solutions agree."""
    return re.sub(r"(?<=\d)\.0(?![0-9])", "", str(text))


def main():
    topics, questions = [], []
    for idx, key in enumerate(gen.TOPICS):
        title, num_fn, con_fn = gen.TOPICS[key]
        random.seed(1000 + idx)              # reproducible per topic
        con = con_fn()
        num = num_fn()
        items = con + num[: max(0, 100 - len(con))]
        random.shuffle(items)

        qids = []
        for i, it in enumerate(items, 1):
            qid = f"ell-{key}-q{i:03d}"
            qids.append(qid)
            questions.append({
                "id": qid,
                "prompt": tidy(it["q"]),
                "options": [
                    {"id": "abcd"[j], "text": tidy(o), "correct": j == it["answer"]}
                    for j, o in enumerate(it["options"])
                ],
                "explanation": tidy(it["sol"]),
            })

        topics.append({
            "id": key,
            "title": title.split("—", 1)[1].strip(),
            "blurb": BLURBS.get(key, ""),
            "questionIds": qids,
        })

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump({"topics": topics, "questions": questions}, f, ensure_ascii=False, indent=0)

    size = os.path.getsize(OUT) / 1024
    print(f"topics: {len(topics)}  questions: {len(questions)}  ->  {OUT}  ({size:.0f} KB)")
    for t in topics:
        assert len(t["questionIds"]) == 100, (t["id"], len(t["questionIds"]))
    print("all topics have exactly 100 questions")


if __name__ == "__main__":
    main()
