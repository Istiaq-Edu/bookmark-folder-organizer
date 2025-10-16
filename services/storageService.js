/**
 * Storage Service
 * Manages browser storage for user preferences and folder backups
 */

class StorageService {
  constructor() {
    this.STORAGE_KEYS = {
      PREFERENCES: 'preferences',
      BACKUPS: 'backups'
    };
    this.DEFAULT_DATE_FORMAT = 'YYYY-MM-DD';
  }

  /**
   * Saves user's date format preference
   * @param {string} format - Date format preference (DD-MM-YY, MM-DD-YY, or YYYY-MM-DD)
   * @returns {Promise<void>}
   */
  async saveDateFormat(format) {
    try {
      const preferences = await this._getPreferences();
      preferences.dateFormat = format;
      await browser.storage.local.set({
        [this.STORAGE_KEYS.PREFERENCES]: preferences
      });
    } catch (error) {
      console.error('Error saving date format:', error);
      throw new Error('Failed to save date format preference');
    }
  }

  /**
   * Retrieves user's date format preference
   * @returns {Promise<string>} - Date format, defaults to 'YYYY-MM-DD'
   */
  async getDateFormat() {
    try {
      const preferences = await this._getPreferences();
      return preferences.dateFormat || this.DEFAULT_DATE_FORMAT;
    } catch (error) {
      console.error('Error getting date format:', error);
      return this.DEFAULT_DATE_FORMAT;
    }
  }

  /**
   * Saves backup of folder order before rearrangement
   * @param {string} parentFolderId - Parent folder ID
   * @param {Array<{id: string, index: number}>} folders - Array of folder objects with id and index
   * @returns {Promise<void>}
   */
  async saveBackup(parentFolderId, folders) {
    try {
      const backups = await this._getBackups();
      backups[parentFolderId] = {
        timestamp: Date.now(),
        folders: folders
      };
      await browser.storage.local.set({
        [this.STORAGE_KEYS.BACKUPS]: backups
      });
    } catch (error) {
      console.error('Error saving backup:', error);
      throw new Error('Failed to save folder backup');
    }
  }

  /**
   * Retrieves backup for a specific folder
   * @param {string} parentFolderId - Parent folder ID
   * @returns {Promise<{timestamp: number, folders: Array<{id: string, index: number}>} | null>}
   */
  async getBackup(parentFolderId) {
    try {
      const backups = await this._getBackups();
      return backups[parentFolderId] || null;
    } catch (error) {
      console.error('Error getting backup:', error);
      return null;
    }
  }

  /**
   * Checks if backup exists for a folder
   * @param {string} parentFolderId - Parent folder ID
   * @returns {Promise<boolean>}
   */
  async hasBackup(parentFolderId) {
    try {
      const backup = await this.getBackup(parentFolderId);
      return backup !== null;
    } catch (error) {
      console.error('Error checking backup:', error);
      return false;
    }
  }

  /**
   * Private helper to get preferences object
   * @returns {Promise<Object>}
   * @private
   */
  async _getPreferences() {
    try {
      const result = await browser.storage.local.get(this.STORAGE_KEYS.PREFERENCES);
      return result[this.STORAGE_KEYS.PREFERENCES] || {};
    } catch (error) {
      console.error('Error retrieving preferences:', error);
      return {};
    }
  }

  /**
   * Private helper to get backups object
   * @returns {Promise<Object>}
   * @private
   */
  async _getBackups() {
    try {
      const result = await browser.storage.local.get(this.STORAGE_KEYS.BACKUPS);
      return result[this.STORAGE_KEYS.BACKUPS] || {};
    } catch (error) {
      console.error('Error retrieving backups:', error);
      return {};
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageService;
}
