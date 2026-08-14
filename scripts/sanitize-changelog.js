#!/usr/bin/env node
// Wraps bare <word> angle-bracket patterns in backticks so Vue's template
// compiler doesn't treat them as unclosed HTML elements in the docs build.
// Runs as part of the semantic-release prepareCmd, after CHANGELOG.md is
// generated and before it is committed.
import fs from 'fs';
import { resolve } from 'path';

const file = resolve('CHANGELOG.md');
const content = fs.readFileSync(file, 'utf8');

// Wrap bare <word> angle-bracket patterns in backticks so Vue's template
// compiler doesn't treat them as unclosed HTML elements in the docs build.
// Match inline code spans FIRST and leave them untouched, so a token already
// inside a span (e.g. `~/.codevoyant/<project-slug>/`) is never wrapped — doing
// so would split the span and leave a permanently-broken bare tag behind.
const tokenRe = /(`[^`\n]*`)|<[a-z][a-z0-9_-]*>/g;
let escaped = 0;
const sanitized = content.replace(tokenRe, (match, codeSpan) => {
  if (codeSpan) return codeSpan; // inside inline code — leave as-is
  escaped++;
  return '`' + match + '`'; // bare <word> — wrap it
});

if (sanitized !== content) {
  fs.writeFileSync(file, sanitized);
  process.stdout.write(`sanitize-changelog: escaped ${escaped} bare tag(s) in CHANGELOG.md\n`);
}
