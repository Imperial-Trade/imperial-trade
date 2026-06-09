/**
 * Fails CI/local checks when a function uses duplicate parameter or binding names.
 * Catches: function foo(a, a), ({ a, a }), (name, { name }), arrow with duplicate _, etc.
 */
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name === "dist" || ent.name === ".git") continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else if (/\.(tsx?|jsx?|mjs|cjs)$/.test(ent.name)) acc.push(p);
  }
  return acc;
}

function bindingNames(pattern) {
  const names = [];
  for (const el of pattern.elements) {
    if (!ts.isBindingElement(el)) continue;
    let key = null;
    if (el.propertyName) {
      if (ts.isIdentifier(el.propertyName)) key = el.propertyName.text;
      else if (ts.isStringLiteral(el.propertyName)) key = el.propertyName.text;
    } else if (ts.isIdentifier(el.name)) {
      key = el.name.text;
    }
    if (key) names.push({ name: key, pos: el.getStart() });
  }
  return names;
}

function checkFunctionLike(sf, node, rel, issues) {
  const line = (pos) => sf.getLineAndCharacterOfPosition(pos).line + 1;
  const outer = [];
  const destructured = new Set();

  for (const p of node.parameters) {
    if (ts.isIdentifier(p.name)) {
      outer.push({ name: p.name.text, pos: p.name.getStart() });
    } else if (ts.isObjectBindingPattern(p.name)) {
      for (const b of bindingNames(p.name)) destructured.add(b.name);
    }
  }

  for (const o of outer) {
    if (destructured.has(o.name)) {
      issues.push(`${rel}:${line(o.pos)} parameter "${o.name}" conflicts with destructured field`);
    }
  }

  const all = [];
  for (const p of node.parameters) {
    if (ts.isIdentifier(p.name)) all.push({ name: p.name.text, pos: p.name.getStart() });
    else if (ts.isObjectBindingPattern(p.name)) all.push(...bindingNames(p.name));
  }

  const seen = new Set();
  for (const { name, pos } of all) {
    if (seen.has(name)) {
      issues.push(`${rel}:${line(pos)} duplicate parameter/binding "${name}"`);
    }
    seen.add(name);
  }
}

const issues = [];
for (const file of walk(SRC)) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  const text = fs.readFileSync(file, "utf8");
  const kind = file.endsWith(".tsx")
    ? ts.ScriptKind.TSX
    : file.endsWith(".ts")
      ? ts.ScriptKind.TS
      : ts.ScriptKind.JS;
  const sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, kind);

  function visit(node) {
    if (ts.isFunctionLike(node)) checkFunctionLike(sf, node, rel, issues);
    ts.forEachChild(node, visit);
  }
  visit(sf);
}

if (issues.length > 0) {
  console.error("Duplicate parameter names found:\n");
  for (const i of issues) console.error(`  ${i}`);
  process.exit(1);
}

console.log("No duplicate parameter names in src/");
