// Minimal example: one area, two open questions, a handful of auto-graded ones.
// Shows that the structure comes from the data: any number of areas, any mix and count of question types.
// Build: node scripts/build.js examples/minimal.quiz.js out.html
module.exports = {
  meta: {
    slug: "example-ohms-law",
    title: "Circuits Warm-up Quiz",
    eyebrow: "Example · Electrical engineering basics",
    intro: "A short example quiz on resistive circuits.",
    notices: [{ text: "Closed book, no formula sheet" }],
    footer: "Progress is saved privately to your account."
  },
  areas: [{ id: "A", name: "Resistive circuits", short: "Circuits" }],
  questions: [
    {
      id: "A1", v: 1, area: "A", topic: "Ohm's law", type: "calc",
      prompt: "A 12 V battery drives a single 470 Ω resistor.",
      noGiveaway: ["V = IR", "I = V/R", "V/R"],
      parts: [
        { label: "(a)", text: "What current flows through the resistor, in mA?", unit: "mA", ans: 25.53, tol: 0.02, sig: 3, wrong: [39.17] },
        { label: "(b)", text: "What power does the resistor dissipate, in W?", unit: "W", ans: 0.3064, tol: 0.02, sig: 3, wrong: [5640] }
      ],
      explain: "I = V/R = 12 / 470 = 0.02553 A = <b>25.5 mA</b>.<br>P = V²/R = 144 / 470 = <b>0.306 W</b>.<br>Common slip: R/V = 39.2 or V·R."
    },
    {
      id: "A2", v: 1, area: "A", topic: "Series and parallel", type: "mcq",
      prompt: "Two 100 Ω resistors are connected in parallel. What is the equivalent resistance?",
      options: ["50 Ω, half of either resistor", "200 Ω, the sum of both resistors", "100 Ω, the same as either one", "25 Ω, a quarter of either one"],
      correct: 0,
      explain: "Parallel: 1/R = 1/100 + 1/100, so R = 50 Ω. 200 Ω is the series value."
    },
    {
      id: "A3", v: 1, area: "A", topic: "Series and parallel", type: "tf",
      prompt: "True or false?",
      items: [
        { s: "Resistors in series carry the same current.", a: true },
        { s: "Resistors in parallel always share the current equally.", a: false },
        { s: "Adding a resistor in parallel lowers the equivalent resistance.", a: true }
      ],
      explain: "Parallel branches share the same voltage; the current splits in inverse proportion to resistance, so it is equal only for equal resistors."
    },
    {
      id: "A4", v: 1, area: "A", topic: "Measurement", type: "order",
      prompt: "Put the steps for measuring a resistor's current with a multimeter in order.",
      items: ["Switch off the circuit", "Set the meter to the current range", "Break the circuit and insert the meter in series", "Switch the circuit on and read the value"],
      pts: 2,
      explain: "An ammeter goes in series, and you only break a circuit while it is off."
    },
    {
      id: "A5", v: 1, area: "A", topic: "Ohm's law", type: "open",
      prompt: "Explain why a short circuit across a battery is dangerous.",
      rubric: [
        { text: "Resistance near zero, so the current becomes very large (I = V/R)", pts: 1, keys: ["large current", "high current", "resistance", "zero"] },
        { text: "Power is dissipated as heat in the wires and the battery", pts: 1, keys: ["heat", "power", "hot"] },
        { text: "Risk of fire, burns or battery damage", pts: 1, keys: ["fire", "burn", "damage", "explode"] }
      ],
      model: "A short circuit puts almost zero resistance across the battery, so by Ohm's law the current is limited only by the battery's internal resistance and becomes very large. That current dissipates a lot of power as heat in the wires and inside the battery, which can melt insulation, start a fire, or damage or rupture the battery.",
      explain: "Key chain: tiny R → huge I → large I²R heating → fire or damage."
    },
    {
      id: "A6", v: 1, area: "A", topic: "Power", type: "open",
      prompt: "Compare a 60 W and a 100 W lamp on the same 230 V supply: which one has the higher resistance, and why?",
      rubric: [
        { text: "The 60 W lamp has the higher resistance", pts: 1, keys: ["60 w", "60w", "lower power"] },
        { text: "Uses P = V²/R at fixed V, so R = V²/P", pts: 1, keys: ["v²/r", "v^2/r", "v²/p", "v^2/p", "fixed voltage", "same voltage"] },
        { text: "Gives values: about 882 Ω vs 529 Ω", pts: 1, keys: ["882", "529"] }
      ],
      model: "At the same voltage, P = V²/R, so R = V²/P: the lower-power lamp has the higher resistance. 60 W: 230²/60 ≈ 882 Ω; 100 W: 230²/100 = 529 Ω.",
      explain: "At fixed voltage, power and resistance are inversely related."
    }
  ]
};
