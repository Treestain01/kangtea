// PostToolUse hook. After any Edit, Write or MultiEdit that touches a webapp UI file,
// inject a reminder to run the webapp:responsive-ui skill before finishing.
// Registered in .claude/settings.json. Prints nothing for every other file.
//
// stdin is read asynchronously: fs.readFileSync(0) is unreliable on Windows pipes.
// A leading BOM is stripped: Windows PowerShell 5.1 prepends U+FEFF to piped text.

async function readStdin() {
  let data = '';
  for await (const chunk of process.stdin) {
    data += chunk;
  }
  return data.replace(/^﻿/, '');
}

function isWebappUiFile(filePath) {
  const normalized = String(filePath ?? '').replace(/\\/g, '/');
  return /(^|\/)webapp\/.*\.(tsx|css)$/.test(normalized) && !/\.test\.tsx$/.test(normalized);
}

function reminderFor(filePath) {
  return [
    `You edited a webapp UI file: ${String(filePath).replace(/\\/g, '/')}.`,
    'Before finishing this change, invoke the webapp:responsive-ui skill and complete its checklist:',
    'verify at 390px and 1280px, colours only via var(--color-*) from webapp/src/theme/tokens.css,',
    'breakpoints only 768px and 1024px, touch targets at least 44px, and report what was checked.',
  ].join(' ');
}

let payload;
try {
  payload = JSON.parse(await readStdin());
} catch {
  process.exit(0);
}

const filePath = payload?.tool_input?.file_path;
if (!isWebappUiFile(filePath)) {
  process.exit(0);
}

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: reminderFor(filePath) },
  }),
);
