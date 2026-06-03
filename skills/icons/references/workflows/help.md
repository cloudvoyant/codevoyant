# help

```
/icons find <query> [--name <slug>] [--color <hex>] [--out <dir>]
    Search svgrepo.com for icons matching the query, pick one interactively,
    and save it recolored to #5555ff (or --color).

/icons use <url> --name <slug> [--color <hex>] [--out <dir>]
    Download a specific SVG URL and save it recolored.

Defaults:
  --color   #5555ff
  --out     docs/public/icons/

Examples:
  /icons find infinity
  /icons find rocket --name flow
  /icons find checklist --out docs/public/icons/ --name task
  /icons use https://www.svgrepo.com/svg/12345/infinity --name flow
```
