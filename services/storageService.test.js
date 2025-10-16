/**
 * Unit Tests for Storage Service
 * Tests preference saving/retrieval, backup creation/retrieval, and error handling
 */

const StorageService = require('./storageService.js');

// Mock browser.storage.local API
global.browser = {
  storage: {
    local: {
      data: {},
      get: function(keys) {
        return Promise.resolve(
          typeof keys === 'string' 
            ? { [keys]: this.data[keys] }
            : keys.reduce((acc, key) => {
                acc[key] = this.data[key];
                return acc;
              }, {})
        );
      },
      set: function(items) {
        Object.assign(this.data, items);
        return Promise.resolve();
      },
      clear: function() {
        this.data = {};
        return Promise.resolve();
      },
      // Helper to simulate errors
      _simulateError: false,
      _originalGet: null,
      _originalSet: null
    }
  }
};

// Simple test framework (same as dateParser tests)
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

  async run() {
    console.log(`\n🧪 Running ${this.tests.length} tests...\n`);

    for (const { description, fn } of this.tests) {
      try {
        // Clear storage before each test
        await global.browser.storage.local.clear();
        // Reset error simulation
        global.browser.storage.local._simulateError = false;
        
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

// Test Suite: Date Format Preference Saving and Retrieval

runner.test('Should save date format preference', async () => {
  const service = new StorageService();
  await service.saveDateFormat('DD-MM-YY');
  
  const result = await global.browser.storage.local.get('preferences');
  runner.assertEqual(result.preferences.dateFormat, 'DD-MM-YY', 'Should save date format');
});

runner.test('Should retrieve saved date format preference', async () => {
  const service = new StorageService();
  await service.saveDateFormat('MM-DD-YY');
  
  const format = await service.getDateFormat();
  runner.assertEqual(format, 'MM-DD-YY', 'Should retrieve saved format');
});

runner.test('Should return default date format when no preference exists', async () => {
  const service = new StorageService();
  const format = await service.getDateFormat();
  
  runner.assertEqual(format, 'YYYY-MM-DD', 'Should return default format');
});

runner.test('Should update existing date format preference', async () => {
  const service = new StorageService();
  await service.saveDateFormat('DD-MM-YY');
  await service.saveDateFormat('YYYY-MM-DD');
  
  const format = await service.getDateFormat();
  runner.assertEqual(format, 'YYYY-MM-DD', 'Should update to new format');
});

runner.test('Should preserve other preferences when saving date format', async () => {
  const service = new StorageService();
  // Manually set some other preference
  await global.browser.storage.local.set({
    preferences: { otherSetting: 'value', dateFormat: 'DD-MM-YY' }
  });
  
  await service.saveDateFormat('YYYY-MM-DD');
  
  const result = await global.browser.storage.local.get('preferences');
  runner.assertEqual(result.preferences.otherSetting, 'value', 'Should preserve other settings');
  runner.assertEqual(result.preferences.dateFormat, 'YYYY-MM-DD', 'Should update date format');
});

// Test Suite: Backup Creation and Retrieval

runner.test('Should save backup for a folder', async () => {
  const service = new StorageService();
  const folderId = 'folder123';
  const folders = [
    { id: 'sub1', index: 0 },
    { id: 'sub2', index: 1 },
    { id: 'sub3', index: 2 }
  ];
  
  await service.saveBackup(folderId, folders);
  
  const result = await global.browser.storage.local.get('backups');
  runner.assertTrue(result.backups[folderId] !== undefined, 'Should save backup');
  runner.assertEqual(result.backups[folderId].folders, folders, 'Should save folder data');
});

runner.test('Should include timestamp when saving backup', async () => {
  const service = new StorageService();
  const folderId = 'folder123';
  const folders = [{ id: 'sub1', index: 0 }];
  
  const beforeTime = Date.now();
  await service.saveBackup(folderId, folders);
  const afterTime = Date.now();
  
  const result = await global.browser.storage.local.get('backups');
  const timestamp = result.backups[folderId].timestamp;
  
  runner.assertTrue(timestamp >= beforeTime && timestamp <= afterTime, 'Should include valid timestamp');
});

runner.test('Should retrieve backup for a specific folder', async () => {
  const service = new StorageService();
  const folderId = 'folder123';
  const folders = [
    { id: 'sub1', index: 0 },
    { id: 'sub2', index: 1 }
  ];
  
  await service.saveBackup(folderId, folders);
  const backup = await service.getBackup(folderId);
  
  runner.assertEqual(backup.folders, folders, 'Should retrieve correct backup');
  runner.assertTrue(backup.timestamp > 0, 'Should include timestamp');
});

runner.test('Should return null when backup does not exist', async () => {
  const service = new StorageService();
  const backup = await service.getBackup('nonexistent');
  
  runner.assertNull(backup, 'Should return null for nonexistent backup');
});

runner.test('Should overwrite existing backup for same folder', async () => {
  const service = new StorageService();
  const folderId = 'folder123';
  const folders1 = [{ id: 'sub1', index: 0 }];
  const folders2 = [{ id: 'sub1', index: 1 }, { id: 'sub2', index: 0 }];
  
  await service.saveBackup(folderId, folders1);
  await service.saveBackup(folderId, folders2);
  
  const backup = await service.getBackup(folderId);
  runner.assertEqual(backup.folders, folders2, 'Should overwrite with new backup');
});

runner.test('Should maintain separate backups for different folders', async () => {
  const service = new StorageService();
  const folders1 = [{ id: 'sub1', index: 0 }];
  const folders2 = [{ id: 'sub2', index: 0 }];
  
  await service.saveBackup('folder1', folders1);
  await service.saveBackup('folder2', folders2);
  
  const backup1 = await service.getBackup('folder1');
  const backup2 = await service.getBackup('folder2');
  
  runner.assertEqual(backup1.folders, folders1, 'Should maintain folder1 backup');
  runner.assertEqual(backup2.folders, folders2, 'Should maintain folder2 backup');
});

runner.test('Should check if backup exists', async () => {
  const service = new StorageService();
  const folderId = 'folder123';
  const folders = [{ id: 'sub1', index: 0 }];
  
  const beforeSave = await service.hasBackup(folderId);
  await service.saveBackup(folderId, folders);
  const afterSave = await service.hasBackup(folderId);
  
  runner.assertFalse(beforeSave, 'Should return false before backup exists');
  runner.assertTrue(afterSave, 'Should return true after backup is saved');
});

runner.test('Should return false when checking nonexistent backup', async () => {
  const service = new StorageService();
  const hasBackup = await service.hasBackup('nonexistent');
  
  runner.assertFalse(hasBackup, 'Should return false for nonexistent backup');
});

// Test Suite: Error Handling

runner.test('Should throw error when saveDateFormat fails', async () => {
  const service = new StorageService();
  
  // Simulate storage error
  const originalSet = global.browser.storage.local.set;
  global.browser.storage.local.set = () => Promise.reject(new Error('Storage error'));
  
  let errorThrown = false;
  try {
    await service.saveDateFormat('DD-MM-YY');
  } catch (error) {
    errorThrown = true;
    runner.assertTrue(error.message.includes('Failed to save'), 'Should throw meaningful error');
  }
  
  // Restore original function
  global.browser.storage.local.set = originalSet;
  
  runner.assertTrue(errorThrown, 'Should throw error on storage failure');
});

runner.test('Should return default format when getDateFormat fails', async () => {
  const service = new StorageService();
  
  // Simulate storage error
  const originalGet = global.browser.storage.local.get;
  global.browser.storage.local.get = () => Promise.reject(new Error('Storage error'));
  
  const format = await service.getDateFormat();
  
  // Restore original function
  global.browser.storage.local.get = originalGet;
  
  runner.assertEqual(format, 'YYYY-MM-DD', 'Should return default on error');
});

runner.test('Should throw error when saveBackup fails', async () => {
  const service = new StorageService();
  
  // Simulate storage error
  const originalSet = global.browser.storage.local.set;
  global.browser.storage.local.set = () => Promise.reject(new Error('Storage error'));
  
  let errorThrown = false;
  try {
    await service.saveBackup('folder123', [{ id: 'sub1', index: 0 }]);
  } catch (error) {
    errorThrown = true;
    runner.assertTrue(error.message.includes('Failed to save'), 'Should throw meaningful error');
  }
  
  // Restore original function
  global.browser.storage.local.set = originalSet;
  
  runner.assertTrue(errorThrown, 'Should throw error on storage failure');
});

runner.test('Should return null when getBackup fails', async () => {
  const service = new StorageService();
  
  // Simulate storage error
  const originalGet = global.browser.storage.local.get;
  global.browser.storage.local.get = () => Promise.reject(new Error('Storage error'));
  
  const backup = await service.getBackup('folder123');
  
  // Restore original function
  global.browser.storage.local.get = originalGet;
  
  runner.assertNull(backup, 'Should return null on error');
});

runner.test('Should return false when hasBackup fails', async () => {
  const service = new StorageService();
  
  // Simulate storage error
  const originalGet = global.browser.storage.local.get;
  global.browser.storage.local.get = () => Promise.reject(new Error('Storage error'));
  
  const hasBackup = await service.hasBackup('folder123');
  
  // Restore original function
  global.browser.storage.local.get = originalGet;
  
  runner.assertFalse(hasBackup, 'Should return false on error');
});

// Test Suite: Edge Cases

runner.test('Should handle empty folder array in backup', async () => {
  const service = new StorageService();
  const folderId = 'folder123';
  const folders = [];
  
  await service.saveBackup(folderId, folders);
  const backup = await service.getBackup(folderId);
  
  runner.assertEqual(backup.folders, [], 'Should handle empty folder array');
});

runner.test('Should handle backup with many folders', async () => {
  const service = new StorageService();
  const folderId = 'folder123';
  const folders = Array.from({ length: 100 }, (_, i) => ({ id: `sub${i}`, index: i }));
  
  await service.saveBackup(folderId, folders);
  const backup = await service.getBackup(folderId);
  
  runner.assertEqual(backup.folders.length, 100, 'Should handle large backup');
  runner.assertEqual(backup.folders[0].id, 'sub0', 'Should preserve order');
  runner.assertEqual(backup.folders[99].id, 'sub99', 'Should preserve all items');
});

runner.test('Should handle special characters in folder IDs', async () => {
  const service = new StorageService();
  const folderId = 'folder-with-special_chars@123';
  const folders = [{ id: 'sub#1', index: 0 }];
  
  await service.saveBackup(folderId, folders);
  const backup = await service.getBackup(folderId);
  
  runner.assertEqual(backup.folders, folders, 'Should handle special characters');
});

// Run all tests
runner.run().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
