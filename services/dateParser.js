/**
 * Date Parser Service
 * Extracts and parses ISO 8601 timestamps from bookmark folder names
 */

class DateParser {
  constructor() {
    // ISO 8601 regex pattern: matches YYYY-MM-DDTHH:MM:SS.sssZ or YYYY-MM-DDTHH:MM:SSZ
    this.iso8601Pattern = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z/;
  }

  /**
   * Extracts ISO 8601 timestamp from folder name and returns a Date object
   * @param {string} folderName - The folder name to parse
   * @returns {Date | null} - Parsed date or null if no valid date found
   */
  extractDate(folderName) {
    if (!folderName || typeof folderName !== 'string') {
      return null;
    }

    // Find the first ISO 8601 timestamp in the folder name
    const match = folderName.match(this.iso8601Pattern);
    
    if (!match) {
      return null;
    }

    // Parse the matched timestamp
    const timestamp = match[0];
    const date = new Date(timestamp);

    // Validate that the date is valid
    if (isNaN(date.getTime())) {
      return null;
    }

    return date;
  }

  /**
   * Formats a date according to user preference
   * @param {Date} date - The date to format
   * @param {string} format - Format preference ('DD-MM-YY', 'MM-DD-YY', 'YYYY-MM-DD')
   * @returns {string} - Formatted date string
   */
  formatDate(date, format = 'YYYY-MM-DD') {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return '';
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    switch (format) {
      case 'DD-MM-YY':
        return `${day}-${month}-${String(year).slice(-2)}`;
      
      case 'MM-DD-YY':
        return `${month}-${day}-${String(year).slice(-2)}`;
      
      case 'YYYY-MM-DD':
      default:
        return `${year}-${month}-${day}`;
    }
  }

  /**
   * Validates if a string contains a valid ISO 8601 timestamp
   * @param {string} text - Text to validate
   * @returns {boolean} - True if valid ISO 8601 timestamp found
   */
  hasValidDate(text) {
    if (!text || typeof text !== 'string') {
      return false;
    }

    const match = text.match(this.iso8601Pattern);
    
    if (!match) {
      return false;
    }

    // Verify the matched timestamp is actually valid
    const date = new Date(match[0]);
    return !isNaN(date.getTime());
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DateParser;
}
