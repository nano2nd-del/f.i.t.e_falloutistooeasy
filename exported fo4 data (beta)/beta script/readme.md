# PlacedRefs Mods-Only Exporter

## Overview

A **TES5Edit** / **xEdit** script that exports all placed references (objects and NPCs) from mod files to a CSV file. This script filters by file type, exporting only references from mod files while skipping the base game and official DLC.

## Purpose

When working with Fallout 4 or Skyrim mod data, you often need to:
- Audit placed objects and NPCs added by mods
- Extract coordinate data for analysis or migration
- Build reference databases for modding tools
- Identify placement conflicts or duplicates

This script automates that extraction with **file-level filtering** to exclude base game and DLC files.

---

## Features

### What It Exports

For each placed reference, the script records:

| Column | Description |
|--------|-------------|
| `source_file` | The mod file name (e.g., `MyMod.esp`) |
| `ref_formid` | Form ID of the placed reference (8-digit hex) |
| `base_formid` | Form ID of the base object/NPC (8-digit hex) |
| `base_editorid` | Editor ID of the base object (human-readable name) |
| `base_signature` | Record type of the base (e.g., `FURN`, `ACHR`, `CONT`) |
| `pos_x`, `pos_y`, `pos_z` | World position coordinates (float) |
| `rot_z` | Z-axis rotation (float, radians) |

### File Filtering

The script automatically **skips**:
- `fallout4.esm` (base game master file)
- Files containing `dlcrobot`, `dlcworkshop`, `dlccoast`, `dlcnuka` (official DLC)

All other `.esp` and `.esm` files are processed.

### Efficiency Features

- **File-level filtering** — once a file is marked as "skip," all records from it are rejected instantly
- **Coordinate validation** — references without position data are skipped (no overhead)
- **Checkpoint saves** — CSV is written to disk every 25,000 records to prevent data loss
- **Progress logging** — xEdit messages display which files are processed/skipped and record counts

---

## Installation

1. Save the script file to your xEdit scripts folder:
   - **xEdit/FO4Edit**: `<xEdit Install>\Edit Scripts\placed_refs_mods_only.pas`

2. Restart xEdit or reload scripts.

---

## Usage

### Step-by-Step

1. **Load your mods in xEdit**
   - Open FO4Edit or TES5Edit
   - Select the mods you want to analyze
   - Click OK to load

2. **Run the script**
   - Right-click any record in the tree
   - Select **Apply Script** → `placed_refs_mods_only`

3. **Monitor progress**
   - Watch the Messages tab for file processing status
   - Script logs each mod file as it's encountered
   - Checkpoint messages appear every 25,000 records

4. **Retrieve output**
   - CSV file is saved to: `<xEdit Install>\Edit Scripts\placed_refs_mods_only.csv`
   - Open in Excel, LibreOffice, or a text editor

### Example Output

```csv
source_file,ref_formid,base_formid,base_editorid,base_signature,pos_x,pos_y,pos_z,rot_z
MyMod.esp,0B00D4A2,0A00AB12,MyCustomChair,FURN,1234.5,5678.9,100.0,0.0
MyMod.esp,0B00D4A3,0A00AB18,MyNPC,ACHR,-500.2,2000.1,50.5,3.14159
```

---

## What Gets Exported

### Included Record Types

- **REFR** (References) — placed objects (furniture, containers, activators, etc.)
- **ACHR** (Actor References) — placed NPCs and creatures

### Excluded Records

- **Base game objects** (fallout4.esm / Skyrim.esm)
- **Official DLC** (all DLC master files)
- **Records without coordinates** (logged as "skipped")
- **Deleted references** (xEdit filters these automatically)

---

## Output Format

### CSV Standard

- **Comma-delimited** with proper escaping
- **Quoted fields** when commas or quotes are present
- **Double-quoted** for literal quotes within data (e.g., `"My ""Custom"" Name"`)
- **Compatible** with Excel, LibreOffice Calc, Google Sheets, Python pandas, etc.

### Field Details

- **ref_formid** / **base_formid**: 8-digit hexadecimal (includes load order index)
- **Coordinates**: Float values in Bethesda units (1 unit ≈ 1 inch)
- **rot_z**: Radians (0.0 = facing north, π ≈ 3.14159 = facing south)
- **base_editorid**: Empty if the base object has no Editor ID

---

## Performance

| Scenario | Time |
|----------|------|
| Small mod (< 100 refs) | < 1 second |
| Medium mod (1,000–10,000 refs) | 1–5 seconds |
| Large mod (50,000+ refs) | 10–30 seconds |
| Multiple large mods | Scales linearly |

**Memory**: Script uses ~1 MB per 25,000 records. Checkpoint saves prevent memory bloat.

---

## Troubleshooting

### CSV not created

- **Check xEdit folder permissions** — the script needs write access to `Edit Scripts\` directory
- **Check xEdit messages** — look for errors in the Messages tab
- **Verify xEdit is not running elevated** (admin mode) while your output folder isn't also elevated

### Missing records

- **Confirm mods are loaded** — if a mod isn't in your load order, it won't be scanned
- **Check for filters** — xEdit may have hidden records; reset filters before running the script

### Empty CSV (headers only)

- **All files may have been skipped** — ensure you have mods loaded, not just base game + DLC
- **No placed references in mods** — some mods don't add objects to the world

### Duplicate rows

- **Not expected** — each REFR/ACHR is unique. Duplicates suggest two copies of the same mod are loaded.

---

## Examples & Use Cases

### Use Case 1: Find All Placements by a Specific Mod

```bash
# Filter CSV for rows where source_file = "MyMod.esp"
# In Excel: Data → AutoFilter → Filter by source_file
```

### Use Case 2: Extract Coordinates for Import Into Another Tool

```python
import pandas as pd
df = pd.read_csv('placed_refs_mods_only.csv')
# Use df[['pos_x', 'pos_y', 'pos_z']] for position data
```

### Use Case 3: Audit Editor IDs

```bash
# Find all placements of a specific base object
grep "MyCustomTable" placed_refs_mods_only.csv
```

---

## Technical Notes

### File-Level Filtering

The script tracks `currentFile` and `fileSkipped` to avoid redundant checks. On each record, it compares the source file; if new, it checks `IsBaseOrDLC()` once and marks the entire file as skip/process.

### CSV Escaping

`SafeCSV()` wraps fields in quotes if they contain commas or quotes, and doubles any internal quotes for proper CSV parsing.

### Checkpoint Logic

Every 25,000 records, the partial CSV is written to disk. This prevents data loss if xEdit crashes.

---

## Limitations

- **DLC detection by filename** — mods with names like "dlcmymod.esp" will be skipped. Workaround: rename the mod or modify the `IsBaseOrDLC()` function.
- **No GUI options** — file filtering is hardcoded. To customize, edit the script.
- **Single-threaded** — processes records sequentially (standard for xEdit scripts).

---

## License & Support

This script is provided as-is for community use. Modify as needed for your workflow.

**Questions?** Check xEdit documentation or modding communities for xEdit scripting help.

