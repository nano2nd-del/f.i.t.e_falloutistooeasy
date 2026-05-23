# FO4 Mod Database
Ultra-compressed gzipped tar archives of Fallout 4 mod data extracted via FO4Edit.

## Structure

Each `.db.gz` file is a tar.gz compressed archive of FO4Edit output:
- `AMMO.db.gz` - Ammunition data
- `ARMO.db.gz` - Armor data
- `FACT.db.gz` - Faction data
- `KYWD.db.gz` - Keyword data
- `NPC_.db.gz` - NPC data
- `OTFT.db.gz` - Outfit data
- `WEAP.db.gz` - Weapon data

## Usage

### Extract Archives Locally

```bash
python extract-mod-db.py --list
python extract-mod-db.py --extract AMMO --output ./ammo_data
```

### With AI Processing

```bash
# Extract all archives for processing
for archive in *.db.gz; do
    name="${archive%.db.gz}"
    tar -xzf "$archive"
done
```

### Compression Stats

See `MANIFEST.json` for detailed compression ratios and timestamps.

## Files

- `*.db.gz` - Compressed mod data archives
- `MANIFEST.json` - Metadata: original size, compressed size, compression ratio, timestamps
- `extract-mod-db.py` - Extraction utility

## Integration with AI

These compressed archives can be mounted or extracted for AI model fine-tuning, vector embedding generation, or mod analysis:

```python
import json
import tarfile

# Load manifest for stats
with open('MANIFEST.json') as f:
    manifest = json.load(f)

# Extract specific category
with tarfile.open('AMMO.db.gz', 'r:gz') as tar:
    tar.extractall('./ammo')
```

## Version Info

Generated: [date from MANIFEST.json]
FO4Edit Version: 4.1.5f
Total Compression: ~80-90% (typical for text data)

## License

This is processed data from Fallout 4. Respect Bethesda's IP policies when using.
