# PDF and Document Ingestion for LLMs

## Why document processing matters for LLMs

LLMs consume text, not PDFs. The gap between a PDF on disk and useful LLM context is wider than it looks: scanned documents need OCR, tables need structural extraction, multi-column layouts confuse naive text extractors, and long documents need chunking strategies that preserve semantic coherence. Getting this wrong means your RAG pipeline retrieves garbage and your summarization hallucinates structure that isn't there.

The pipeline is always the same shape: **extract** raw content from the source format, **clean** it (normalize encoding, remove boilerplate, fix reading order), **chunk** it into LLM-sized pieces, and **enrich** each chunk with metadata (source, page, section). Each step has multiple tool options with different accuracy/speed/cost tradeoffs.

## Text extraction with pdfplumber

Use pdfplumber for born-digital PDFs (created from text editors, not scanners) with complex layouts, tables, or multi-column text. It parses the PDF's internal text objects and their positions, giving you fine-grained control over what gets extracted and from where.

### Basic text extraction

```python
import pdfplumber

with pdfplumber.open("doc.pdf") as pdf:
    for page in pdf.pages:
        text = page.extract_text()
        if text:
            print(f"Page {page.page_number}: {len(text)} chars")
```

### Table extraction

`extract_tables()` returns a list of tables, each as a list of rows (lists of cell strings). This is far more reliable than trying to parse table structure from raw text.

```python
with pdfplumber.open("report.pdf") as pdf:
    for page in pdf.pages:
        tables = page.extract_tables()
        for i, table in enumerate(tables):
            # table is a list of rows; each row is a list of cell strings
            headers = table[0]
            rows = table[1:]
            print(f"Table {i}: {len(rows)} rows, columns: {headers}")
```

### Word-level extraction and column detection

When multi-column layouts scramble reading order, drop down to word-level bounding boxes and sort by position:

```python
with pdfplumber.open("two_column.pdf") as pdf:
    page = pdf.pages[0]
    words = page.extract_words()

    # Words have x0, x1, top, bottom attributes
    # Split into left/right columns at the page midpoint
    mid_x = page.width / 2
    left_col = sorted(
        [w for w in words if w["x0"] < mid_x],
        key=lambda w: (w["top"], w["x0"]),
    )
    right_col = sorted(
        [w for w in words if w["x0"] >= mid_x],
        key=lambda w: (w["top"], w["x0"]),
    )

    left_text = " ".join(w["text"] for w in left_col)
    right_text = " ".join(w["text"] for w in right_col)
```

### Region-based extraction

Extract text from a specific bounding box (useful for pulling out specific sections or ignoring headers/footers):

```python
with pdfplumber.open("doc.pdf") as pdf:
    page = pdf.pages[0]
    # Crop to a specific region: (x0, y0, x1, y1) in PDF points
    cropped = page.within_bbox((50, 100, 550, 700))
    text = cropped.extract_text()
```

pdfplumber fails on scanned PDFs (images without text layers) and heavily styled documents where visual layout relies on absolute positioning of individual characters rather than text runs.

## Text extraction with PyMuPDF (fitz)

Use PyMuPDF when speed matters or when you need both text and images from the same document. It is 5-10x faster than pdfplumber for plain text extraction but less accurate for table structure.

### Basic text extraction

```python
import fitz  # PyMuPDF

doc = fitz.open("doc.pdf")
for page in doc:
    text = page.get_text("text")  # plain text
    print(f"Page {page.number}: {len(text)} chars")
```

### Output formats

PyMuPDF supports multiple output formats from the same page:

```python
page = doc[0]

# Plain text -- fastest, loses all structure
plain = page.get_text("text")

# Structured dict -- blocks with positions, useful for layout analysis
blocks = page.get_text("dict")
for block in blocks["blocks"]:
    if block["type"] == 0:  # text block
        for line in block["lines"]:
            for span in line["spans"]:
                print(f"Font: {span['font']}, Size: {span['size']}, Text: {span['text']}")

# HTML -- styled HTML, useful for preserving formatting
html = page.get_text("html")
```

### Image extraction

Extract embedded images from PDF pages (useful for multimodal pipelines that process both text and images):

```python
doc = fitz.open("doc.pdf")
for page_num, page in enumerate(doc):
    for img_index, img in enumerate(page.get_images(full=True)):
        xref = img[0]
        pix = fitz.Pixmap(doc, xref)
        if pix.n >= 5:  # CMYK -- convert to RGB
            pix = fitz.Pixmap(fitz.csRGB, pix)
        pix.save(f"page{page_num}_img{img_index}.png")
```

## OCR with Tesseract

Use Tesseract for scanned PDFs where there is no text layer, only rasterized images. Tesseract is free, runs locally, and supports 100+ languages. The tradeoff is accuracy: it struggles with poor scan quality, unusual fonts, and complex layouts.

### Pipeline: rasterize then OCR

The standard pipeline converts each PDF page to an image, then runs OCR on the image:

```python
from PIL import Image
import pytesseract
import pdf2image

# Rasterize PDF pages to images
# DPI matters: 300 is the minimum for reliable OCR; 150 works for large clean fonts
images = pdf2image.convert_from_path("scanned.pdf", dpi=300)

texts = []
for i, img in enumerate(images):
    text = pytesseract.image_to_string(img, lang="eng")
    texts.append(text)
    print(f"Page {i}: {len(text)} chars extracted")
```

### Preprocessing for better OCR

Low-quality scans benefit from preprocessing before OCR. The most impactful steps are grayscale conversion, adaptive thresholding, and deskewing:

```python
import cv2
import numpy as np
from PIL import Image

def preprocess_for_ocr(image: Image.Image) -> Image.Image:
    """Preprocess a scanned page image for better Tesseract accuracy."""
    img_array = np.array(image)

    # Convert to grayscale
    gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)

    # Adaptive thresholding -- handles uneven lighting across the page
    thresh = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
    )

    # Deskew: detect rotation angle and correct
    coords = np.column_stack(np.where(thresh > 0))
    angle = cv2.minAreaRect(coords)[-1]
    if angle < -45:
        angle = -(90 + angle)
    else:
        angle = -angle
    h, w = thresh.shape
    center = (w // 2, h // 2)
    matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
    deskewed = cv2.warpAffine(
        thresh, matrix, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE
    )

    return Image.fromarray(deskewed)
```

### Language packs

Install additional language packs for non-English documents. On Debian/Ubuntu: `apt install tesseract-ocr-fra tesseract-ocr-deu`. Then specify the language:

```python
# Single language
text = pytesseract.image_to_string(img, lang="fra")

# Multiple languages (Tesseract tries each)
text = pytesseract.image_to_string(img, lang="eng+fra+deu")
```

## OCR with AWS Textract

Use Textract in production pipelines where accuracy matters more than cost, or when you need structured table and form extraction. Textract uses deep learning models trained on document layouts and consistently outperforms Tesseract on real-world documents.

### Simple text detection

```python
import boto3

client = boto3.client("textract", region_name="us-east-1")

# Synchronous -- single page, bytes input
with open("page.png", "rb") as f:
    response = client.detect_document_text(Document={"Bytes": f.read()})

for block in response["Blocks"]:
    if block["BlockType"] == "LINE":
        print(f"Text: {block['Text']} (Confidence: {block['Confidence']:.1f}%)")
```

### Table and form extraction

```python
with open("form.pdf", "rb") as f:
    response = client.analyze_document(
        Document={"Bytes": f.read()},
        FeatureTypes=["TABLES", "FORMS"],
    )

# Extract tables
tables = [b for b in response["Blocks"] if b["BlockType"] == "TABLE"]
cells = [b for b in response["Blocks"] if b["BlockType"] == "CELL"]

# Extract key-value pairs from forms
keys = [b for b in response["Blocks"] if b["BlockType"] == "KEY_VALUE_SET" and "KEY" in b.get("EntityTypes", [])]
```

### Async processing for multi-page PDFs

For documents stored in S3 with more than one page, use the async API:

```python
# Start async job
job = client.start_document_text_detection(
    DocumentLocation={
        "S3Object": {"Bucket": "my-bucket", "Name": "docs/large.pdf"}
    }
)
job_id = job["JobId"]

# Poll for completion
import time
while True:
    result = client.get_document_text_detection(JobId=job_id)
    if result["JobStatus"] in ("SUCCEEDED", "FAILED"):
        break
    time.sleep(5)

# Paginate results
pages = []
next_token = None
while True:
    kwargs = {"JobId": job_id}
    if next_token:
        kwargs["NextToken"] = next_token
    result = client.get_document_text_detection(**kwargs)
    pages.append(result)
    next_token = result.get("NextToken")
    if not next_token:
        break
```

### Cost

Textract pricing (us-east-1): ~$1.50 per 1000 pages for text detection, ~$15 per 1000 pages for table/form analysis. Filter low-confidence blocks (below 90%) to avoid feeding noisy extractions to your LLM.

## Chunking strategies

LLMs have context window limits, and RAG retrieval works best with focused chunks that contain a single topic or answer. Naive splitting (every N characters) breaks sentences and loses context. The right chunking strategy depends on your document structure and downstream task.

### Fixed-size with overlap

Split every `chunk_size` characters with `overlap` characters carried over. Simple, predictable, and sufficient for homogeneous text:

```python
from langchain_text_splitters import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
)
chunks = splitter.split_text(document_text)
# Overlap ensures sentences at boundaries aren't lost
```

### Recursive character splitting

Tries to split on paragraph breaks first, then sentences, then words, then characters. This is the default and best general-purpose strategy:

```python
splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    separators=["\n\n", "\n", ". ", " ", ""],
)
chunks = splitter.split_text(document_text)
```

The separator hierarchy means the splitter preserves paragraph boundaries wherever possible, only falling back to sentence or word breaks when a paragraph exceeds `chunk_size`.

### Semantic chunking

Split based on embedding similarity. Compute embeddings for sentences, group consecutive sentences whose embeddings are similar, split where similarity drops below a threshold:

```python
from langchain_experimental.text_splitter import SemanticChunker
from langchain_openai import OpenAIEmbeddings

embeddings_model = OpenAIEmbeddings()
splitter = SemanticChunker(
    embeddings_model,
    breakpoint_threshold_type="percentile",
)
chunks = splitter.create_documents([document_text])
```

Semantic chunking is more expensive (requires embedding each sentence) but produces more coherent chunks for heterogeneous documents -- reports that shift between financial data, narrative, and technical appendices.

### Markdown/HTML-aware splitting

When documents have clear heading hierarchy (technical docs, reports with sections), split on headers to preserve document structure:

```python
from langchain_text_splitters import MarkdownHeaderTextSplitter

headers_to_split_on = [
    ("#", "Header 1"),
    ("##", "Header 2"),
    ("###", "Header 3"),
]
splitter = MarkdownHeaderTextSplitter(headers_to_split_on=headers_to_split_on)
chunks = splitter.split_text(markdown_text)
# Each chunk includes metadata about which headers it falls under
```

### Chunk size guidance

The right chunk size depends on the downstream task:

- **RAG retrieval**: 500-1000 tokens. Small enough to be specific to a single topic, large enough to contain sufficient context for the LLM to generate a useful answer.
- **Summarization**: 2000-4000 tokens. Larger chunks let the model see more context at once.
- **Always include metadata** with each chunk: source document path, page number, section header. This metadata is critical for attribution and debugging retrieval quality.

## Gotchas

**PDF text extraction order is not guaranteed.** Multi-column PDFs may interleave columns when you call `extract_text()`. Use word-level bounding boxes (`extract_words()` in pdfplumber or `get_text("dict")` in PyMuPDF) to detect columns and sort by reading order.

**Scanned PDFs with a text layer.** Some PDFs have both rasterized images and a text layer. The text layer may be low-quality OCR from the original scanner. Always check extraction quality before assuming the text layer is authoritative -- compare a sample page's extracted text against the visual content.

**Character encoding: fi ligatures.** The character `ﬁ` (fi ligature, U+FB01) appears in many PDFs instead of the two characters "fi". This breaks keyword search and confuses tokenizers. Normalize with:

```python
import unicodedata
text = unicodedata.normalize("NFKD", text)
# "ﬁnance" becomes "finance"
```

**Empty pages.** Always filter out chunks that are empty or contain only whitespace before sending to embedding models or LLMs. Empty chunks waste tokens and pollute retrieval results.

**Memory with large documents.** Processing a 500-page PDF with pdfplumber or PyMuPDF keeps the entire document in memory. For very large documents, process pages in batches:

```python
import fitz

doc = fitz.open("large.pdf")
batch_size = 20
for start in range(0, len(doc), batch_size):
    batch_pages = [doc[i] for i in range(start, min(start + batch_size, len(doc)))]
    for page in batch_pages:
        text = page.get_text("text")
        # process text...
    # Explicit cleanup if memory is tight
    import gc
    gc.collect()
```
