# HTML Exploration Template

Use as base for `ux:explore` output files.

---

```html
<!DOCTYPE html>
<html lang="en" class="bg-gray-50 text-gray-900">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{EXPLORATION_NAME}</title>
  <!-- Tailwind CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    /* Wireframe overrides -- remove or replace for styled prototypes */
    .wireframe { font-family: ui-monospace, monospace; }
    .placeholder { background: repeating-linear-gradient(45deg, #e5e7eb, #e5e7eb 10px, #f3f4f6 10px, #f3f4f6 20px); }
  </style>
</head>
<body class="wireframe min-h-screen">

  <!-- Navigation (slideshow mode: add anchor links here) -->
  <nav class="sticky top-0 bg-white border-b border-gray-200 px-6 py-3 flex gap-4 text-sm">
    <span class="font-semibold">{EXPLORATION_NAME}</span>
  </nav>

  <!-- Main content -->
  <main class="max-w-5xl mx-auto px-6 py-10 space-y-12">

    <!-- Section template -- repeat as needed -->
    <section id="section-1" class="space-y-4">
      <h2 class="text-xl font-semibold border-b border-gray-200 pb-2">{Section Title}</h2>

      <!-- Image placeholder -->
      <div class="placeholder rounded h-48 w-full flex items-center justify-center text-gray-500 text-sm">
        Image placeholder 800x400
      </div>

      <!-- Text placeholder -->
      <p class="text-gray-600 leading-relaxed">
        {Placeholder text describing what goes here}
      </p>

      <!-- Card grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div class="border border-gray-200 rounded p-4 space-y-2">
          <div class="h-4 bg-gray-200 rounded w-3/4"></div>
          <div class="h-3 bg-gray-100 rounded w-full"></div>
          <div class="h-3 bg-gray-100 rounded w-5/6"></div>
        </div>
      </div>

      <!-- Action area -->
      <div class="flex gap-3">
        <button class="px-4 py-2 bg-gray-900 text-white rounded text-sm hover:bg-gray-700">Primary Action</button>
        <button class="px-4 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50">Secondary</button>
      </div>
    </section>

  </main>

</body>
</html>
```

## Slideshow additions

In `<nav>`, add anchor links for each slide:

```html
<a href="#slide-1" class="hover:underline">Approach A</a>
<a href="#slide-2" class="hover:underline">Approach B</a>
```

Each slide section:

```html
<section id="slide-1" class="space-y-4 border-l-4 border-blue-400 pl-4">
  <h2 class="text-xl font-semibold">Approach A -- {name}</h2>
  ...
</section>
```
