/**
 * Bookmarks Module
 * Provides fast search and access to account numbers and URLs
 * with fuzzy matching and Linux-style command palette experience
 */

class BookmarksManager {
    constructor() {
        this.bookmarksData = null;
        this.searchInput = null;
        this.accountsGrid = null;
        this.urlsGrid = null;
        this.noResults = null;
        this.stats = {
            accountsCount: null,
            urlsCount: null,
            filteredCount: null
        };
        this.filteredData = {
            accounts: [],
            urls: []
        };
        this.copyTimeouts = new Map();
        
        // Initialize when DOM is loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    async init() {
        try {
            await this.loadBookmarksData();
            this.initializeElements();
            this.bindEvents();
            this.renderAllBookmarks();
            this.updateStats();
        } catch (error) {
            console.error('Failed to initialize bookmarks:', error);
            this.showError('Failed to load bookmarks data');
        }
    }

    async loadBookmarksData() {
        try {
            // Check if bookmarks data is available from the imported module
            if (window.bookmarks) {
                this.bookmarksData = window.bookmarks;
                return;
            }
            
            // Fallback to fetch (for server environments)
            try {
                const response = await fetch('js/core/bookmarks.json');
                if (!response.ok) throw new Error('Failed to fetch bookmarks data');
                this.bookmarksData = await response.json();
            } catch (fetchError) {
                console.warn('Failed to fetch JSON, trying direct import:', fetchError);
                throw new Error('Bookmarks data not available. Please ensure bookmarks.js is loaded.');
            }
        } catch (error) {
            console.error('Error loading bookmarks data:', error);
            throw error;
        }
    }

    initializeElements() {
        this.searchInput = document.getElementById('bookmarksSearchInput');
        this.accountsGrid = document.getElementById('accountsGrid');
        this.urlsGrid = document.getElementById('urlsGrid');
        this.noResults = document.getElementById('noResults');
        
        // Stats elements
        this.stats.accountsCount = document.getElementById('accountsCount');
        this.stats.urlsCount = document.getElementById('urlsCount');
        this.stats.filteredCount = document.getElementById('filteredCount');
    }

    bindEvents() {
        if (this.searchInput) {
            // Real-time search with debouncing
            let searchTimeout;
            this.searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.performSearch(e.target.value.trim());
                }, 100); // Faster response
            });

            // Basic keyboard shortcuts
            this.searchInput.addEventListener('keydown', (e) => {
                switch (e.key) {
                    case 'Escape':
                        this.clearSearch();
                        this.searchInput.blur();
                        break;
                    
                    case 'Enter':
                        e.preventDefault();
                        this.handleEnterKey();
                        break;
                }
            });
        }

        // Global keyboard capture for automatic typing
        document.addEventListener('keydown', (e) => {
            // Only handle when bookmarks tab is active
            const bookmarksTab = document.getElementById('bookmarks');
            if (!bookmarksTab || !bookmarksTab.classList.contains('active')) return;

            // Ignore modifier keys, function keys, etc.
            if (e.ctrlKey || e.metaKey || e.altKey || e.key.length > 1) {
                // Allow some special keys
                if (e.key === 'Backspace' || e.key === 'Delete') {
                    if (this.searchInput && !this.searchInput.matches(':focus')) {
                        this.focusSearch();
                    }
                }
                return;
            }

            // Auto-focus search input when user starts typing
            if (this.searchInput && !this.searchInput.matches(':focus')) {
                // Check if it's a printable character
                if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                    this.focusSearch();
                    // Let the character be typed naturally
                }
            }
        });
    }

    performSearch(query) {
        if (!query) {
            this.renderAllBookmarks();
            return;
        }

        const searchResults = this.fuzzySearch(query);
        this.filteredData = searchResults;
        this.renderFilteredBookmarks(searchResults, query);
        this.updateStats();
    }

    // Helper function to normalize text for fuzzy matching
    normalizeText(text) {
        return text.toLowerCase()
            .replace(/[^a-z0-9]/g, '') // Remove all special characters AND spaces
            .trim();
    }

    fuzzySearch(query) {
        const queryLower = query.toLowerCase();
        const queryNormalized = this.normalizeText(query);
        const results = {
            accounts: [],
            urls: []
        };

        // Search accounts
        if (this.bookmarksData.accounts) {
            results.accounts = this.bookmarksData.accounts.filter(account => {
                // Search in searchable fields only
                const searchableFields = [
                    account.account_number,
                    ...account.search_terms
                ];
                
                return searchableFields.some(field => {
                    if (!field) return false;
                    const fieldStr = field.toString();
                    const fieldLower = fieldStr.toLowerCase();
                    const fieldNormalized = this.normalizeText(fieldStr);
                    
                    // Try both exact match and normalized match
                    return fieldLower.includes(queryLower) || 
                           fieldNormalized.includes(queryNormalized);
                });
            });
        }

        // Search URLs
        if (this.bookmarksData.urls) {
            results.urls = this.bookmarksData.urls.filter(url => {
                // Search in searchable fields only (not username/password)
                const searchableFields = [
                    url.site_name,
                    url.url,
                    ...url.search_terms
                ];
                
                return searchableFields.some(field => {
                    if (!field) return false;
                    const fieldStr = field.toString();
                    const fieldLower = fieldStr.toLowerCase();
                    const fieldNormalized = this.normalizeText(fieldStr);
                    
                    // Try both exact match and normalized match
                    return fieldLower.includes(queryLower) || 
                           fieldNormalized.includes(queryNormalized);
                });
            });
        }

        return results;
    }

    renderAllBookmarks() {
        this.filteredData = {
            accounts: this.bookmarksData.accounts || [],
            urls: this.bookmarksData.urls || []
        };
        this.renderCards();
        this.toggleNoResults(false);
    }

    renderFilteredBookmarks(results, query) {
        this.renderCards(query);
        const hasResults = results.accounts.length > 0 || results.urls.length > 0;
        this.toggleNoResults(!hasResults);
    }

    renderCards(highlightQuery = '') {
        if (this.accountsGrid) {
            this.accountsGrid.innerHTML = this.filteredData.accounts
                .map(account => this.createAccountCard(account, highlightQuery))
                .join('');
        }

        if (this.urlsGrid) {
            this.urlsGrid.innerHTML = this.filteredData.urls
                .map(url => this.createUrlCard(url, highlightQuery))
                .join('');
        }

        // Add event listeners to newly created cards
        this.bindCardEvents();
    }

    createAccountCard(account, highlightQuery = '') {
        const searchTermsHtml = account.search_terms
            .map(term => `<span class="search-term">${this.highlightText(term, highlightQuery)}</span>`)
            .join('');

        return `
            <div class="account-card" data-account-id="${account.account_number}">
                <div class="account-card-header">
                    <h3 class="account-name">${this.highlightText(account.name, highlightQuery)}</h3>
                    <span class="account-type-badge">Account</span>
                </div>
                <div class="account-number-container">
                    <div class="account-number clickable" data-copy="${account.account_number}" title="Click to copy account number">
                        ${this.highlightText(account.account_number, highlightQuery)}
                    </div>
                </div>
                <div class="search-terms">
                    ${searchTermsHtml}
                </div>
            </div>
        `;
    }

    createUrlCard(url, highlightQuery = '') {
        const searchTermsHtml = url.search_terms
            .map(term => `<span class="search-term">${this.highlightText(term, highlightQuery)}</span>`)
            .join('');

        const hasCredentials = url.username || url.password;
        const hasUrl = url.url && url.url !== null && url.url.trim() !== '';

        let credentialsHtml = '';
        if (hasCredentials) {
            credentialsHtml = `
                <div class="credentials">
                    ${url.username ? `
                        <div class="credential-row">
                            <span class="credential-label">Username:</span>
                            <span class="credential-value">${url.username}</span>
                            <button class="copy-button" data-copy="${url.username}" title="Copy username">
                                <i class="material-icons">content_copy</i>
                            </button>
                        </div>
                    ` : ''}
                    ${url.password ? `
                        <div class="credential-row">
                            <span class="credential-label">Password:</span>
                            <span class="credential-value password hidden" data-password="${url.password}">••••••••</span>
                            <button class="password-toggle" data-target="password" title="Show/hide password">
                                <i class="material-icons">visibility</i>
                            </button>
                            <button class="copy-button" data-copy="${url.password}" title="Copy password">
                                <i class="material-icons">content_copy</i>
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
        }

        return `
            <div class="url-card" data-site-id="${url.site_name}">
                <div class="url-card-header">
                    <h3 class="site-name">${this.highlightText(url.site_name, highlightQuery)}</h3>
                    <span class="url-type-badge">${hasUrl ? 'Website' : 'Credentials'}</span>
                </div>
                ${hasUrl ? `
                    <div class="url-link" data-open-url="${url.url}" title="Click to open in new tab">
                        ${this.highlightText(url.url, highlightQuery)}
                    </div>
                ` : `
                    <div class="url-link no-url">No URL provided</div>
                `}
                ${credentialsHtml}
                ${url.notes ? `
                    <div class="notes">${url.notes}</div>
                ` : ''}
                <div class="search-terms">
                    ${searchTermsHtml}
                </div>
            </div>
        `;
    }

    bindCardEvents() {
        // Copy buttons
        document.querySelectorAll('[data-copy]').forEach(button => {
            button.addEventListener('click', (e) => {
                const text = e.currentTarget.getAttribute('data-copy');
                this.copyToClipboard(text, e.currentTarget);
                
                // Highlight URL card if this is a credential copy action
                if (e.currentTarget.closest('.url-card')) {
                    this.highlightUrlCard(e.currentTarget);
                }
            });
        });

        // Direct URL clicking - make URLs clickable to open in new tab
        document.querySelectorAll('.url-link[data-open-url]').forEach(urlElement => {
            urlElement.addEventListener('click', (e) => {
                e.preventDefault();
                const url = e.currentTarget.getAttribute('data-open-url');
                if (url) {
                    window.open(url, '_blank', 'noopener,noreferrer');
                    // Highlight the URL card when URL is clicked
                    this.highlightUrlCard(e.currentTarget);
                }
            });
            urlElement.style.cursor = 'pointer';
            urlElement.title = 'Click to open in new tab';
        });

        // Password toggle buttons
        document.querySelectorAll('.password-toggle').forEach(button => {
            button.addEventListener('click', (e) => {
                this.togglePasswordVisibility(e.currentTarget);
                // Highlight URL card when password is toggled
                this.highlightUrlCard(e.currentTarget);
            });
        });

        // Click to copy account numbers
        document.querySelectorAll('.account-number').forEach(element => {
            element.addEventListener('click', () => {
                this.copyToClipboard(element.textContent.trim(), element);
            });
            element.style.cursor = 'pointer';
            element.title = 'Click to copy';
        });
    }

    // Highlight URL card when interacted with
    highlightUrlCard(cardElement) {
        const urlCard = cardElement.closest('.url-card');
        if (!urlCard) return;

        // Clear any existing timeout for this card
        if (urlCard.highlightTimeout) {
            clearTimeout(urlCard.highlightTimeout);
        }

        // Remove existing highlights from all other cards
        document.querySelectorAll('.url-card.highlighted').forEach(card => {
            if (card !== urlCard) {
                if (card.highlightTimeout) {
                    clearTimeout(card.highlightTimeout);
                }
                card.classList.remove('highlighted');
            }
        });

        // Force reflow to restart animation if already highlighted
        if (urlCard.classList.contains('highlighted')) {
            urlCard.classList.remove('highlighted');
            // Force reflow
            urlCard.offsetHeight;
        }

        // Add highlight with fresh animation
        urlCard.classList.add('highlighted');
        
        // Set new timeout for this card
        urlCard.highlightTimeout = setTimeout(() => {
            urlCard.classList.remove('highlighted');
            urlCard.highlightTimeout = null;
        }, 5000);
    }

    togglePasswordVisibility(toggleButton) {
        const credentialRow = toggleButton.closest('.credential-row');
        const passwordElement = credentialRow.querySelector('.credential-value.password');
        const icon = toggleButton.querySelector('.material-icons');
        
        if (passwordElement.classList.contains('hidden')) {
            // Show password
            const actualPassword = passwordElement.getAttribute('data-password');
            passwordElement.textContent = actualPassword;
            passwordElement.classList.remove('hidden');
            icon.textContent = 'visibility_off';
        } else {
            // Hide password
            passwordElement.textContent = '••••••••';
            passwordElement.classList.add('hidden');
            icon.textContent = 'visibility';
        }
    }

    async copyToClipboard(text, buttonElement) {
        try {
            await navigator.clipboard.writeText(text);
            this.showCopySuccess(buttonElement);
        } catch (err) {
            // Fallback for older browsers
            this.fallbackCopyToClipboard(text);
            this.showCopySuccess(buttonElement);
        }
    }

    fallbackCopyToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.top = '0';
        textArea.style.left = '0';
        textArea.style.position = 'fixed';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
        } catch (err) {
            console.error('Fallback: Oops, unable to copy', err);
        }
        
        document.body.removeChild(textArea);
    }

    showCopySuccess(element) {
        const originalText = element.innerHTML;
        const elementId = Math.random().toString(36).substr(2, 9);
        
        // Clear any existing timeout for this element
        if (this.copyTimeouts.has(elementId)) {
            clearTimeout(this.copyTimeouts.get(elementId));
        }
        
        // Show success state
        element.classList.add('copied');
        if (element.querySelector('.material-icons')) {
            element.innerHTML = '<i class="material-icons">check</i> Copied!';
        } else {
            element.innerHTML = 'Copied!';
        }
        
        // Reset after 2 seconds
        const timeoutId = setTimeout(() => {
            element.classList.remove('copied');
            element.innerHTML = originalText;
            this.copyTimeouts.delete(elementId);
        }, 2000);
        
        this.copyTimeouts.set(elementId, timeoutId);
    }

    highlightText(text, query) {
        if (!query || !text) return text;
        
        const regex = new RegExp(`(${this.escapeRegExp(query)})`, 'gi');
        return text.toString().replace(regex, '<span class="highlight">$1</span>');
    }

    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    updateStats() {
        const accountsTotal = this.bookmarksData.accounts ? this.bookmarksData.accounts.length : 0;
        const urlsTotal = this.bookmarksData.urls ? this.bookmarksData.urls.length : 0;
        const filteredTotal = this.filteredData.accounts.length + this.filteredData.urls.length;

        if (this.stats.accountsCount) this.stats.accountsCount.textContent = accountsTotal;
        if (this.stats.urlsCount) this.stats.urlsCount.textContent = urlsTotal;
        if (this.stats.filteredCount) this.stats.filteredCount.textContent = filteredTotal;
    }

    toggleNoResults(show) {
        if (this.noResults) {
            this.noResults.style.display = show ? 'block' : 'none';
        }
        
        // Hide/show section headers based on results
        const accountsSection = document.querySelector('.accounts-section');
        const urlsSection = document.querySelector('.urls-section');
        
        if (accountsSection) {
            accountsSection.style.display = this.filteredData.accounts.length > 0 ? 'block' : 'none';
        }
        
        if (urlsSection) {
            urlsSection.style.display = this.filteredData.urls.length > 0 ? 'block' : 'none';
        }
    }

    showError(message) {
        if (this.accountsGrid) {
            this.accountsGrid.innerHTML = `
                <div class="error-message">
                    <i class="material-icons">error_outline</i>
                    <p>${message}</p>
                </div>
            `;
        }
    }

    // Public method to focus on search input (called from main.js)
    focusSearch() {
        if (this.searchInput) {
            this.searchInput.focus();
            // Optional: select all text if there's any
            this.searchInput.select();
        }
    }

    // Public method to clear search
    clearSearch() {
        if (this.searchInput) {
            this.searchInput.value = '';
            this.performSearch('');
        }
    }

    // Handle Enter key press - opens first result
    handleEnterKey() {
        const firstCard = document.querySelector('.account-card, .url-card');
        if (firstCard) {
            if (firstCard.classList.contains('account-card')) {
                // Copy account number
                const accountNumber = firstCard.querySelector('.account-number');
                if (accountNumber) {
                    this.copyToClipboard(accountNumber.textContent.trim(), accountNumber);
                }
            } else if (firstCard.classList.contains('url-card')) {
                // Priority: Open URL > Copy Username > Copy Password
                const openButton = firstCard.querySelector('[data-open-url]');
                const primaryButton = firstCard.querySelector('.action-button.primary');
                
                if (openButton) {
                    openButton.click();
                } else if (primaryButton) {
                    primaryButton.click();
                } else {
                    // Fallback to any copy button
                    const copyButton = firstCard.querySelector('[data-copy]');
                    if (copyButton) {
                        copyButton.click();
                    }
                }
            }
        }
    }

    // Navigate through results with arrow keys (future enhancement)
    navigateResults(direction) {
        // This could be enhanced to highlight cards and navigate through them
        // For now, just blur the search input to show visual feedback
        if (direction === 'down') {
            this.searchInput.blur();
            // Could focus first card here
        }
    }
}

// Initialize the bookmarks manager
window.bookmarksManager = new BookmarksManager();

// Export for potential external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BookmarksManager;
}