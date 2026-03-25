# style-synthesize

Visit a live URL, screenshot across breakpoints via browser automation, and synthesize the visual style into a Markdown report and CSS custom-property theme file.

## Step 0: Parse Args

Extract from arguments:

- `SOURCE_URL` = first non-flag argument that starts with `http`. If absent, ask: "What URL should we analyze?"
- `NAME` = value after `--name` flag. If absent, derive from URL domain (e.g. `linear.app` -> `linear`, `www.stripe.com` -> `stripe`)
- `SOURCE_SLUG` = slugified NAME (see `references/utils.md` for slug derivation)
- `OUTPUT_DIR = docs/ux/style-research/{SOURCE_SLUG}/`
- `BG_MODE = true` if `--bg` is present
- `SILENT = true` if `--silent` is present

Create the output directory:

```bash
mkdir -p {OUTPUT_DIR}/screenshots
```

## Step 1: Open the Site

Use `mcp__claude-in-chrome__tabs_context_mcp` to check current tabs.

Open a new tab:

```
mcp__claude-in-chrome__tabs_create_mcp
```

Navigate to `SOURCE_URL`:

```
mcp__claude-in-chrome__navigate: { url: SOURCE_URL, tabId: TAB_ID }
```

Wait for the page to load (2-3 seconds).

## Step 2: Screenshot Across Breakpoints

For each breakpoint in [375, 768, 1440]:

1. Resize the browser window (see `references/utils.md` for resize-before-screenshot pattern):

```
mcp__claude-in-chrome__resize_window: { width: {breakpoint}, height: 900, tabId: TAB_ID }
```

2. Scroll to top and wait 1 second for reflow.

3. Take a screenshot and save to `{OUTPUT_DIR}/screenshots/{breakpoint}w.png`:

```
mcp__claude-in-chrome__computer: { action: "screenshot", tabId: TAB_ID }
```

Save the screenshot image. Note the breakpoint width in your analysis.

4. Read the page text for content context:

```
mcp__claude-in-chrome__get_page_text: { tabId: TAB_ID }
```

Capture visual observations for each breakpoint: layout changes, element visibility, spacing shifts, font size adjustments.

## Step 3: Analyze the Design

Based on screenshots and page content, extract:

**Color palette:**
- Background color(s) -- primary bg, card bg, sidebar bg
- Text color(s) -- primary, secondary, muted
- Brand/accent color(s) -- primary action, links, highlights
- Border and divider colors
- Status colors if present (success, error, warning)

**Typography:**
- Font families (heading, body, mono if present)
- Heading scale (H1-H4 approximate sizes and weights)
- Body text size and line height
- Letter spacing patterns (e.g. uppercase tracking on labels)

**Spacing and layout:**
- Container max-width and horizontal padding
- Section vertical rhythm (gap between major sections)
- Card padding, border-radius
- Grid or flex patterns used

**Component patterns:**
- Button styles (filled, outlined, ghost) -- shape, size, shadow
- Form inputs -- border style, focus ring, label position
- Navigation -- sticky, transparent, blurred? mobile drawer or hamburger?
- Cards -- flat, raised, bordered?
- Tags / badges -- shape, font size, background treatment

**Motion / interaction:**
- Hover states (color shifts, underlines, scale)
- Transitions (duration, easing)
- Any animations observed

**Overall aesthetic:**
- Adjectives that best describe the style (e.g. "minimal, dark, precise, monospace-accented")
- Key differentiators vs. generic SaaS design

## Step 4: Write Style Report

Write `{OUTPUT_DIR}/style-report.md` using `skills/ux/references/style-report-template.md`.

Fill in all sections with the observations from Step 3. Include direct observations ("the heading font appears to be DM Sans at ~32px semibold"), not vague statements ("nice typography").

## Step 5: Generate CSS Theme

Write `{OUTPUT_DIR}/theme.css` using `skills/ux/references/css-theme-template.md`.

Map observations to CSS custom properties:
- If exact values are identifiable (e.g. `#0f0f0f` from screenshot color picker context), use them
- If approximate, use the closest reasonable value and note it with a comment
- Include both light and dark mode if the site supports it (check via a `prefers-color-scheme` media query wrapper)

## Step 6: Synthesize Summary

Append a one-paragraph "How to apply this style" summary at the end of `style-report.md`:
- What Tailwind config changes would replicate this style
- Which shadcn-svelte theme variables to override
- Any Google Fonts to load

## Step 7: Report + Notify

Print the result summary:

```
Style synthesis complete: {OUTPUT_DIR}
  style-report.md -- textual analysis
  theme.css -- CSS custom properties

To apply: copy theme.css into your project's app.css and adjust shadcn-svelte variables.
```

If `BG_MODE=true` and `SILENT=false`, send a desktop notification (see `references/utils.md`):

```bash
npx @codevoyant/agent-kit notify --title "ux style-synthesize complete" --message "Style for {SOURCE_SLUG} synthesized to {OUTPUT_DIR}"
```
