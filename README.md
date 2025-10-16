# Tab Stash Folder Organizer

A Firefox extension that solves Tab Stash's date format and sorting limitations by automatically organizing Tab Stash bookmark groups chronologically.

## The Problem

Tab Stash is a powerful tab management extension, but it has limitations that make organizing large collections difficult:

1. **Hardcoded US Date Format** ([Issue #147](https://github.com/josh-berry/tab-stash/issues/147)) - Tab Stash uses MM/DD/YYYY format regardless of user locale, and Firefox's `Date.toLocaleString()` doesn't respect locale settings on macOS ([Bug #476419](https://bugzilla.mozilla.org/show_bug.cgi?id=476419))

2. **No Automatic Sorting** ([Issue #606](https://github.com/josh-berry/tab-stash/issues/606)) - No built-in way to automatically sort stashed tab groups by date, making it hard to find recent saves

3. **No Date Format Customization** - Users can't choose their preferred date format (ISO 8601, DD/MM/YY, etc.)

## The Solution

This extension organizes Tab Stash bookmark groups by reading the ISO 8601 timestamps that Tab Stash embeds in folder names and sorting them chronologically (newest first).

**Features:**
- Chronological sorting of Tab Stash groups by date
- Safe backup system with one-click revert
- Works with any bookmark folder containing ISO 8601 timestamps

## Installation

### From GitHub Actions

1. Go to the [Actions tab](https://github.com/Istiaq-Edu/bookmark-folder-organizer/actions)
2. Click on the latest successful workflow run
3. Download the `.xpi` file
4. Open Firefox → `about:debugging` → "This Firefox" → "Load Temporary Add-on"
5. Select the downloaded `.xpi` file

### Manual Build

```bash
git clone https://github.com/Istiaq-Edu/bookmark-folder-organizer.git
cd bookmark-folder-organizer
python package_extension.py
```

## Usage

1. Click the extension icon in Firefox
2. Select your Tab Stash parent folder (usually "Tab Stash")
3. Click **"Rearrange"** to sort groups by date (newest first)
4. Click **"Revert"** to undo if needed

The extension recognizes ISO 8601 timestamps in folder names like:
- `saved-2025-10-12T10:00:00Z`
- `backup-2025-10-11T15:30:00.123Z`

Folders without valid dates stay at the bottom.

## Requirements

- Firefox 57+
- Tab Stash extension (or any bookmarks with ISO 8601 timestamps)

## Privacy

All operations are local. No data is collected or transmitted.

## License

MIT License
