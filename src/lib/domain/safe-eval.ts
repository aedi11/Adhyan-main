/**
 * Safe arithmetic evaluator for parameterized question answer formulas.
 *
 * This is deliberately NOT JavaScript `eval`. It supports only numbers,
 * named variables, the operators + - * / % ^, and parentheses. This is the
 * component that owns correctness for quantitative questions — the AI is never
 * allowed to compute an answer key (it would hallucinate). See PROJECT_PLAN.md.
 */

type Token = { type: "num" | "var" | "op" | "lparen" | "rparen"; value: string };

const PRECEDENCE: Record<string, number> = {
  "+": 1,
  "-": 1,
  "*": 2,
  "/": 2,
  "%": 2,
  "^": 3,
};
const RIGHT_ASSOC = new Set(["^"]);

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (ch === " ") {
      i++;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let num = "";
      while (i < expr.length && /[0-9.]/.test(expr[i])) num += expr[i++];
      tokens.push({ type: "num", value: num });
      continue;
    }
    if (/[a-zA-Z_]/.test(ch)) {
      let name = "";
      while (i < expr.length && /[a-zA-Z0-9_]/.test(expr[i])) name += expr[i++];
      tokens.push({ type: "var", value: name });
      continue;
    }
    if ("+-*/%^".includes(ch)) {
      tokens.push({ type: "op", value: ch });
      i++;
      continue;
    }
    if (ch === "(") {
      tokens.push({ type: "lparen", value: ch });
      i++;
      continue;
    }
    if (ch === ")") {
      tokens.push({ type: "rparen", value: ch });
      i++;
      continue;
    }
    throw new Error(`Unexpected character "${ch}" in formula`);
  }
  return tokens;
}

/** Shunting-yard to RPN, then evaluate. */
export function safeEval(expr: string, vars: Record<string, number>): number {
  const tokens = tokenize(expr);
  const output: Token[] = [];
  const ops: Token[] = [];

  for (const t of tokens) {
    if (t.type === "num" || t.type === "var") {
      output.push(t);
    } else if (t.type === "op") {
      while (
        ops.length &&
        ops[ops.length - 1].type === "op" &&
        (RIGHT_ASSOC.has(t.value)
          ? PRECEDENCE[ops[ops.length - 1].value] > PRECEDENCE[t.value]
          : PRECEDENCE[ops[ops.length - 1].value] >= PRECEDENCE[t.value])
      ) {
        output.push(ops.pop()!);
      }
      ops.push(t);
    } else if (t.type === "lparen") {
      ops.push(t);
    } else if (t.type === "rparen") {
      while (ops.length && ops[ops.length - 1].type !== "lparen") {
        output.push(ops.pop()!);
      }
      if (!ops.length) throw new Error("Mismatched parentheses");
      ops.pop(); // discard lparen
    }
  }
  while (ops.length) {
    const op = ops.pop()!;
    if (op.type === "lparen") throw new Error("Mismatched parentheses");
    output.push(op);
  }

  const stack: number[] = [];
  for (const t of output) {
    if (t.type === "num") {
      stack.push(parseFloat(t.value));
    } else if (t.type === "var") {
      if (!(t.value in vars)) throw new Error(`Unknown variable "${t.value}"`);
      stack.push(vars[t.value]);
    } else if (t.type === "op") {
      const b = stack.pop();
      const a = stack.pop();
      if (a === undefined || b === undefined) throw new Error("Invalid expression");
      switch (t.value) {
        case "+": stack.push(a + b); break;
        case "-": stack.push(a - b); break;
        case "*": stack.push(a * b); break;
        case "/": stack.push(a / b); break;
        case "%": stack.push(a % b); break;
        case "^": stack.push(Math.pow(a, b)); break;
      }
    }
  }
  if (stack.length !== 1) throw new Error("Invalid expression");
  return stack[0];
}
