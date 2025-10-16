# Date Parser Service Tests

## Overview

This directory contains unit tests for the Date Parser Service, which extracts and parses ISO 8601 timestamps from bookmark folder names.

## Running Tests

To run the Date Parser tests:

```bash
node bookmark-folder-organizer/services/dateParser.test.js
```

## Test Coverage

The test suite covers:

### ISO 8601 Pattern Matching
- ✅ Extraction with milliseconds (e.g., `2025-10-11T17:36:41.808Z`)
- ✅ Extraction without milliseconds (e.g., `2024-03-15T10:30:00Z`)
- ✅ Multiple timestamps (uses first occurrence)

### Folder Name Format Variations
- ✅ Prefix format: `project-backup-2025-06-20T14:22:33.123Z`
- ✅ Suffix format: `2025-06-20T14:22:33Z-important`
- ✅ Special characters: `my_folder@2025-06-20T14:22:33.456Z#backup`
- ✅ No date present
- ✅ Empty/null/undefined inputs
- ✅ Non-string inputs

### Date Formatting
- ✅ YYYY-MM-DD format
- ✅ DD-MM-YY format
- ✅ MM-DD-YY format
- ✅ Default format behavior
- ✅ Zero-padding for single digits
- ✅ Invalid date handling

### Validation (hasValidDate)
- ✅ Valid timestamps with/without milliseconds
- ✅ Invalid inputs (empty, null, undefined, non-string)
- ✅ Folder names without dates

### Edge Cases
- ✅ Invalid ISO 8601 formats (missing Z, wrong separators)
- ✅ Invalid date values (e.g., month 13)
- ✅ Leap year dates (Feb 29)
- ✅ Year boundaries (Dec 31)
- ✅ Historical dates (1970)
- ✅ Future dates (2099)

## Test Results

Total: 33 tests
- ✅ All tests passing
- Coverage: extractDate(), formatDate(), hasValidDate()

## Requirements Coverage

These tests verify the following requirements:
- **1.1**: ISO 8601 timestamp extraction
- **1.2**: Non-dated folder classification
- **1.3**: Handling formats with/without milliseconds
- **1.4**: Multiple timestamp handling (first valid timestamp)
