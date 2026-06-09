#!/usr/bin/env node
// Wraps bare <word> angle-bracket patterns in backticks so Vue's template
// compiler doesn't treat them as unclosed HTML elements in the docs build.
// Runs as part of the semantic-release prepareCmd, after CHANGELOG.md is
// generated and before it is committed.
import fs from 'fs';
import { resolve } from 'path';

const file = resolve('CHANGELOG.md');
const content = fs.readFileSync(file, 'utf8');

// Match <word> not already wrapped in backticks (lookbehind/lookahead).
// Only targets lowercase identifiers — safe to skip real HTML tags (which
// would have attributes or uppercase) and markdown code spans.
const sanitized = content.replace(/(?<!`)<([a-z][a-z0-9_-]*)>(?!`)/g, '`<$1>`');

if (sanitized !== content) {
  fs.writeFileSync(file, sanitized);
  const count = (content.match(/(?<!`)<([a-z][a-z0-9_-]*)>(?!`)/g) || []).length;
  process.stdout.write(`sanitize-changelog: escaped ${count} bare tag(s) in CHANGELOG.md\n`);
}
