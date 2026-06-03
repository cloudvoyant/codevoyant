# Data Validation with Pydantic

## Why this matters

Python's type annotations are not enforced at runtime — you can write `def foo(x: int)` and pass `"hello"` without error. This means data from external sources (JSON APIs, config files, user input, IPC messages) arrives unvalidated. Without explicit validation, you get silent data corruption or mysterious `AttributeError` exceptions deep in your code, far from where the bad data was accepted.

Pydantic solves this by parsing and validating data at the boundary where it enters your system. If validation fails, you get a clear `ValidationError` with field names and constraints right at the entry point.

The companion to Pydantic is Python's built-in `@dataclass`. Knowing when to use each is as important as knowing how to use them.


## The Decision Rule

Ask: **does this data cross a boundary where it must be validated or serialized?**

- **Yes → Pydantic v2 `BaseModel`.** Parsed from JSON/YAML/an API, validated against constraints, serialized back out, or shared as a domain model between libraries. You get type coercion, `Field(...)` constraints, validators, and `model_dump()` / `model_validate_json()` for free.
- **No → plain `@dataclass`.** Lightweight internal value bundles a caller assembles in-process. No validation, no serialization, minimal overhead.

| You have... | Use |
|---|---|
| Model loaded from / dumped to JSON / YAML | `BaseModel` |
| Field with a numeric range or required constraint | `BaseModel` + `Field(...)` |
| Domain object passed between libraries / over IPC | `BaseModel` |
| Immutable value object that must validate | `BaseModel` + `ConfigDict(frozen=True)` |
| Bag of arguments one caller builds and passes once | `@dataclass` |
| Wrapper around an opaque object (handle, numpy/zarr array) | `@dataclass` or `BaseModel` + `PrivateAttr` |
| Small hot-path record with fixed fields | `@dataclass(slots=True)` |


## Install

```bash
uv add pydantic
```


## Pattern 1 — Validated Domain Model

The minimal form: define a `BaseModel`, use `Field(...)` for constraints. `Field(..., ge=0, le=1)` marks the field **required AND bounded**. Plain fields with no constraint need no `Field`.

```python
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

StockMaterialCode = Literal["P_STEEL", "N_NONFERROUS"]
MillOperationType = Literal["slotting", "roughing", "finishing"]


class MillCuttingParams(BaseModel):
    operation_type: MillOperationType
    stock_material_code: StockMaterialCode
    spindle_speed_rpm: float
    feed_rate_ipm: float
    min_rdoc_fraction: float = Field(..., ge=0, le=1)
    max_rdoc_fraction: float = Field(..., ge=0, le=1)
```

Constructing `MillCuttingParams(..., min_rdoc_fraction=1.5)` raises `ValidationError` immediately — not a surprise crash later.

Models compose by inheritance and round-trip through JSON:

```python
class ToolGeometry(BaseModel):
    catalog_id: str
    units: Literal["in", "mm"]
    cutter_diameter_mm: float
    number_of_flutes: int


class CatalogTool(ToolGeometry):
    mill_cutting_params: list[MillCuttingParams] | None = None


tool = CatalogTool.model_validate_json(raw_json)
payload = tool.model_dump_json()
```


## Pattern 2 — Immutable Value Object (Frozen)

`frozen=True` makes instances hashable (usable as dict keys); assignment after construction raises. Use this for analysis or detection results that downstream code reads but must never edit.

```python
from pydantic import BaseModel, ConfigDict

Vec3 = tuple[float, float, float]


class Hole(BaseModel):
    """A drillable hole feature detected from an input model."""

    model_config = ConfigDict(frozen=True)

    axis: Vec3
    """Unit vector along the hole axis (pointing into the material)."""

    start_mm: Vec3
    end_mm: Vec3
    diameter_mm: float
    is_through: bool
    point_angle_deg: float | None = None
    """None for through or flat-bottom holes."""
```


## Pattern 3 — Mutable Defaults and a Validator

Never use a bare mutable default (`= []`). Use `Field(default_factory=list)`. For cross-field or computed checks, add a `@field_validator`:

```python
from pydantic import BaseModel, ConfigDict, Field, field_validator


class Emit(BaseModel):
    model_config = ConfigDict(frozen=True)

    id: str
    ordered_features: list[Hole] = Field(default_factory=list)
    clearance_mm: float = Field(default=5.0, ge=0)
    dwell_s: float = Field(default=0.2, ge=0)

    @field_validator("id")
    @classmethod
    def _id_nonempty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("id must be non-empty")
        return v
```


## Pattern 4 — `PrivateAttr` for Opaque Fields

Some fields hold a type Pydantic's schema builder can't introspect — a native handle, an array wrapper (e.g. a `VoxelGrid` over a `zarr.Array`). Store such fields as `PrivateAttr`, set them in a custom `__init__`, and expose via a normal property. The rest of the model keeps full validation and serialization.

```python
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, PrivateAttr
from grid_sdk.grid import VoxelGrid, create_grid

Vec3 = tuple[float, float, float]
Quat = tuple[float, float, float, float]

_EMPTY_GRID_SHAPE = (1, 1, 1)


def _default_grid() -> VoxelGrid:
    return create_grid(shape=_EMPTY_GRID_SHAPE, dtype=bool)


class Setup(BaseModel):
    """All data for one setup. VoxelGrid fields are PrivateAttr to bypass
    Pydantic's schema builder (zarr internals are opaque to it)."""

    model_config = ConfigDict(arbitrary_types_allowed=True)

    id: str
    orientation_quat: Quat = (0.0, 0.0, 0.0, 1.0)
    safe_z_mm: float = Field(default=5.0, ge=0)

    _starting_grid: VoxelGrid = PrivateAttr()

    def __init__(self, *, starting_grid: VoxelGrid | None = None, **data: Any) -> None:
        super().__init__(**data)
        self._starting_grid = starting_grid if starting_grid is not None else _default_grid()

    @property
    def starting_grid(self) -> VoxelGrid:
        return self._starting_grid

    @starting_grid.setter
    def starting_grid(self, v: VoxelGrid) -> None:
        self._starting_grid = v

    def to_dict_no_grids(self) -> dict[str, Any]:
        """Serialisable dict, grids excluded."""
        return self.model_dump()   # private attrs are already excluded
```


## Pattern 5 — Lightweight Internal Context (`@dataclass`)

No validation, no serialization — just a bundle of arguments a caller assembles and passes once. Prefer `@dataclass` here; Pydantic overhead is wasted.

```python
from collections.abc import Callable
from dataclasses import dataclass
from typing import Literal

OpKind = Literal["face", "rough", "finish", "drill"]


@dataclass
class SelectionContext:
    """Context for tool selection — assembled by the caller (the pipeline)."""

    op_kind: OpKind
    hole_diameter_mm: float | None = None
    pocket_min_width_mm: float | None = None
    floor_is_curved: bool = False


ToolSelectorFn = Callable[[list[ToolSpec], SelectionContext], ToolSpec]
```

A dataclass also wraps an opaque object cleanly:

```python
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass
class StepModel:
    """Container for a loaded geometry model."""

    shape: Any                                    # opaque native handle
    solid_count: int
    source_bytes: bytes = field(default_factory=bytes)
    source_path: Path | None = None
```

`field(default_factory=bytes)` — the dataclass equivalent of Pydantic's `default_factory` for any mutable or empty default.


## When to Add `frozen=True` / `slots=True`

- **`@dataclass(frozen=True)`** — value object that must be immutable and hashable (dict key / set member), no validation needed. If validation is also required, use a frozen `BaseModel` (Pattern 2) instead.
- **`@dataclass(slots=True)`** — small, frequently-allocated record on a hot path. `slots` drops the per-instance `__dict__`, cuts memory, and speeds attribute access. Skip for one-off contexts; avoid if you set arbitrary extra attributes.

```python
@dataclass(frozen=True, slots=True)
class Vec3Record:
    x: float
    y: float
    z: float
```


## Common Pitfalls

- Bare mutable default (`= []`, `= {}`) is silently shared across instances — always `Field(default_factory=...)` / `field(default_factory=...)`
- A `BaseModel` field annotated with an arbitrary type without `model_config = ConfigDict(arbitrary_types_allowed=True)` raises `PydanticSchemaGenerationError` at class-definition time
- `frozen=True` makes the model hashable but **not** deep-immutable — a `list[Hole]` field can still be mutated; freeze the inner type too if needed
- `field_validator` runs after type coercion; for raw-input checks (before coercion) use `@field_validator(..., mode="before")`
- `Literal["a", "b"]` narrows for static type checkers; `StrEnum` does the same AND gives runtime members for routing tables — pick `StrEnum` when the vocabulary travels through dispatch logic
- Hardcoding `arbitrary_types_allowed=True` everywhere defeats validation — use `PrivateAttr` for the opaque field instead and keep the model strict
