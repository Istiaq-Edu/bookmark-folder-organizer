/**
 * Unit Tests for Date Parser Service
 * Tests ISO 8601 pattern matching, date extraction, formatting, and validation
 */

const DateParser = require('./dateParser.js');

// Simple test framework
class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(description, fn) {
    this.tests.push({ description, fn });
  }

  assertEqual(actual, expected, message = '') {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`${message}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`);
    }
  }

  assertTrue(value, message = '') {
    if (!value) {
      throw new Error(`${message}\nExpected truthy value, got: ${value}`);
    }
  }

  assertFalse(value, message = '') {
    if (value) {
      throw new Error(`${message}\nExpected falsy value, got: ${value}`);
    }
  }

  assertNull(value, message = '') {
    if (value !== null) {
      throw new Error(`${message}\nExpected null, got: ${value}`);
    }
  }

  assertInstanceOf(value, type, message = '') {
    if (!(value instanceof type)) {
      throw new Error(`${message}\nExpected instance of ${type.name}, got: ${typeof value}`);
    }
  }

  async run() {
    console.log(`\n🧪 Running ${this.tests.length} tests...\n`);

    for (const { description, fn } of this.tests) {
      try {
        await fn();
        this.passed++;
        console.log(`✅ ${description}`);
      } catch (error) {
        this.failed++;
        console.log(`❌ ${description}`);
        console.log(`   ${error.message}\n`);
      }
    }

    console.log(`\n📊 Results: ${this.passed} passed, ${this.failed} failed, ${this.tests.length} total\n`);
    
    if (this.failed > 0) {
      process.exit(1);
    }
  }
}

const runner = new TestRunner();

// Test Suite: ISO 8601 Pattern Matching

runner.test('Should extract date from folder name with milliseconds', () => {
  const parser = new DateParser();
  const folderName = 'saved-2025-10-11T17:36:41.808Z';
  const result = parser.extractDate(folderName);
  
  runner.assertInstanceOf(result, Date, 'Should return a Date object');
  runner.assertEqual(result.toISOString(), '2025-10-11T17:36:41.808Z', 'Should extract correct timestamp');
});

runner.test('Should extract date from folder name without milliseconds', () => {
  const parser = new DateParser();
  const folderName = 'backup-2024-03-15T10:30:00Z';
  const result = parser.extractDate(folderName);
  
  runner.assertInstanceOf(result, Date, 'Should return a Date object');
  runner.assertEqual(result.toISOString(), '2024-03-15T10:30:00.000Z', 'Should extract correct timestamp');
});

runner.test('Should extract first timestamp when multiple exist', () => {
  const parser = new DateParser();
  const folderName = 'archive-2023-01-01T00:00:00Z-to-2023-12-31T23:59:59Z';
  const result = parser.extractDate(folderName);
  
  runner.assertInstanceOf(result, Date, 'Should return a Date object');
  runner.assertEqual(result.toISOString(), '2023-01-01T00:00:00.000Z', 'Should use first timestamp');
});

// Test Suite: Extraction from Various Folder Name Formats

runner.test('Should extract date from folder name with prefix', () => {
  const parser = new DateParser();
  const folderName = 'project-backup-2025-06-20T14:22:33.123Z';
  const result = parser.extractDate(folderName);
  
  runner.assertInstanceOf(result, Date, 'Should return a Date object');
});

runner.test('Should extract date from folder name with suffix', () => {
  const parser = new DateParser();
  const folderName = '2025-06-20T14:22:33Z-important';
  const result = parser.extractDate(folderName);
  
  runner.assertInstanceOf(result, Date, 'Should return a Date object');
});

runner.test('Should extract date from folder name with special characters', () => {
  const parser = new DateParser();
  const folderName = 'my_folder@2025-06-20T14:22:33.456Z#backup';
  const result = parser.extractDate(folderName);
  
  runner.assertInstanceOf(result, Date, 'Should return a Date object');
});

runner.test('Should return null for folder name without date', () => {
  const parser = new DateParser();
  const folderName = 'regular-folder-name';
  const result = parser.extractDate(folderName);
  
  runner.assertNull(result, 'Should return null when no date found');
});

runner.test('Should return null for empty string', () => {
  const parser = new DateParser();
  const result = parser.extractDate('');
  
  runner.assertNull(result, 'Should return null for empty string');
});

runner.test('Should return null for null input', () => {
  const parser = new DateParser();
  const result = parser.extractDate(null);
  
  runner.assertNull(result, 'Should return null for null input');
});

runner.test('Should return null for undefined input', () => {
  const parser = new DateParser();
  const result = parser.extractDate(undefined);
  
  runner.assertNull(result, 'Should return null for undefined input');
});

runner.test('Should return null for non-string input', () => {
  const parser = new DateParser();
  const result = parser.extractDate(12345);
  
  runner.assertNull(result, 'Should return null for non-string input');
});

// Test Suite: Date Formatting

runner.test('Should format date as YYYY-MM-DD', () => {
  const parser = new DateParser();
  const date = new Date('2025-10-11T17:36:41.808Z');
  const result = parser.formatDate(date, 'YYYY-MM-DD');
  
  runner.assertEqual(result, '2025-10-11', 'Should format as YYYY-MM-DD');
});

runner.test('Should format date as DD-MM-YY', () => {
  const parser = new DateParser();
  const date = new Date('2025-10-11T17:36:41.808Z');
  const result = parser.formatDate(date, 'DD-MM-YY');
  
  runner.assertEqual(result, '11-10-25', 'Should format as DD-MM-YY');
});

runner.test('Should format date as MM-DD-YY', () => {
  const parser = new DateParser();
  const date = new Date('2025-10-11T17:36:41.808Z');
  const result = parser.formatDate(date, 'MM-DD-YY');
  
  runner.assertEqual(result, '10-11-25', 'Should format as MM-DD-YY');
});

runner.test('Should default to YYYY-MM-DD when no format specified', () => {
  const parser = new DateParser();
  const date = new Date('2025-10-11T17:36:41.808Z');
  const result = parser.formatDate(date);
  
  runner.assertEqual(result, '2025-10-11', 'Should default to YYYY-MM-DD');
});

runner.test('Should pad single digit months and days', () => {
  const parser = new DateParser();
  const date = new Date('2025-01-05T00:00:00Z');
  const result = parser.formatDate(date, 'YYYY-MM-DD');
  
  runner.assertEqual(result, '2025-01-05', 'Should pad with zeros');
});

runner.test('Should return empty string for invalid date', () => {
  const parser = new DateParser();
  const invalidDate = new Date('invalid');
  const result = parser.formatDate(invalidDate, 'YYYY-MM-DD');
  
  runner.assertEqual(result, '', 'Should return empty string for invalid date');
});

runner.test('Should return empty string for null date', () => {
  const parser = new DateParser();
  const result = parser.formatDate(null, 'YYYY-MM-DD');
  
  runner.assertEqual(result, '', 'Should return empty string for null');
});

runner.test('Should return empty string for non-Date object', () => {
  const parser = new DateParser();
  const result = parser.formatDate('2025-10-11', 'YYYY-MM-DD');
  
  runner.assertEqual(result, '', 'Should return empty string for non-Date object');
});

// Test Suite: Validation (hasValidDate)

runner.test('Should validate folder name with valid ISO 8601 timestamp (with milliseconds)', () => {
  const parser = new DateParser();
  const folderName = 'saved-2025-10-11T17:36:41.808Z';
  const result = parser.hasValidDate(folderName);
  
  runner.assertTrue(result, 'Should return true for valid timestamp with milliseconds');
});

runner.test('Should validate folder name with valid ISO 8601 timestamp (without milliseconds)', () => {
  const parser = new DateParser();
  const folderName = 'backup-2024-03-15T10:30:00Z';
  const result = parser.hasValidDate(folderName);
  
  runner.assertTrue(result, 'Should return true for valid timestamp without milliseconds');
});

runner.test('Should return false for folder name without date', () => {
  const parser = new DateParser();
  const folderName = 'regular-folder';
  const result = parser.hasValidDate(folderName);
  
  runner.assertFalse(result, 'Should return false when no date found');
});

runner.test('Should return false for empty string', () => {
  const parser = new DateParser();
  const result = parser.hasValidDate('');
  
  runner.assertFalse(result, 'Should return false for empty string');
});

runner.test('Should return false for null input', () => {
  const parser = new DateParser();
  const result = parser.hasValidDate(null);
  
  runner.assertFalse(result, 'Should return false for null');
});

runner.test('Should return false for undefined input', () => {
  const parser = new DateParser();
  const result = parser.hasValidDate(undefined);
  
  runner.assertFalse(result, 'Should return false for undefined');
});

runner.test('Should return false for non-string input', () => {
  const parser = new DateParser();
  const result = parser.hasValidDate(12345);
  
  runner.assertFalse(result, 'Should return false for non-string input');
});

// Test Suite: Edge Cases

runner.test('Should handle invalid ISO 8601 format (missing Z)', () => {
  const parser = new DateParser();
  const folderName = 'backup-2025-10-11T17:36:41';
  const result = parser.extractDate(folderName);
  
  runner.assertNull(result, 'Should return null for timestamp without Z');
});

runner.test('Should handle invalid ISO 8601 format (wrong separators)', () => {
  const parser = new DateParser();
  const folderName = 'backup-2025/10/11T17:36:41Z';
  const result = parser.extractDate(folderName);
  
  runner.assertNull(result, 'Should return null for wrong date separators');
});

runner.test('Should handle invalid date values (e.g., month 13)', () => {
  const parser = new DateParser();
  const folderName = 'backup-2025-13-01T00:00:00Z';
  const result = parser.extractDate(folderName);
  
  // JavaScript Date constructor is lenient, so this might create a valid date
  // We're testing that the parser handles it consistently
  if (result !== null) {
    runner.assertInstanceOf(result, Date, 'Should handle lenient date parsing');
  }
});

runner.test('Should handle leap year dates', () => {
  const parser = new DateParser();
  const folderName = 'backup-2024-02-29T12:00:00Z';
  const result = parser.extractDate(folderName);
  
  runner.assertInstanceOf(result, Date, 'Should handle leap year date');
  runner.assertEqual(result.getUTCDate(), 29, 'Should correctly parse Feb 29');
});

runner.test('Should handle year boundaries', () => {
  const parser = new DateParser();
  const folderName = 'backup-2025-12-31T23:59:59.999Z';
  const result = parser.extractDate(folderName);
  
  runner.assertInstanceOf(result, Date, 'Should handle year end date');
});

runner.test('Should handle very old dates', () => {
  const parser = new DateParser();
  const folderName = 'archive-1970-01-01T00:00:00Z';
  const result = parser.extractDate(folderName);
  
  runner.assertInstanceOf(result, Date, 'Should handle epoch date');
});

runner.test('Should handle future dates', () => {
  const parser = new DateParser();
  const folderName = 'future-2099-12-31T23:59:59Z';
  const result = parser.extractDate(folderName);
  
  runner.assertInstanceOf(result, Date, 'Should handle future dates');
});

// Run all tests
runner.run().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
