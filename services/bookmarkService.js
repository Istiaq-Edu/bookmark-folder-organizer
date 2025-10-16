/**
 * Bookmark Service
 * Manages all bookmark-related operations using Firefox bookmarks API
 */

class BookmarkService {
  /**
   * Retrieves all bookmark folders in a tree structure
   * Filters out non-folder bookmarks
   * @returns {Promise<BookmarkTreeNode[]>} Array of bookmark folder nodes
   */
  async getAllFolders() {
    try {
      // Get the entire bookmark tree
      const tree = await browser.bookmarks.getTree();
      
      // Recursively extract only folders from the tree
      const extractFolders = (nodes) => {
        const folders = [];
        
        for (const node of nodes) {
          // A folder has no 'url' property
          if (!node.url) {
            folders.push({
              id: node.id,
              title: node.title,
              parentId: node.parentId,
              index: node.index,
              children: node.children ? extractFolders(node.children) : []
            });
          }
        }
        
        return folders;
      };
      
      return extractFolders(tree);
    } catch (error) {
      console.error('Error retrieving bookmark folders:', error);
      throw new Error('Failed to retrieve bookmark folders');
    }
  }

  /**
   * Gets immediate children folders of a parent folder
   * Does not recurse into nested subfolders
   * @param {string} folderId - Parent folder ID
   * @returns {Promise<BookmarkTreeNode[]>} Array of immediate subfolder nodes
   */
  async getSubfolders(folderId) {
    try {
      // Get children of the specified folder
      const children = await browser.bookmarks.getChildren(folderId);
      
      // Filter to only include folders (items without URLs)
      const folders = children.filter(child => !child.url);
      
      return folders.map(folder => ({
        id: folder.id,
        title: folder.title,
        parentId: folder.parentId,
        index: folder.index
      }));
    } catch (error) {
      console.error(`Error retrieving subfolders for folder ${folderId}:`, error);
      throw new Error('Failed to retrieve subfolders');
    }
  }

  /**
   * Rearranges subfolders by date (newest first)
   * Dated folders are sorted chronologically, non-dated folders remain at bottom
   * @param {string} parentFolderId - Parent folder ID
   * @param {DateParser} dateParser - Date parser instance
   * @returns {Promise<{success: boolean, movedCount: number, error?: string}>}
   */
  async rearrangeFolders(parentFolderId, dateParser) {
    try {
      // Fetch immediate subfolders of the parent
      const subfolders = await this.getSubfolders(parentFolderId);
      
      if (subfolders.length === 0) {
        return {
          success: false,
          movedCount: 0,
          error: 'No subfolders found in the selected folder'
        };
      }

      // Separate folders into dated and non-dated groups
      const datedFolders = [];
      const nonDatedFolders = [];

      for (const folder of subfolders) {
        const date = dateParser.extractDate(folder.title);
        
        if (date) {
          datedFolders.push({
            ...folder,
            extractedDate: date
          });
        } else {
          nonDatedFolders.push(folder);
        }
      }

      // Check if there are any dated folders to sort
      if (datedFolders.length === 0) {
        return {
          success: false,
          movedCount: 0,
          error: 'No subfolders with valid dates found'
        };
      }

      // Sort dated folders by timestamp in descending order (newest first)
      datedFolders.sort((a, b) => b.extractedDate.getTime() - a.extractedDate.getTime());

      // Concatenate: dated folders + non-dated folders (preserving original order)
      const sortedFolders = [...datedFolders, ...nonDatedFolders];

      // Use browser.bookmarks.move() to reposition folders to new indices
      let movedCount = 0;
      
      for (let newIndex = 0; newIndex < sortedFolders.length; newIndex++) {
        const folder = sortedFolders[newIndex];
        
        // Only move if the folder's position has changed
        if (folder.index !== newIndex) {
          await browser.bookmarks.move(folder.id, {
            parentId: parentFolderId,
            index: newIndex
          });
          movedCount++;
        }
      }

      return {
        success: true,
        movedCount: movedCount
      };

    } catch (error) {
      console.error('Error rearranging folders:', error);
      return {
        success: false,
        movedCount: 0,
        error: error.message || 'Failed to rearrange folders'
      };
    }
  }

  /**
   * Restores folders to original order using backup data
   * @param {string} parentFolderId - Parent folder ID
   * @param {Object} backup - Backup data with original positions
   * @param {Array<{id: string, index: number}>} backup.folders - Array of folder IDs and their original indices
   * @returns {Promise<boolean>} True if revert was successful
   */
  async revertFolders(parentFolderId, backup) {
    try {
      // Validate backup data
      if (!backup || !backup.folders || !Array.isArray(backup.folders)) {
        throw new Error('Invalid backup data');
      }

      // Verify parent folder exists
      try {
        await browser.bookmarks.get(parentFolderId);
      } catch (error) {
        throw new Error('Parent folder no longer exists');
      }

      // Get current subfolders to verify they still exist
      const currentSubfolders = await this.getSubfolders(parentFolderId);
      const currentFolderIds = new Set(currentSubfolders.map(f => f.id));

      // Filter backup to only include folders that still exist
      const validBackupFolders = backup.folders.filter(f => currentFolderIds.has(f.id));

      if (validBackupFolders.length === 0) {
        throw new Error('No folders from backup exist anymore');
      }

      // Sort backup folders by their original index to restore in correct order
      const sortedBackup = [...validBackupFolders].sort((a, b) => a.index - b.index);

      // Restore folders to their original positions
      for (const folderBackup of sortedBackup) {
        try {
          await browser.bookmarks.move(folderBackup.id, {
            parentId: parentFolderId,
            index: folderBackup.index
          });
        } catch (error) {
          console.error(`Error moving folder ${folderBackup.id}:`, error);
          // Continue with other folders even if one fails
        }
      }

      return true;

    } catch (error) {
      console.error('Error reverting folders:', error);
      // Preserve current structure on failure by not making partial changes
      throw new Error(error.message || 'Failed to revert folders');
    }
  }

  /**
   * Checks if the extension has bookmark permissions
   * @returns {Promise<boolean>} True if permissions are granted
   */
  async hasPermissions() {
    try {
      // Attempt to access bookmarks API
      // If we can get the tree, we have permissions
      await browser.bookmarks.getTree();
      return true;
    } catch (error) {
      console.error('Bookmark permissions check failed:', error);
      return false;
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BookmarkService;
}
