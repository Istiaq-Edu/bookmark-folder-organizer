/**
 * UI Controller
 * Manages UI state, user interactions, and coordinates between services
 */

class UIController {
  constructor() {
    // Service instances
    this.storageService = new StorageService();
    this.bookmarkService = new BookmarkService();
    this.dateParser = new DateParser();

    // UI state
    this.state = {
      selectedFolderId: null,
      dateFormat: 'YYYY-MM-DD',
      subfoldersCount: 0,
      hasBackup: false,
      isLoading: false
    };

    // DOM element references
    this.elements = {
      folderSelector: document.getElementById('folderSelector'),
      subfolderCount: document.getElementById('subfolderCount'),
      dateFormatRadios: document.querySelectorAll('input[name="dateFormat"]'),
      rearrangeBtn: document.getElementById('rearrangeBtn'),
      revertBtn: document.getElementById('revertBtn'),
      loadingSpinner: document.getElementById('loadingSpinner'),
      statusMessage: document.getElementById('statusMessage')
    };
  }

  /**
   * Initializes the UI Controller
   * Sets up event listeners and loads initial data
   */
  async initialize() {
    try {
      // Check for bookmark permissions first
      const hasPermissions = await this.bookmarkService.hasPermissions();
      if (!hasPermissions) {
        this.showMessage('Bookmark permissions are required. Please grant permissions in Firefox settings.', 'error');
        this._disableAllControls();
        return;
      }

      // Set up event listeners
      this._setupEventListeners();

      // Load user preferences (date format) from StorageService
      await this._loadUserPreferences();

      // Load folder tree to populate folder selector
      await this.loadFolderTree();

    } catch (error) {
      console.error('Error initializing UI Controller:', error);
      
      // Check if it's a permission error
      if (error.message && error.message.includes('permission')) {
        this.showMessage('Bookmark permissions are required. Please grant permissions in Firefox settings.', 'error');
      } else {
        this.showMessage('Failed to initialize extension. Please try reloading the popup.', 'error');
      }
      
      this._disableAllControls();
    }
  }

  /**
   * Disables all interactive controls
   * @private
   */
  _disableAllControls() {
    this.elements.folderSelector.disabled = true;
    this.elements.rearrangeBtn.disabled = true;
    this.elements.revertBtn.disabled = true;
    this.elements.dateFormatRadios.forEach(radio => {
      radio.disabled = true;
    });
  }

  /**
   * Sets up event listeners for UI elements
   * @private
   */
  _setupEventListeners() {
    // Folder selector change event
    this.elements.folderSelector.addEventListener('change', (e) => {
      this.handleFolderSelection(e.target.value);
    });

    // Date format radio button change events
    this.elements.dateFormatRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.handleDateFormatChange(e.target.value);
        }
      });
    });

    // Rearrange button click event
    this.elements.rearrangeBtn.addEventListener('click', () => {
      this.handleRearrange();
    });

    // Revert button click event
    this.elements.revertBtn.addEventListener('click', () => {
      this.handleRevert();
    });
  }

  /**
   * Loads user preferences from storage
   * Sets default date format to YYYY-MM-DD if no preference exists
   * @private
   */
  async _loadUserPreferences() {
    try {
      // Get date format preference (defaults to YYYY-MM-DD)
      const dateFormat = await this.storageService.getDateFormat();
      
      // Update state
      this.state.dateFormat = dateFormat;

      // Update UI to reflect the loaded preference
      this.elements.dateFormatRadios.forEach(radio => {
        if (radio.value === dateFormat) {
          radio.checked = true;
        }
      });

    } catch (error) {
      console.error('Error loading user preferences:', error);
      
      // Check if it's a storage error
      if (error.message && error.message.includes('storage')) {
        this.showMessage('Unable to access browser storage. Some features may not work correctly.', 'warning');
      }
      
      // Use default format on error
      this.state.dateFormat = 'YYYY-MM-DD';
      
      // Set default radio button
      this.elements.dateFormatRadios.forEach(radio => {
        if (radio.value === 'YYYY-MM-DD') {
          radio.checked = true;
        }
      });
    }
  }

  /**
   * Loads the bookmark folder tree and populates the folder selector
   */
  async loadFolderTree() {
    try {
      // Fetch all bookmark folders using BookmarkService
      const folders = await this.bookmarkService.getAllFolders();
      
      // Validate that we got folders
      if (!folders || folders.length === 0) {
        this.showMessage('No bookmark folders found.', 'info');
        return;
      }
      
      // Clear existing options (except the default one)
      this.elements.folderSelector.innerHTML = '<option value="">-- Select a folder --</option>';
      
      // Build hierarchical select options with indentation
      this._buildFolderOptions(folders, 0);
      
    } catch (error) {
      console.error('Error loading folder tree:', error);
      
      // Provide specific error messages based on error type
      if (error.message && error.message.includes('permission')) {
        this.showMessage('Bookmark permissions are required. Please grant permissions in Firefox settings.', 'error');
      } else if (error.message && error.message.includes('retrieve')) {
        this.showMessage('Failed to load bookmark folders. Please try reloading the popup.', 'error');
      } else {
        this.showMessage('Failed to load bookmark folders. Please check permissions and try again.', 'error');
      }
      
      // Disable folder selector on error
      this.elements.folderSelector.disabled = true;
    }
  }

  /**
   * Recursively builds folder options with hierarchical indentation
   * @param {Array} folders - Array of folder nodes
   * @param {number} depth - Current depth level for indentation
   * @private
   */
  _buildFolderOptions(folders, depth) {
    for (const folder of folders) {
      // Create option element
      const option = document.createElement('option');
      option.value = folder.id;
      
      // Add indentation based on depth (using non-breaking spaces and em dash)
      const indent = '\u00A0\u00A0'.repeat(depth);
      const prefix = depth > 0 ? '\u2014 ' : ''; // em dash for nested items
      option.textContent = `${indent}${prefix}${folder.title}`;
      
      // Add to selector
      this.elements.folderSelector.appendChild(option);
      
      // Recursively add children with increased depth
      if (folder.children && folder.children.length > 0) {
        this._buildFolderOptions(folder.children, depth + 1);
      }
    }
  }

  /**
   * Handles folder selection change
   * @param {string} folderId - Selected folder ID
   */
  async handleFolderSelection(folderId) {
    try {
      // If no folder selected, reset UI
      if (!folderId) {
        this.updateUI({
          selectedFolderId: null,
          subfoldersCount: 0,
          hasBackup: false
        });
        return;
      }
      
      // Validate that the folder still exists
      try {
        await browser.bookmarks.get(folderId);
      } catch (error) {
        console.error('Selected folder no longer exists:', error);
        this.showMessage('The selected folder no longer exists. Please select another folder.', 'error');
        
        // Reset selection
        this.elements.folderSelector.value = '';
        this.updateUI({
          selectedFolderId: null,
          subfoldersCount: 0,
          hasBackup: false
        });
        return;
      }
      
      // Fetch and display subfolder count for selected folder
      const subfolders = await this.bookmarkService.getSubfolders(folderId);
      
      // Check if backup exists for selected folder
      const hasBackup = await this.storageService.hasBackup(folderId);
      
      // Update UI with new state
      this.updateUI({
        selectedFolderId: folderId,
        subfoldersCount: subfolders.length,
        hasBackup: hasBackup
      });
      
    } catch (error) {
      console.error('Error handling folder selection:', error);
      
      // Provide specific error messages
      if (error.message && error.message.includes('permission')) {
        this.showMessage('Bookmark permissions are required to access folder information.', 'error');
      } else if (error.message && error.message.includes('storage')) {
        this.showMessage('Unable to check backup status. Storage may be unavailable.', 'warning');
      } else {
        this.showMessage('Failed to load folder information. Please try again.', 'error');
      }
      
      // Reset state on error
      this.updateUI({
        selectedFolderId: null,
        subfoldersCount: 0,
        hasBackup: false
      });
    }
  }

  /**
   * Handles date format preference change
   * @param {string} format - Selected date format
   */
  async handleDateFormatChange(format) {
    try {
      // Validate format
      const validFormats = ['DD-MM-YY', 'MM-DD-YY', 'YYYY-MM-DD'];
      if (!validFormats.includes(format)) {
        console.error('Invalid date format:', format);
        this.showMessage('Invalid date format selected.', 'error');
        return;
      }
      
      // Update state with new format
      this.state.dateFormat = format;
      
      // Save selected format to StorageService for persistence
      await this.storageService.saveDateFormat(format);
      
      // Update any displayed dates in UI to match new format
      // Currently, we don't display any dates in the UI yet
      // This will be used when we display dates in future features
      // or in status messages that include dates
      
      // Note: If we had date displays in the UI (like last rearrange date),
      // we would update them here using this.dateParser.formatDate()
      
    } catch (error) {
      console.error('Error saving date format preference:', error);
      
      // Provide specific error message for storage errors
      if (error.message && error.message.includes('storage')) {
        this.showMessage('Unable to save date format preference. Browser storage may be unavailable.', 'warning');
      } else {
        this.showMessage('Failed to save date format preference.', 'error');
      }
    }
  }

  /**
   * Handles the rearrange button click
   */
  async handleRearrange() {
    try {
      // Show loading state and disable all interactive elements
      this.setLoading(true);
      
      // Validate selected folder exists
      if (!this.state.selectedFolderId) {
        this.showMessage('Please select a folder first.', 'warning');
        return;
      }
      
      // Verify the folder still exists before proceeding
      try {
        await browser.bookmarks.get(this.state.selectedFolderId);
      } catch (error) {
        console.error('Selected folder no longer exists:', error);
        this.showMessage('The selected folder no longer exists. Please select another folder.', 'error');
        
        // Reset selection
        this.elements.folderSelector.value = '';
        this.updateUI({
          selectedFolderId: null,
          subfoldersCount: 0,
          hasBackup: false
        });
        return;
      }
      
      // Get subfolders to validate folder has subfolders
      const subfolders = await this.bookmarkService.getSubfolders(this.state.selectedFolderId);
      
      if (subfolders.length === 0) {
        this.showMessage('The selected folder has no subfolders to organize.', 'info');
        return;
      }
      
      // Check for subfolders with valid dates before rearrangement
      let hasValidDates = false;
      for (const folder of subfolders) {
        if (this.dateParser.hasValidDate(folder.title)) {
          hasValidDates = true;
          break;
        }
      }
      
      if (!hasValidDates) {
        this.showMessage('No subfolders with valid dates found. Folders must contain ISO 8601 timestamps (e.g., 2025-10-11T17:36:41Z).', 'warning');
        return;
      }
      
      // Check if folder has 100+ subfolders and show warning if needed
      if (subfolders.length >= 100) {
        const proceed = confirm(
          `This folder has ${subfolders.length} subfolders. Processing may take a moment. Do you want to continue?`
        );
        if (!proceed) {
          this.showMessage('Rearrangement cancelled.', 'info');
          return;
        }
      }
      
      // Create backup using StorageService before rearrangement
      const backupData = subfolders.map(folder => ({
        id: folder.id,
        index: folder.index
      }));
      
      try {
        await this.storageService.saveBackup(this.state.selectedFolderId, backupData);
      } catch (error) {
        console.error('Error saving backup:', error);
        this.showMessage('Failed to create backup. Cannot proceed with rearrangement for safety.', 'error');
        return;
      }
      
      // Call BookmarkService.rearrangeFolders() with selected folder ID
      const result = await this.bookmarkService.rearrangeFolders(
        this.state.selectedFolderId,
        this.dateParser
      );
      
      // Check if rearrangement was successful
      if (!result.success) {
        // Provide user-friendly error messages
        const errorMsg = result.error || 'Failed to rearrange folders.';
        this.showMessage(errorMsg, 'error');
        return;
      }
      
      // Display success message with count of rearranged folders
      this.showMessage(
        `Successfully rearranged ${result.movedCount} folder${result.movedCount !== 1 ? 's' : ''}.`,
        'success'
      );
      
      // Update hasBackup state and enable Revert button
      this.updateUI({ hasBackup: true });
      
    } catch (error) {
      console.error('Error during rearrangement:', error);
      
      // Provide specific error messages based on error type
      if (error.message && error.message.includes('permission')) {
        this.showMessage('Bookmark permissions are required to rearrange folders.', 'error');
      } else if (error.message && error.message.includes('storage')) {
        this.showMessage('Unable to access browser storage. Cannot create backup for safety.', 'error');
      } else if (error.message && error.message.includes('retrieve')) {
        this.showMessage('Failed to access bookmark folders. Please try again.', 'error');
      } else {
        this.showMessage('An unexpected error occurred during rearrangement. Please try again.', 'error');
      }
    } finally {
      // Hide loading state and re-enable interactive elements
      this.setLoading(false);
    }
  }

  /**
   * Handles the revert button click
   */
  async handleRevert() {
    try {
      // Show loading state and disable all interactive elements
      this.setLoading(true);
      
      // Validate selected folder exists
      if (!this.state.selectedFolderId) {
        this.showMessage('Please select a folder first.', 'warning');
        return;
      }
      
      // Verify the folder still exists before proceeding
      try {
        await browser.bookmarks.get(this.state.selectedFolderId);
      } catch (error) {
        console.error('Selected folder no longer exists:', error);
        this.showMessage('The selected folder no longer exists. Cannot revert.', 'error');
        
        // Reset selection
        this.elements.folderSelector.value = '';
        this.updateUI({
          selectedFolderId: null,
          subfoldersCount: 0,
          hasBackup: false
        });
        return;
      }
      
      // Retrieve backup data from StorageService
      let backup;
      try {
        backup = await this.storageService.getBackup(this.state.selectedFolderId);
      } catch (error) {
        console.error('Error retrieving backup:', error);
        this.showMessage('Failed to retrieve backup data. Browser storage may be unavailable.', 'error');
        return;
      }
      
      // Validate backup exists
      if (!backup) {
        this.showMessage('No backup found for this folder.', 'error');
        this.updateUI({ hasBackup: false });
        return;
      }
      
      // Validate backup data structure
      if (!backup.folders || !Array.isArray(backup.folders) || backup.folders.length === 0) {
        console.error('Invalid backup data structure:', backup);
        this.showMessage('Backup data is corrupted or invalid. Cannot revert.', 'error');
        return;
      }
      
      // Call BookmarkService.revertFolders() with backup data
      let success;
      try {
        success = await this.bookmarkService.revertFolders(
          this.state.selectedFolderId,
          backup
        );
      } catch (error) {
        console.error('Error calling revertFolders:', error);
        
        // Provide specific error messages
        if (error.message && error.message.includes('no longer exists')) {
          this.showMessage('Some folders from the backup no longer exist. Revert failed.', 'error');
        } else if (error.message && error.message.includes('permission')) {
          this.showMessage('Bookmark permissions are required to revert folders.', 'error');
        } else {
          this.showMessage(error.message || 'Failed to revert folders to original order.', 'error');
        }
        return;
      }
      
      // Check if revert was successful
      if (!success) {
        this.showMessage('Failed to revert folders to original order. Current structure preserved.', 'error');
        return;
      }
      
      // Display success message on completion
      this.showMessage('Successfully reverted folders to original order.', 'success');
      
      // Keep backup in storage for future use (don't delete it)
      // The backup remains available for potential future reverts
      
    } catch (error) {
      console.error('Error during revert:', error);
      
      // Provide specific error messages based on error type
      if (error.message && error.message.includes('permission')) {
        this.showMessage('Bookmark permissions are required to revert folders.', 'error');
      } else if (error.message && error.message.includes('storage')) {
        this.showMessage('Unable to access browser storage. Cannot retrieve backup.', 'error');
      } else {
        this.showMessage('An unexpected error occurred during revert. Current structure preserved.', 'error');
      }
    } finally {
      // Hide loading state and re-enable interactive elements
      this.setLoading(false);
    }
  }

  /**
   * Updates the UI based on current state
   * Manages button states, tooltips, and UI element visibility
   * @param {Object} stateUpdates - Partial state updates to merge with current state
   */
  updateUI(stateUpdates = {}) {
    // Merge state updates with current state
    this.state = { ...this.state, ...stateUpdates };
    
    // Update folder selector state
    if (this.state.isLoading) {
      this.elements.folderSelector.disabled = true;
    } else {
      this.elements.folderSelector.disabled = false;
    }
    
    // Update subfolder count display
    this.elements.subfolderCount.textContent = `Subfolders to organize: ${this.state.subfoldersCount}`;
    
    // Update Rearrange button state and tooltip
    const hasSelection = this.state.selectedFolderId !== null && this.state.selectedFolderId !== '';
    const hasSubfolders = this.state.subfoldersCount > 0;
    
    if (this.state.isLoading) {
      this.elements.rearrangeBtn.disabled = true;
      this.elements.rearrangeBtn.title = 'Processing...';
    } else if (!hasSelection) {
      this.elements.rearrangeBtn.disabled = true;
      this.elements.rearrangeBtn.title = 'Please select a folder first';
    } else if (!hasSubfolders) {
      this.elements.rearrangeBtn.disabled = true;
      this.elements.rearrangeBtn.title = 'No subfolders to organize';
    } else {
      this.elements.rearrangeBtn.disabled = false;
      this.elements.rearrangeBtn.title = 'Rearrange folders chronologically by date';
    }
    
    // Update Revert button state and tooltip
    if (this.state.isLoading) {
      this.elements.revertBtn.disabled = true;
      this.elements.revertBtn.title = 'Processing...';
    } else if (!hasSelection) {
      this.elements.revertBtn.disabled = true;
      this.elements.revertBtn.title = 'Please select a folder first';
    } else if (!this.state.hasBackup) {
      this.elements.revertBtn.disabled = true;
      this.elements.revertBtn.title = 'No backup available for this folder';
    } else {
      this.elements.revertBtn.disabled = false;
      this.elements.revertBtn.title = 'Restore folders to original order';
    }
    
    // Update date format radio buttons state
    this.elements.dateFormatRadios.forEach(radio => {
      radio.disabled = this.state.isLoading;
      
      // Update checked state if dateFormat was updated
      if (radio.value === this.state.dateFormat) {
        radio.checked = true;
      }
    });
  }

  /**
   * Displays a message to the user
   * @param {string} message - Message text
   * @param {string} type - Message type: 'success', 'error', 'info', 'warning'
   */
  showMessage(message, type) {
    const statusMessage = this.elements.statusMessage;
    
    // Set message text
    statusMessage.textContent = message;
    
    // Remove all type classes
    statusMessage.classList.remove('success', 'error', 'info', 'warning');
    
    // Add the appropriate type class
    if (type) {
      statusMessage.classList.add(type);
    }
    
    // Make message visible
    statusMessage.removeAttribute('hidden');
  }

  /**
   * Shows or hides the loading spinner and manages loading state
   * @param {boolean} isLoading - Whether to show loading state
   */
  setLoading(isLoading) {
    // Show/hide loading spinner
    if (this.elements.loadingSpinner) {
      if (isLoading) {
        this.elements.loadingSpinner.removeAttribute('hidden');
      } else {
        this.elements.loadingSpinner.setAttribute('hidden', '');
      }
    }
    
    // Update UI state with loading status
    // This will handle all button states, tooltips, and interactive elements
    this.updateUI({ isLoading });
  }
}

// Initialize the UI Controller when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const controller = new UIController();
  controller.initialize();
});
