# Shared Utilities

Common patterns used across the ux:style-synthesize skill.

## Browser Automation Notes

### Resize Before Screenshot

Always resize the browser window **before** taking a screenshot. After resizing, scroll to the top of the page and wait at least 1 second for the browser to complete layout reflow. This ensures the screenshot captures the fully reflowed layout at the target breakpoint.

```
mcp__claude-in-chrome__resize_window: { width: {breakpoint}, height: 900, tabId: TAB_ID }
```

Then scroll to top and wait before capturing:

```
mcp__claude-in-chrome__computer: { action: "screenshot", tabId: TAB_ID }
```

### Wait for Reflow

After any resize or navigation, allow 1-2 seconds before screenshotting. CSS transitions, lazy-loaded images, and responsive layout shifts need time to settle. If a page has heavy animations, wait longer (2-3 seconds).

### Page Text Extraction

Use `get_page_text` after each breakpoint screenshot to capture the text content. This provides context about what content is visible and how it is structured at that breakpoint.

```
mcp__claude-in-chrome__get_page_text: { tabId: TAB_ID }
```

## BG_MODE Notification Pattern

Cross-platform desktop notification for background agents. Uses `@codevoyant/agent-kit` CLI.

```bash
npx @codevoyant/agent-kit notify --title "{TITLE}" --message "{MESSAGE}"
```

With silent support:

```bash
if [ "$SILENT" != "true" ]; then
  npx @codevoyant/agent-kit notify --title "{TITLE}" --message "{MESSAGE}"
fi
```

Replace `{TITLE}` and `{MESSAGE}` before embedding.

## Slug Derivation

For style-synthesize, the slug is derived from the URL domain or the `--name` flag:

1. If `--name` is provided, use that value
2. Otherwise, extract the domain from the URL (e.g. `https://linear.app/features` -> `linear.app`)
3. Strip `www.` prefix if present (e.g. `www.stripe.com` -> `stripe.com`)
4. Take only the domain name before the TLD for simple domains (e.g. `stripe.com` -> `stripe`, `linear.app` -> `linear`)
5. For multi-part domains, keep the full domain minus `www.` (e.g. `design.systems` -> `design-systems`)

Then slugify:

1. Convert to lowercase
2. Replace dots, spaces, and underscores with hyphens
3. Strip all characters that are not alphanumeric or hyphens
4. Collapse consecutive hyphens into a single hyphen
5. Trim leading/trailing hyphens

Examples:
- `https://linear.app` -> `linear`
- `https://www.stripe.com/payments` -> `stripe`
- `https://ui.shadcn.com` -> `ui-shadcn`
- `--name "Acme Dashboard"` -> `acme-dashboard`

## Output Directory Creation

The output directory follows a fixed structure:

```bash
mkdir -p docs/ux/style-research/{SOURCE_SLUG}/screenshots
```

This creates:
- `docs/ux/style-research/{SOURCE_SLUG}/` -- root for this style analysis
- `docs/ux/style-research/{SOURCE_SLUG}/screenshots/` -- breakpoint screenshots
- Output files: `style-report.md` and `theme.css` go in the root
