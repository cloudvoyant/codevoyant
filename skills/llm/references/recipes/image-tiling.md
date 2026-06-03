# Image Processing for Multimodal LLMs

## Why image processing for LLMs

Vision-capable LLMs (Claude, GPT-4o, Gemini) accept images as input, but they have resolution limits and per-image token costs. A 4000x6000 pixel scan passed directly wastes tokens on downscaling and may lose detail in dense regions. Tiling -- splitting a large image into overlapping sub-images and sending each as a separate input -- preserves detail while staying within model limits. PDF page rasterization converts document pages to images for models that process visual layout better than extracted text (complex diagrams, handwritten notes, forms with checkboxes).

The core tradeoff: sending the full image downscaled costs fewer tokens but loses fine detail; sending tiles costs more tokens but preserves local detail at the expense of global context.

## PDF page rasterization

Converting PDF pages to images for Vision API input. This is the bridge between document processing (covered in the document-processing recipe) and multimodal LLM inference.

### PyMuPDF rasterization

```python
import fitz  # PyMuPDF

doc = fitz.open("doc.pdf")
for page_num, page in enumerate(doc):
    # DPI controls resolution: 150 for text-heavy, 200-300 for diagrams/small text
    pix = page.get_pixmap(dpi=200)
    pix.save(f"page_{page_num}.png")
```

### pdf2image (Poppler-based)

```python
from pdf2image import convert_from_path

# Returns a list of PIL Image objects
images = convert_from_path("doc.pdf", dpi=200, fmt="png")
for i, img in enumerate(images):
    img.save(f"page_{i}.png")
```

### DPI selection

Choose DPI based on content type:

- **150 DPI** for text-heavy pages -- reduces token cost, sufficient for the model to read printed text.
- **200 DPI** for pages with diagrams, charts, or tables -- balances detail and file size.
- **300 DPI** for pages with small text, handwritten notes, or fine line drawings -- use sparingly, as file size grows quadratically with DPI.

### Output format

Use **PNG** for lossless quality when accuracy matters (screenshots, UI captures, documents with fine text). Use **JPEG at quality 85** for 3-4x smaller files with minimal quality loss -- choose JPEG when sending many pages to reduce API payload size:

```python
# PNG -- lossless, larger
pix.save("page.png")

# JPEG -- lossy, 3-4x smaller
img.save("page.jpg", "JPEG", quality=85)
```

## Tiling large images for Vision APIs

Tile when images are wider or taller than 2048px, or when detail in specific regions matters (dense engineering drawings, maps, microscopy slides, satellite imagery).

### Tiling algorithm

The approach: divide the image into a grid of fixed-size tiles with overlap so that features at tile boundaries aren't split. Each tile is sent as a separate image to the Vision API.

```python
from PIL import Image
from typing import List, Tuple


def tile_image(
    image: Image.Image,
    tile_size: int = 1024,
    overlap: int = 128,
) -> List[Tuple[Image.Image, int, int]]:
    """
    Split an image into overlapping tiles for Vision API processing.

    Returns a list of (tile_image, row, col) tuples where row/col
    identify the tile's position in the grid.
    """
    width, height = image.size
    step = tile_size - overlap
    tiles = []

    row = 0
    y = 0
    while y < height:
        col = 0
        x = 0
        while x < width:
            # Crop the tile
            box = (x, y, min(x + tile_size, width), min(y + tile_size, height))
            tile = image.crop(box)

            # Pad edge tiles to consistent size (models expect uniform input)
            if tile.size != (tile_size, tile_size):
                padded = Image.new(image.mode, (tile_size, tile_size), (255, 255, 255))
                padded.paste(tile, (0, 0))
                tile = padded

            tiles.append((tile, row, col))
            col += 1
            x += step
        row += 1
        y += step

    return tiles


# Usage
image = Image.open("large_document.png")  # e.g., 4000x6000
tiles = tile_image(image, tile_size=1024, overlap=128)
print(f"Generated {len(tiles)} tiles in a grid")
```

### Token cost calculation

Each tile costs approximately 765 tokens with Claude (for a 1024x1024 image). The cost scales with tile count:

- **4x4 grid** = 16 tiles = ~12,240 tokens
- **Full image downscaled** to 1568x1568 = ~1,600 tokens but with lost detail
- **6x8 grid** = 48 tiles = ~36,720 tokens -- expensive but preserves every detail

Choose the approach based on whether fine-grained detail actually matters for your task. For text extraction from a document scan, tiling is usually worth the cost. For "describe what's in this photo," downscaling is usually sufficient.

## Base64 encoding for API payloads

All Vision APIs accept base64-encoded images. The encoding is straightforward but there are important optimizations to apply before encoding.

### Python encoding

```python
import base64
from PIL import Image
import io


def encode_image(image_path: str, max_size: int = 1568) -> tuple[str, str]:
    """
    Load, resize, and base64-encode an image for Vision API payloads.

    Returns (base64_string, media_type).
    """
    img = Image.open(image_path)

    # Resize to model's max useful resolution to save tokens and bandwidth
    img.thumbnail((max_size, max_size), Image.LANCZOS)

    # Determine format from extension
    if image_path.lower().endswith((".jpg", ".jpeg")):
        fmt, media_type = "JPEG", "image/jpeg"
    else:
        fmt, media_type = "PNG", "image/png"

    buffer = io.BytesIO()
    img.save(buffer, format=fmt)
    encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")

    return encoded, media_type
```

### Anthropic API payload

```python
encoded, media_type = encode_image("diagram.png")

message = {
    "role": "user",
    "content": [
        {
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": media_type,
                "data": encoded,
            },
        },
        {
            "type": "text",
            "text": "Describe the architecture shown in this diagram.",
        },
    ],
}
```

### AI SDK (TypeScript)

The Vercel AI SDK handles encoding when you pass a `Buffer` or `URL`:

```typescript
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { readFileSync } from "fs";

const imageBuffer = readFileSync("diagram.png");

const result = await generateText({
  model: anthropic("claude-sonnet-4-20250514"),
  messages: [
    {
      role: "user",
      content: [
        {
          type: "image",
          image: imageBuffer, // SDK handles base64 encoding
        },
        {
          type: "text",
          text: "Describe the architecture shown in this diagram.",
        },
      ],
    },
  ],
});
```

### Size optimization

Resize before encoding. A 4000px image base64-encoded is ~16MB; resized to 1568px (Claude's max useful resolution) it is ~3MB. The model downscales anything larger anyway, so you are paying for bandwidth with no quality gain:

```python
from PIL import Image

img = Image.open("huge_scan.png")  # 4000x6000
img.thumbnail((1568, 1568), Image.LANCZOS)  # preserves aspect ratio
img.save("resized.png")
# Original: ~16MB base64, Resized: ~3MB base64
```

## Frontend tile rendering with Canvas

When building UIs that display tiled results alongside LLM annotations, HTML Canvas composites tiles back into the full image and overlays model output.

### Compositing tiles onto a canvas

```typescript
interface Tile {
  image: HTMLImageElement;
  row: number;
  col: number;
}

function compositeTiles(
  canvas: HTMLCanvasElement,
  tiles: Tile[],
  tileSize: number,
  overlap: number,
): void {
  const step = tileSize - overlap;
  const ctx = canvas.getContext("2d")!;

  // Calculate full image dimensions from tile grid
  const maxRow = Math.max(...tiles.map((t) => t.row));
  const maxCol = Math.max(...tiles.map((t) => t.col));
  canvas.width = maxCol * step + tileSize;
  canvas.height = maxRow * step + tileSize;

  for (const tile of tiles) {
    const x = tile.col * step;
    const y = tile.row * step;
    ctx.drawImage(tile.image, x, y);
  }
}
```

### Overlaying LLM annotations

When the LLM returns bounding boxes or region-specific annotations, draw them on a second canvas layer:

```typescript
interface Annotation {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  tileRow: number;
  tileCol: number;
}

function drawAnnotations(
  canvas: HTMLCanvasElement,
  annotations: Annotation[],
  tileSize: number,
  overlap: number,
): void {
  const step = tileSize - overlap;
  const ctx = canvas.getContext("2d")!;

  ctx.strokeStyle = "rgba(255, 0, 0, 0.8)";
  ctx.lineWidth = 2;
  ctx.font = "14px monospace";
  ctx.fillStyle = "rgba(255, 0, 0, 0.8)";

  for (const ann of annotations) {
    // Convert tile-local coordinates to global
    const globalX = ann.tileCol * step + ann.x;
    const globalY = ann.tileRow * step + ann.y;
    ctx.strokeRect(globalX, globalY, ann.width, ann.height);
    ctx.fillText(ann.label, globalX, globalY - 4);
  }
}
```

### Interactive tile inspection

Render tiles as individual elements in a CSS grid for click-to-inspect workflows:

```typescript
function renderTileGrid(
  container: HTMLElement,
  tiles: Tile[],
  analysisResults: Map<string, string>,
): void {
  container.style.display = "grid";
  container.style.gridTemplateColumns = `repeat(${Math.max(...tiles.map((t) => t.col)) + 1}, 1fr)`;
  container.style.gap = "2px";

  for (const tile of tiles) {
    const wrapper = document.createElement("div");
    wrapper.style.cursor = "pointer";
    wrapper.appendChild(tile.image);

    wrapper.addEventListener("click", () => {
      const key = `${tile.row},${tile.col}`;
      const analysis = analysisResults.get(key) || "No analysis available";
      // Show analysis in sidebar or modal
      showTileAnalysis(tile, analysis);
    });

    container.appendChild(wrapper);
  }
}
```

### Performance

For images with 50+ tiles, use `createImageBitmap` for non-blocking decoding:

```typescript
async function loadTilesAsync(urls: string[]): Promise<ImageBitmap[]> {
  const responses = await Promise.all(urls.map((url) => fetch(url)));
  const blobs = await Promise.all(responses.map((r) => r.blob()));
  return Promise.all(blobs.map((blob) => createImageBitmap(blob)));
}
```

## Frontend tile rendering with WebGL/Three.js

When tile count is high or you need smooth zoom/pan on very large images, WebGL provides hardware-accelerated rendering that Canvas cannot match.

### Three.js setup for tiled images

```typescript
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

function createTileViewer(
  container: HTMLElement,
  fullWidth: number,
  fullHeight: number,
): { scene: THREE.Scene; renderer: THREE.WebGLRenderer } {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf0f0f0);

  // Orthographic camera for 2D image viewing
  const aspect = fullWidth / fullHeight;
  const camera = new THREE.OrthographicCamera(
    -aspect,
    aspect,
    1,
    -1,
    0.1,
    10,
  );
  camera.position.z = 1;

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  // OrbitControls for zoom/pan
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableRotate = false; // 2D only
  controls.enableDamping = true;

  // Create a plane sized to the image aspect ratio
  const geometry = new THREE.PlaneGeometry(2 * aspect, 2);
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const plane = new THREE.Mesh(geometry, material);
  scene.add(plane);

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  return { scene, renderer };
}
```

### Compositing tiles into a texture

```typescript
function compositeTilesToTexture(
  tiles: Tile[],
  fullWidth: number,
  fullHeight: number,
  tileSize: number,
  overlap: number,
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = fullWidth;
  canvas.height = fullHeight;
  const ctx = canvas.getContext("2d")!;
  const step = tileSize - overlap;

  for (const tile of tiles) {
    ctx.drawImage(tile.image, tile.col * step, tile.row * step);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}
```

### Progressive tile loading

For very large images, load tiles on demand as the user zooms in (similar to map tile servers):

```typescript
function loadVisibleTiles(
  camera: THREE.OrthographicCamera,
  tileGrid: Map<string, string>, // "row,col" -> url
  loaded: Set<string>,
  tileSize: number,
  overlap: number,
): void {
  const step = tileSize - overlap;
  // Determine visible region from camera frustum
  const visibleLeft = camera.left * camera.zoom;
  const visibleRight = camera.right * camera.zoom;
  const visibleTop = camera.top * camera.zoom;
  const visibleBottom = camera.bottom * camera.zoom;

  for (const [key, url] of tileGrid) {
    if (loaded.has(key)) continue;
    const [row, col] = key.split(",").map(Number);
    const tileX = col * step;
    const tileY = row * step;

    // Check if tile is in visible region (simplified bounds check)
    if (tileX < visibleRight && tileX + tileSize > visibleLeft &&
        tileY < visibleTop && tileY + tileSize > visibleBottom) {
      loaded.add(key);
      // Load and update texture asynchronously
      loadTileAsync(url).then((bitmap) => {
        // Update the composited texture with this tile
      });
    }
  }
}
```

## Multimodal prompt patterns

How you structure prompts with images significantly affects output quality. These patterns apply across Vision-capable models.

### Single image analysis

```
Describe what you see in this image. Focus on [specific aspect].
```

Be specific about what you want. "Describe this image" produces generic output. "List every text label visible in this architectural diagram, organized by component" produces structured, useful output.

### Tiled image analysis

Include tile grid coordinates in the prompt so the model can reference spatial locations in its response:

```
This image has been split into a 4x4 grid of overlapping tiles for detail
preservation. Each tile is labeled with its (row, col) position starting
from (0, 0) at the top-left.

For each tile, identify any text, diagrams, or notable features. Reference
the tile position in your response so results can be mapped back to the
original image.

Tile (0, 0): [image]
Tile (0, 1): [image]
...
```

### Document page with extracted text

Send both the rasterized page image AND the extracted text. The model cross-references visual layout with text content for better understanding:

```
I'm providing a scanned document page as both an image and extracted text.
The OCR text may contain errors. Use the image to verify and correct the
text, especially for tables, figures, and any handwritten annotations.

Extracted text:
{ocr_text}

[image of the page]
```

### Image comparison

Send two images and ask for differences -- useful for visual regression testing or before/after analysis:

```
Compare these two images and describe every difference you can identify.
Image 1 is the baseline, Image 2 is the current version.

[image 1]
[image 2]
```

### Few-shot with images

Send example image + expected output pairs before the actual query to calibrate the model's response format:

```
I'll show you examples of how to extract data from receipt images,
then ask you to process a new receipt.

Example 1:
[example receipt image]
Output: {"vendor": "Acme Corp", "total": 42.50, "date": "2025-01-15"}

Example 2:
[example receipt image]
Output: {"vendor": "Bob's Diner", "total": 18.75, "date": "2025-02-03"}

Now extract data from this receipt:
[actual receipt image]
```

## Gotchas

**Claude's image token cost scales with resolution.** A 1568x1568 image costs ~1,600 tokens; anything larger is downscaled to fit. Sending tiles of a high-res image is more expensive but preserves detail. Always resize to the model's max useful resolution before encoding unless you are intentionally tiling.

**JPEG artifacts on screenshots.** Use PNG for screenshots, UI captures, and text-heavy images. JPEG compression introduces artifacts around sharp edges (text, lines) that degrade model accuracy. Reserve JPEG for photographs and natural images where artifacts are less visible.

**Animated GIFs.** Only the first frame is processed by Vision APIs. If animation content matters, extract frames individually with PIL:

```python
from PIL import Image

gif = Image.open("animation.gif")
frames = []
try:
    while True:
        frames.append(gif.copy())
        gif.seek(gif.tell() + 1)
except EOFError:
    pass
# Send specific frames as separate images
```

**PDF rasterization memory.** A 500-page PDF at 300 DPI can consume 10+ GB of RAM. Process pages in batches of 10-20 with explicit garbage collection:

```python
import fitz
import gc

doc = fitz.open("huge.pdf")
batch_size = 15
for start in range(0, len(doc), batch_size):
    end = min(start + batch_size, len(doc))
    for i in range(start, end):
        pix = doc[i].get_pixmap(dpi=200)
        # Process or save the pixmap
        pix = None  # Release memory
    gc.collect()
```

**Image orientation and EXIF tags.** Some images have EXIF orientation metadata that rotates the display. Some models handle EXIF correctly, others do not. Always apply EXIF orientation before sending:

```python
from PIL import Image, ImageOps

img = Image.open("photo.jpg")
img = ImageOps.exif_transpose(img)  # Apply EXIF rotation
```

**Tile overlap at edges.** Edge tiles may be smaller than the standard tile size. Padding them with white (or the image's background color) prevents the model from interpreting the padding as content. Always mention padding in the prompt if applicable.
