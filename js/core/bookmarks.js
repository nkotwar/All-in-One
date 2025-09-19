// EXAMPLE/DUMMY DATA - Replace with actual bookmarks data for local development
// For actual data, copy bookmarks-local.js to bookmarks.js (which is ignored by git)

const bookmarks = {
  "accounts": [
    {
      "name": "Sample Account 1",
      "account_number": "XXXXXXXXXX",
      "search_terms": [
        "sample",
        "example",
        "demo"
      ]
    },
    {
      "name": "Sample Account 2",
      "account_number": "YYYYYYYYYY",
      "search_terms": [
        "test",
        "dummy",
        "placeholder"
      ]
    }
  ],
  "urls": [
    {
      "site_name": "Example Portal",
      "url": "https://example.com/",
      "username": "demo_user",
      "password": "DUMMY_PASSWORD",
      "notes": "This is example data - replace with actual credentials",
      "search_terms": [
        "example",
        "demo",
        "sample"
      ]
    },
    {
      "site_name": "Test System",
      "url": "https://test.example.com/",
      "username": "test_user",
      "password": "PLACEHOLDER_PASS",
      "notes": "Another example entry",
      "search_terms": [
        "test",
        "system",
        "placeholder"
      ]
    },
    {
      "site_name": "Public Site (No Login)",
      "url": "https://public.example.com/",
      "username": null,
      "password": null,
      "notes": "Public website that doesn't require login",
      "search_terms": [
        "public",
        "no login",
        "open access"
      ]
    }
  ]
};

// Make bookmarks data available globally for offline use
window.bookmarks = bookmarks;

// Also export for module systems (optional)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = bookmarks;
}