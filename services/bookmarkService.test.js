/**
 * Unit Tests for Bookmark Service
 * Tests folder retrieval, filtering, sorting, revert logic, and permission checking
 */

const BookmarkService = require('./bookmarkService.js');
const DateParser = require('./dateParser.js');

// Mock browser API
global.browser = {
  bookmarks: {
    getTree: null,
    getChildren: null,
    get: null,
    move: null
  }
};

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

  assertGreaterThan(actual, expected, message = '') {
    if (actual <= expected) {
      throw new Error(`${message}\nExpected ${actual} to be greater than ${expected}`);
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

// Helper function to create mock bookmark tree
function createMockBookmarkTree() {
  return [
    {
      id: 'root',
      title: '',
      children: [
        {
          id: 'toolbar',
          title: 'Bookmarks Toolbar',
          children: [
            {
              id: 'folder1',
              title: 'Regular Folder',
              parentId: 'toolbar',
              index: 0,
              children: []
            },
            {
              id: 'bookmark1',
              title: 'Google',
              url: 'https://google.com',
              parentId: 'toolbar',
              index: 1
            }
          ]
        },
        {
          id: 'menu',
          title: 'Bookmarks Menu',
          children: [
            {
              id: 'folder2',
              title: 'Work Folder',
              parentId: 'menu',
              index: 0,
              children: []
            }
          ]
        }
      ]
    }
  ];
}

// Test Suite: getAllFolders - Folder Retrieval and Filtering

runner.test('Should retrieve all folders from bookmark tree', async () => {
  const service = new BookmarkService();
  
  browser.bookmarks.getTree = async () => createMockBookmarkTree();
  
  const folders = await service.getAllFolders();
  
  runner.assertTrue(Array.isArray(folders), 'Should return an array');
  runner.assertTrue(folders.length > 0, 'Should return at least one folder');
});

runner.test('Should filter out bookmarks (items with URLs)', async () => {
  const service = new BookmarkService();
  
  browser.bookmarks.getTree = async () => createMockBookmarkTree();
  
  const folders = await service.getAllFolders();
  
  // Check that no folder has a url property
  const hasUrl = folders.some(folder => folder.url !== undefined);
  runner.assertFalse(hasUrl, 'Should not include items with URLs');
});

runner.test('Should extract folders recursively from nested structure', async () => {
  const service = new BookmarkService();
  
  browser.bookmarks.getTree = async () => createMockBookmarkTree();
  
  const folders = await service.getAllFolders();
  
  // Should find nested folders
  const flattenFolders = (folders) => {
    let result = [];
    for (const folder of folders) {
      result.push(folder);
      if (folder.children && folder.children.length > 0) {
        result = result.concat(flattenFolders(folder.children));
      }
    }
    return result;
  };
  
  const allFolders = flattenFolders(folders);
  runner.assertTrue(allFolders.length >= 3, 'Should find nested folders');
});

runner.test('Should handle empty bookmark tree', async () => {
  const service = new BookmarkService();
  
  browser.bookmarks.getTree = async () => [{ id: 'root', title: '', children: [] }];
  
  const folders = await service.getAllFolders();
  
  runner.assertTrue(Array.isArray(folders), 'Should return an array');
});

runner.test('Should throw error when getTree fails', async () => {
  const service = new BookmarkService();
  
  browser.bookmarks.getTree = async () => {
    throw new Error('API Error');
  };
  
  try {
    await service.getAllFolders();
    throw new Error('Should have thrown an error');
  } catch (error) {
    runner.assertTrue(error.message.includes('Failed to retrieve'), 'Should throw appropriate error');
  }
});

// Test Suite: getSubfolders - Immediate Children Retrieval

runner.test('Should get immediate subfolders only', async () => {
  const service = new BookmarkService();
  
  browser.bookmarks.getChildren = async (folderId) => {
    if (folderId === 'parent1') {
      return [
        { id: 'child1', title: 'Child 1', parentId: 'parent1', index: 0 },
        { id: 'child2', title: 'Child 2', parentId: 'parent1', index: 1 },
        { id: 'bookmark1', title: 'Bookmark', url: 'https://example.com', parentId: 'parent1', index: 2 }
      ];
    }
    return [];
  };
  
  const subfolders = await service.getSubfolders('parent1');
  
  runner.assertEqual(subfolders.length, 2, 'Should return only folders, not bookmarks');
  runner.assertEqual(subfolders[0].id, 'child1', 'Should return correct folder');
});

runner.test('Should filter out bookmarks from subfolders', async () => {
  const service = new BookmarkService();
  
  browser.bookmarks.getChildren = async () => [
    { id: 'folder1', title: 'Folder', parentId: 'parent', index: 0 },
    { id: 'bookmark1', title: 'Bookmark', url: 'https://example.com', parentId: 'parent', index: 1 }
  ];
  
  const subfolders = await service.getSubfolders('parent');
  
  runner.assertEqual(subfolders.length, 1, 'Should exclude bookmarks');
  runner.assertFalse(subfolders[0].url !== undefined, 'Should not have url property');
});

runner.test('Should return empty array when folder has no subfolders', async () => {
  const service = new BookmarkService();
  
  browser.bookmarks.getChildren = async () => [];
  
  const subfolders = await service.getSubfolders('empty-folder');
  
  runner.assertEqual(subfolders.length, 0, 'Should return empty array');
});

runner.test('Should throw error when getChildren fails', async () => {
  const service = new BookmarkService();
  
  browser.bookmarks.getChildren = async () => {
    throw new Error('API Error');
  };
  
  try {
    await service.getSubfolders('folder1');
    throw new Error('Should have thrown an error');
  } catch (error) {
    runner.assertTrue(error.message.includes('Failed to retrieve'), 'Should throw appropriate error');
  }
});

// Test Suite: rearrangeFolders - Sorting Algorithm

runner.test('Should sort dated folders in descending order (newest first)', async () => {
  const service = new BookmarkService();
  const dateParser = new DateParser();
  
  browser.bookmarks.getChildren = async () => [
    { id: 'f1', title: 'saved-2025-01-01T00:00:00Z', parentId: 'parent', index: 0 },
    { id: 'f2', title: 'saved-2025-12-31T23:59:59Z', parentId: 'parent', index: 1 },
    { id: 'f3', title: 'saved-2025-06-15T12:00:00Z', parentId: 'parent', index: 2 }
  ];
  
  const moves = [];
  browser.bookmarks.move = async (id, details) => {
    moves.push({ id, ...details });
    return { id };
  };
  
  const result = await service.rearrangeFolders('parent', dateParser);
  
  runner.assertTrue(result.success, 'Should succeed');
  runner.assertGreaterThan(result.movedCount, 0, 'Should move at least one folder');
  
  // Verify newest is first (f2 with 2025-12-31)
  const f2Move = moves.find(m => m.id === 'f2');
  runner.assertEqual(f2Move.index, 0, 'Newest folder should be at index 0');
});

runner.test('Should place non-dated folders at bottom preserving order', async () => {
  const service = new BookmarkService();
  const dateParser = new DateParser();
  
  browser.bookmarks.getChildren = async () => [
    { id: 'f1', title: 'saved-2025-01-01T00:00:00Z', parentId: 'parent', index: 0 },
    { id: 'f2', title: 'Regular Folder A', parentId: 'parent', index: 1 },
    { id: 'f3', title: 'Regular Folder B', parentId: 'parent', index: 2 },
    { id: 'f4', title: 'saved-2025-12-31T23:59:59Z', parentId: 'parent', index: 3 }
  ];
  
  const moves = [];
  browser.bookmarks.move = async (id, details) => {
    moves.push({ id, ...details });
    return { id };
  };
  
  const result = await service.rearrangeFolders('parent', dateParser);
  
  runner.assertTrue(result.success, 'Should succeed');
  
  // Non-dated folders should be at the end
  const f2Move = moves.find(m => m.id === 'f2');
  const f3Move = moves.find(m => m.id === 'f3');
  
  if (f2Move && f3Move) {
    runner.assertTrue(f2Move.index > 1, 'Non-dated folder should be after dated folders');
    runner.assertTrue(f3Move.index > f2Move.index, 'Non-dated folders should preserve relative order');
  }
});

runner.test('Should handle mixed dated and non-dated folders', async () => {
  const service = new BookmarkService();
  const dateParser = new DateParser();
  
  browser.bookmarks.getChildren = async () => [
    { id: 'f1', title: 'Work', parentId: 'parent', index: 0 },
    { id: 'f2', title: 'saved-2025-03-15T10:30:00Z', parentId: 'parent', index: 1 },
    { id: 'f3', title: 'Personal', parentId: 'parent', index: 2 },
    { id: 'f4', title: 'saved-2025-01-01T00:00:00Z', parentId: 'parent', index: 3 }
  ];
  
  browser.bookmarks.move = async (id, details) => {
    return { id };
  };
  
  const result = await service.rearrangeFolders('parent', dateParser);
  
  runner.assertTrue(result.success, 'Should succeed with mixed folders');
  runner.assertGreaterThan(result.movedCount, 0, 'Should move folders');
});

runner.test('Should return error when no subfolders found', async () => {
  const service = new BookmarkService();
  const dateParser = new DateParser();
  
  browser.bookmarks.getChildren = async () => [];
  
  const result = await service.rearrangeFolders('parent', dateParser);
  
  runner.assertFalse(result.success, 'Should fail');
  runner.assertEqual(result.movedCount, 0, 'Should not move any folders');
  runner.assertTrue(result.error.includes('No subfolders'), 'Should have appropriate error message');
});

runner.test('Should return error when no dated subfolders found', async () => {
  const service = new BookmarkService();
  const dateParser = new DateParser();
  
  browser.bookmarks.getChildren = async () => [
    { id: 'f1', title: 'Regular Folder', parentId: 'parent', index: 0 },
    { id: 'f2', title: 'Another Folder', parentId: 'parent', index: 1 }
  ];
  
  const result = await service.rearrangeFolders('parent', dateParser);
  
  runner.assertFalse(result.success, 'Should fail');
  runner.assertEqual(result.movedCount, 0, 'Should not move any folders');
  runner.assertTrue(result.error.includes('No subfolders with valid dates'), 'Should have appropriate error message');
});

runner.test('Should only move folders that changed position', async () => {
  const service = new BookmarkService();
  const dateParser = new DateParser();
  
  browser.bookmarks.getChildren = async () => [
    { id: 'f1', title: 'saved-2025-12-31T23:59:59Z', parentId: 'parent', index: 0 },
    { id: 'f2', title: 'saved-2025-06-15T12:00:00Z', parentId: 'parent', index: 1 },
    { id: 'f3', title: 'saved-2025-01-01T00:00:00Z', parentId: 'parent', index: 2 }
  ];
  
  let moveCount = 0;
  browser.bookmarks.move = async (id, details) => {
    moveCount++;
    return { id };
  };
  
  const result = await service.rearrangeFolders('parent', dateParser);
  
  runner.assertTrue(result.success, 'Should succeed');
  runner.assertEqual(result.movedCount, 0, 'Should not move folders already in correct order');
});

runner.test('Should handle API errors during rearrangement', async () => {
  const service = new BookmarkService();
  const dateParser = new DateParser();
  
  browser.bookmarks.getChildren = async () => [
    { id: 'f1', title: 'saved-2025-01-01T00:00:00Z', parentId: 'parent', index: 0 },
    { id: 'f2', title: 'saved-2025-06-15T12:00:00Z', parentId: 'parent', index: 1 }
  ];
  
  browser.bookmarks.move = async () => {
    throw new Error('Move failed');
  };
  
  const result = await service.rearrangeFolders('parent', dateParser);
  
  runner.assertFalse(result.success, 'Should fail');
  runner.assertTrue(result.error !== undefined, 'Should have error message');
});

// Test Suite: revertFolders - Revert Logic

runner.test('Should restore folders to original positions', async () => {
  const service = new BookmarkService();
  
  const backup = {
    timestamp: Date.now(),
    folders: [
      { id: 'f1', index: 0 },
      { id: 'f2', index: 1 },
      { id: 'f3', index: 2 }
    ]
  };
  
  browser.bookmarks.get = async () => [{ id: 'parent', title: 'Parent' }];
  browser.bookmarks.getChildren = async () => [
    { id: 'f1', title: 'Folder 1', parentId: 'parent', index: 2 },
    { id: 'f2', title: 'Folder 2', parentId: 'parent', index: 0 },
    { id: 'f3', title: 'Folder 3', parentId: 'parent', index: 1 }
  ];
  
  const moves = [];
  browser.bookmarks.move = async (id, details) => {
    moves.push({ id, ...details });
    return { id };
  };
  
  const result = await service.revertFolders('parent', backup);
  
  runner.assertTrue(result, 'Should succeed');
  runner.assertEqual(moves.length, 3, 'Should move all folders');
  
  // Verify folders moved to original indices
  const f1Move = moves.find(m => m.id === 'f1');
  runner.assertEqual(f1Move.index, 0, 'f1 should be at index 0');
});

runner.test('Should handle invalid backup data', async () => {
  const service = new BookmarkService();
  
  try {
    await service.revertFolders('parent', null);
    throw new Error('Should have thrown an error');
  } catch (error) {
    runner.assertTrue(error.message.includes('Invalid backup'), 'Should throw invalid backup error');
  }
});

runner.test('Should handle missing folders array in backup', async () => {
  const service = new BookmarkService();
  
  const backup = { timestamp: Date.now() };
  
  try {
    await service.revertFolders('parent', backup);
    throw new Error('Should have thrown an error');
  } catch (error) {
    runner.assertTrue(error.message.includes('Invalid backup'), 'Should throw invalid backup error');
  }
});

runner.test('Should handle non-existent parent folder', async () => {
  const service = new BookmarkService();
  
  const backup = {
    timestamp: Date.now(),
    folders: [{ id: 'f1', index: 0 }]
  };
  
  browser.bookmarks.get = async () => {
    throw new Error('Folder not found');
  };
  
  try {
    await service.revertFolders('nonexistent', backup);
    throw new Error('Should have thrown an error');
  } catch (error) {
    runner.assertTrue(error.message.includes('no longer exists'), 'Should throw folder not found error');
  }
});

runner.test('Should filter out folders that no longer exist', async () => {
  const service = new BookmarkService();
  
  const backup = {
    timestamp: Date.now(),
    folders: [
      { id: 'f1', index: 0 },
      { id: 'f2', index: 1 },
      { id: 'deleted', index: 2 }
    ]
  };
  
  browser.bookmarks.get = async () => [{ id: 'parent', title: 'Parent' }];
  browser.bookmarks.getChildren = async () => [
    { id: 'f1', title: 'Folder 1', parentId: 'parent', index: 0 },
    { id: 'f2', title: 'Folder 2', parentId: 'parent', index: 1 }
  ];
  
  const moves = [];
  browser.bookmarks.move = async (id, details) => {
    moves.push({ id, ...details });
    return { id };
  };
  
  const result = await service.revertFolders('parent', backup);
  
  runner.assertTrue(result, 'Should succeed');
  runner.assertEqual(moves.length, 2, 'Should only move existing folders');
});

runner.test('Should throw error when no backup folders exist', async () => {
  const service = new BookmarkService();
  
  const backup = {
    timestamp: Date.now(),
    folders: [
      { id: 'deleted1', index: 0 },
      { id: 'deleted2', index: 1 }
    ]
  };
  
  browser.bookmarks.get = async () => [{ id: 'parent', title: 'Parent' }];
  browser.bookmarks.getChildren = async () => [];
  
  try {
    await service.revertFolders('parent', backup);
    throw new Error('Should have thrown an error');
  } catch (error) {
    runner.assertTrue(error.message.includes('No folders from backup'), 'Should throw appropriate error');
  }
});

runner.test('Should continue reverting even if one folder move fails', async () => {
  const service = new BookmarkService();
  
  const backup = {
    timestamp: Date.now(),
    folders: [
      { id: 'f1', index: 0 },
      { id: 'f2', index: 1 },
      { id: 'f3', index: 2 }
    ]
  };
  
  browser.bookmarks.get = async () => [{ id: 'parent', title: 'Parent' }];
  browser.bookmarks.getChildren = async () => [
    { id: 'f1', title: 'Folder 1', parentId: 'parent', index: 0 },
    { id: 'f2', title: 'Folder 2', parentId: 'parent', index: 1 },
    { id: 'f3', title: 'Folder 3', parentId: 'parent', index: 2 }
  ];
  
  let moveCount = 0;
  browser.bookmarks.move = async (id, details) => {
    moveCount++;
    if (id === 'f2') {
      throw new Error('Move failed for f2');
    }
    return { id };
  };
  
  const result = await service.revertFolders('parent', backup);
  
  runner.assertTrue(result, 'Should succeed despite one failure');
  runner.assertEqual(moveCount, 3, 'Should attempt to move all folders');
});

// Test Suite: hasPermissions - Permission Checking

runner.test('Should return true when bookmark permissions are granted', async () => {
  const service = new BookmarkService();
  
  browser.bookmarks.getTree = async () => createMockBookmarkTree();
  
  const hasPerms = await service.hasPermissions();
  
  runner.assertTrue(hasPerms, 'Should return true when permissions granted');
});

runner.test('Should return false when bookmark permissions are denied', async () => {
  const service = new BookmarkService();
  
  browser.bookmarks.getTree = async () => {
    throw new Error('Permission denied');
  };
  
  const hasPerms = await service.hasPermissions();
  
  runner.assertFalse(hasPerms, 'Should return false when permissions denied');
});

runner.test('Should return false when API is unavailable', async () => {
  const service = new BookmarkService();
  
  browser.bookmarks.getTree = async () => {
    throw new Error('API unavailable');
  };
  
  const hasPerms = await service.hasPermissions();
  
  runner.assertFalse(hasPerms, 'Should return false when API unavailable');
});

// Run all tests
runner.run().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
