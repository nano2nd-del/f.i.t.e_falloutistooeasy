# FO4 Mod Database

SQLite databases for Fallout 4 mod data extracted via FO4Edit. AI-queryable and GitHub-ready.

## Databases

- **FO4_mods.db** - Master database with all mod categories combined
- **AMMO.db** - Ammunition data
- **ARMO.db** - Armor data
- **FACT.db** - Faction data
- **KYWD.db** - Keyword data
- **NPC_.db** - NPC data
- **OTFT.db** - Outfit data
- **WEAP.db** - Weapon data

Each database contains:
- `all_mods` table with indexed mod data
- `all_mods_fts` full-text search index for AI queries
- `metadata` table with statistics

## Usage

### Query from Python (for AI)

```python
import sqlite3

conn = sqlite3.connect('FO4_mods.db')
cursor = conn.cursor()

# Full-text search
cursor.execute('''
    SELECT filename, category FROM all_mods_fts 
    WHERE all_mods_fts MATCH 'damage'
''')
results = cursor.fetchall()

# Get specific mod content
cursor.execute('''
    SELECT content FROM all_mods 
    WHERE filename = 'mod_name.txt' AND category = 'WEAP'
''')
content = cursor.fetchone()
```

### Query from CLI

```bash
# Show database stats
python query-mod-db.py --stats

# Search for keyword
python query-mod-db.py --search "perks" --category NPC_

# Get specific mod file
python query-mod-db.py --get "filename.txt" --category ARMO

# List all mods in a category
python query-mod-db.py --list-category WEAP

# Export category as JSON
python query-mod-db.py --export KYWD --output keywords.json
```

### Regenerate Databases

```bash
python generate-mod-db.py "I:\fo4 mod\FO4Edit 4.1.5f\output" "I:\fo4 mod\FO4_MOD_DB"
```

## Schema

### all_mods table
```
id (INTEGER PRIMARY KEY)
filename (TEXT)
category (TEXT)
content (TEXT) - Full mod file content
lines (INTEGER) - Line count
size_bytes (INTEGER)
created_at (TIMESTAMP)
```

### metadata table
```
key (TEXT PRIMARY KEY)
value (TEXT)
```

### all_mods_fts (Full-Text Search)
Virtual table for efficient searching across content, category, and filename.

## AI Integration

These databases are designed to be directly queried by AI agents:

1. **Clone the repo**
   ```bash
   git clone https://github.com/yourusername/FO4_MOD_DB.git
   cd FO4_MOD_DB
   ```

2. **Query in your AI workflow**
   ```python
   import sqlite3
   db = sqlite3.connect('FO4_mods.db')
   # Query away...
   ```

3. **Search mod data for context**
   ```python
   cursor = db.cursor()
   # Find similar weapons
   cursor.execute('''
       SELECT filename, category FROM all_mods_fts 
       WHERE all_mods_fts MATCH ? LIMIT 10
   ''', ('weapon damage scaling',))
   ```

## Features

- **Full-text search** - Semantic queries across all mod data
- **Category filtering** - Query specific mod types
- **GitHub-ready** - Clone and query directly
- **Small databases** - All data ~0.5-2 MB per category
- **AI-friendly** - JSON export and Python/SQL interfaces

## Version Info

Generated: [from database metadata]
FO4Edit Version: 4.1.5f
SQLite3 compatible

## License

This is processed data from Fallout 4. Respect Bethesda's IP policies when using.
