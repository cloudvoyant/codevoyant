# use

Download a specific SVG from a URL, recolor it, and save it.

## Step 0: Parse arguments

```
URL          first non-flag arg (required — direct SVG URL or svgrepo.com detail page URL)
NAME         --name <slug>    (required if URL doesn't suggest a name)
COLOR        --color <hex>    (optional; defaults to #5555ff)
OUT          --out <path>     (optional; defaults to docs/public/icons/)
```

Error if URL is missing: `Error: URL required. Usage: /icons use <url> --name <slug>`

## Step 1: Fetch SVG

Fetch the content at URL.

- If it's an svgrepo.com detail page (contains `/svg/` in the path): extract the direct SVG download link from the page, then fetch that.
- If it ends with `.svg` or returns SVG content directly: use it as-is.

## Step 2: Recolor

Replace all color values with COLOR (`#5555ff` by default):
- Set `fill="{COLOR}"` on the root `<svg>` element
- Replace any existing `fill` or `stroke` attributes on child elements (skip `fill="none"` and `stroke="none"`)
- Remove inline `<style>` blocks that set colors

## Step 3: Save

Infer NAME from the URL path if `--name` not given (last path segment without extension).

Save to `{OUT}/{NAME}.svg`.

```
Saved: {OUT}/{NAME}.svg
```
