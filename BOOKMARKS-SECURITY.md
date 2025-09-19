# Bookmarks Security Setup

## Overview
The bookmarks system has been configured to protect sensitive data (passwords, account numbers, etc.) from being committed to the repository.

## File Structure
- `js/core/bookmarks.js` - Contains dummy/example data for the repository (safe to commit)
- `js/core/bookmarks-local.js` - Contains actual sensitive data (ignored by git)
- `.gitignore` - Excludes the local bookmarks file from version control

## Local Development Setup

### For New Developers
1. Copy `bookmarks-local.js` to your local machine (obtain from team member)
2. Replace the dummy data in `bookmarks.js` with your actual data, OR
3. Use the local override method (see below)

### Using Local Override (Recommended)
To use your actual bookmarks data locally without modifying the tracked `bookmarks.js`:

1. Copy `js/core/bookmarks-local.js` to `js/core/bookmarks.js` (overwrites dummy data locally)
2. The `.gitignore` will prevent this from being committed
3. The application will automatically load your real data

### File Format
Both files follow the same structure:
```javascript
const bookmarks = {
  "accounts": [
    {
      "name": "Account Name",
      "account_number": "1234567890",
      "search_terms": ["term1", "term2"]
    }
  ],
  "urls": [
    {
      "site_name": "Site Name",
      "url": "https://example.com",
      "username": "your_username",
      "password": "your_password", 
      "notes": "Additional notes",
      "search_terms": ["term1", "term2"]
    }
  ]
};
```

## Security Notes
- Never commit real passwords or sensitive account information
- The `bookmarks-local.js` file is in `.gitignore` and will not be tracked
- Always verify that sensitive data is not in files before committing
- Use environment variables or secure vaults for production deployments

## Usage
The bookmarks module automatically loads data from the global `window.bookmarks` object set by `bookmarks.js`. No code changes are needed - just ensure your local file has the correct data structure.