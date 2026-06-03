# find

Search for an SVG icon, recolor it, and save it. Prefers official brand assets over generic icon sets.

## Step 0: Parse arguments

```
QUERY        first non-flag arg (required — search term, e.g. "infinity", "rocket", "react")
NAME         --name <slug>    (optional; output filename without extension, defaults to QUERY slug)
COLOR        --color <hex>    (optional; target color for monotone icons, defaults to #5555ff)
OUT          --out <path>     (optional; output directory, defaults to docs/public/icons/)
DARK         --dark           (optional; save a dark-mode variant alongside the light one)
```

Error if QUERY is empty: `Error: query required. Usage: /icons find <query>`

## Step 1: Search for official brand assets first

Before falling back to generic icon sets, check for an official brand/press kit:

1. **Web search**: search for `{QUERY} SVG logo brand assets site:brand.{query}.com OR site:{query}.com/brand OR site:{query}.com/press`
   - Examples: `tanstack.com/brand-guide`, `react.dev/community/brand`, `linear.app/brand`
2. If a brand page is found: fetch it and look for downloadable SVG logos. Official logos are preferred.
3. Also try Simple Icons as a fallback: `https://simpleicons.org/icons/{query-slug}.svg`
4. Also try svgrepo.com: fetch `https://www.svgrepo.com/vectors/{QUERY}/` and extract up to 10 results.

Present found sources to the user, ranked: brand site > Simple Icons > svgrepo.com results:

```
Found sources for "{QUERY}":

  Brand assets:
    1. {name} — {url}  (official brand)

  Simple Icons:
    2. {name} — {url}

  SVGRepo:
    3. {name} — {url}
    4. {name} — {url}
    ...

Enter a number to download, a direct SVG URL, or 'q' to cancel:
```

Use AskUserQuestion to get the selection.

## Step 2: Resolve SVG content

- If brand site or Simple Icons: fetch the SVG directly.
- If svgrepo.com detail page: fetch the page and extract the direct `.svg` download link.
- If direct `.svg` URL: fetch as-is.

## Step 3: Detect if icon is monotone or multi-tone

Inspect the SVG:
- **Monotone**: single color used throughout (or uses `currentColor`) → recolor to COLOR
- **Multi-tone**: multiple distinct fill/stroke colors → offer two options:
  a. Save as-is (preserve original colors) with `{NAME}-color.svg`
  b. Recolor monotone to COLOR

For multi-tone icons with `--dark` flag: also save a dark-mode variant where dark backgrounds are lightened and light backgrounds are darkened — ask the user to confirm the palette before saving.

## Step 4: Recolor (monotone path)

Replace all color values in the SVG with COLOR (`#5555ff` by default):
- Set `fill="{COLOR}"` on the root `<svg>` element
- Remove any existing `fill` or `stroke` attributes on child elements that set a specific color (leave `fill="none"` and `stroke="none"` untouched)
- Remove `<style>` blocks that set colors inline
- Ensure `viewBox` attribute is present; normalize if missing

## Step 5: Save

- Monotone: save as `{OUT}/{NAME}.svg`
- Multi-tone (color preserved): save as `{OUT}/{NAME}-color.svg`
- Dark variant (if `--dark`): save as `{OUT}/{NAME}-dark.svg`

```
Saved: {OUT}/{NAME}.svg
Source: {url}
Type: {monotone | multi-tone}
```
