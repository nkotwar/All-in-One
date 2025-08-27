/**
 * Modern Application Controller
 * Centralized state management and event handling
 */

// Application State Management
const AppState = {
    currentTab: 'documentation',
    sidebarOpen: false,
    menuExpanded: false,
    mousePosition: { x: 0, y: 0 },
    
    // Event listeners for state changes
    listeners: new Map(),
    
    setState(key, value) {
        const oldValue = this[key];
        this[key] = value;
        
        // Notify listeners
        if (this.listeners.has(key)) {
            this.listeners.get(key).forEach(callback => {
                callback(value, oldValue);
            });
        }
    },
    
    subscribe(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }
        this.listeners.get(key).add(callback);
        
        // Return unsubscribe function
        return () => {
            this.listeners.get(key).delete(callback);
        };
    }
};

// DOM Utility Functions
const DOM = {
    // Safe element selection
    select(selector, context = document) {
        const element = context.querySelector(selector);
        if (!element) {
            console.warn(`Element not found: ${selector}`);
        }
        return element;
    },
    
    selectAll(selector, context = document) {
        return Array.from(context.querySelectorAll(selector));
    },
    
    // Safe event handling
    on(element, event, handler, options = {}) {
        if (!element) return () => {};
        
        element.addEventListener(event, handler, options);
        return () => element.removeEventListener(event, handler, options);
    },
    
    // Class management
    addClass(element, className) {
        if (element && className) {
            element.classList.add(className);
        }
    },
    
    removeClass(element, className) {
        if (element && className) {
            element.classList.remove(className);
        }
    },
    
    toggleClass(element, className) {
        if (element && className) {
            element.classList.toggle(className);
        }
    },
    
    hasClass(element, className) {
        return element && element.classList.contains(className);
    },
    
    // Modern element creation
    create(tag, attributes = {}, children = []) {
        const element = document.createElement(tag);
        
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'dataset') {
                Object.entries(value).forEach(([dataKey, dataValue]) => {
                    element.dataset[dataKey] = dataValue;
                });
            } else if (key.startsWith('on') && typeof value === 'function') {
                element.addEventListener(key.slice(2).toLowerCase(), value);
            } else {
                element.setAttribute(key, value);
            }
        });
        
        children.forEach(child => {
            if (typeof child === 'string') {
                element.textContent = child;
            } else if (child instanceof Node) {
                element.appendChild(child);
            }
        });
        
        return element;
    }
};

// Animation utilities
const Animation = {
    // Modern fade in/out
    fadeIn(element, duration = 300) {
        if (!element) return Promise.resolve();
        
        return new Promise(resolve => {
            element.style.opacity = '0';
            element.style.display = 'block';
            element.style.transition = `opacity ${duration}ms ease`;
            
            // Force reflow
            element.offsetHeight;
            
            element.style.opacity = '1';
            
            setTimeout(() => {
                element.style.transition = '';
                resolve();
            }, duration);
        });
    },
    
    fadeOut(element, duration = 300) {
        if (!element) return Promise.resolve();
        
        return new Promise(resolve => {
            element.style.transition = `opacity ${duration}ms ease`;
            element.style.opacity = '0';
            
            setTimeout(() => {
                element.style.display = 'none';
                element.style.transition = '';
                element.style.opacity = '';
                resolve();
            }, duration);
        });
    },
    
    slideToggle(element, duration = 300) {
        if (!element) return Promise.resolve();
        
        const isHidden = element.style.display === 'none' || 
                        window.getComputedStyle(element).display === 'none';
        
        if (isHidden) {
            return this.slideDown(element, duration);
        } else {
            return this.slideUp(element, duration);
        }
    },
    
    slideDown(element, duration = 300) {
        if (!element) return Promise.resolve();
        
        return new Promise(resolve => {
            element.style.display = 'block';
            const height = element.scrollHeight;
            element.style.height = '0px';
            element.style.overflow = 'hidden';
            element.style.transition = `height ${duration}ms ease`;
            
            // Force reflow
            element.offsetHeight;
            
            element.style.height = height + 'px';
            
            setTimeout(() => {
                element.style.height = '';
                element.style.overflow = '';
                element.style.transition = '';
                resolve();
            }, duration);
        });
    },
    
    slideUp(element, duration = 300) {
        if (!element) return Promise.resolve();
        
        return new Promise(resolve => {
            element.style.height = element.scrollHeight + 'px';
            element.style.overflow = 'hidden';
            element.style.transition = `height ${duration}ms ease`;
            
            // Force reflow
            element.offsetHeight;
            
            element.style.height = '0px';
            
            setTimeout(() => {
                element.style.display = 'none';
                element.style.height = '';
                element.style.overflow = '';
                element.style.transition = '';
                resolve();
            }, duration);
        });
    }
};

// Debounce utility
function debounce(func, wait, immediate) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func.apply(this, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(this, args);
    };
}

// Throttle utility
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Modern Application Controller
const AppController = {
    // Initialize the application
    init() {
        this.initElements();
        this.initEventListeners();
        this.initStateSubscriptions();
        this.initDefaultState();
        
        console.log('🚀 Modern App Controller initialized');
    },
    
    // Cache DOM elements
    initElements() {
        this.elements = {
            menu: DOM.select('#menu'),
            hamburger: DOM.select('.hamburger'),
            hamburgerToggle: DOM.select('#hamburgerToggle'),
            menuInner: DOM.select('.menu-inner'),
            menuInnerUl: DOM.select('#menu-inner-ul'),
            contents: DOM.selectAll('.content'),
            container: DOM.select('#container'),
            pdfSidebar: DOM.select('#pdfSidebar'),
            sidebarToggle: DOM.select('#sidebarToggle'),
            body: document.body
        };
    },
    
    // Set up event listeners
    initEventListeners() {
        const { elements } = this;
        
        // Mouse tracking (throttled for performance)
        DOM.on(document, 'mousemove', throttle((e) => {
            AppState.setState('mousePosition', { x: e.pageX, y: e.pageY });
        }, 16)); // ~60fps
        
        // Hamburger menu events
        if (elements.hamburger) {
            DOM.on(elements.hamburger, 'click', (e) => {
                e.stopPropagation();
                this.toggleMenu();
            });
            
            DOM.on(elements.hamburger, 'touchstart', (e) => {
                e.stopPropagation();
                this.toggleMenu();
            });
            
            DOM.on(elements.hamburger, 'mouseenter', () => {
                this.expandMenu();
            });
        }
        
        if (elements.hamburgerToggle) {
            DOM.on(elements.hamburgerToggle, 'click', () => {
                this.toggleMenu();
            });
            
            DOM.on(elements.hamburgerToggle, 'touchstart', (e) => {
                e.preventDefault();
                this.toggleMenu();
            });
        }
        
        // Menu hover events
        if (elements.menuInner) {
            DOM.on(elements.menuInner, 'mouseenter', () => {
                this.expandMenu();
            });
            
            DOM.on(elements.menuInner, 'mouseleave', () => {
                this.collapseMenu();
            });
        }
        
        // Sidebar toggle
        if (elements.sidebarToggle) {
            DOM.on(elements.sidebarToggle, 'click', () => {
                this.toggleSidebar();
            });
            
            DOM.on(elements.sidebarToggle, 'touchstart', (e) => {
                e.preventDefault();
                this.toggleSidebar();
            });
        }
        
        // Tab switching
        if (elements.menuInnerUl) {
            const tabItems = DOM.selectAll('li[data-tab]', elements.menuInnerUl);
            tabItems.forEach(tab => {
                DOM.on(tab, 'click', () => {
                    const targetTab = tab.getAttribute('data-tab');
                    this.switchTab(targetTab);
                });
            });
        }
        
        // Keyboard navigation
        DOM.on(document, 'keydown', (e) => {
            this.handleKeyboardNavigation(e);
        });
        
        // Close menu when clicking outside
        DOM.on(document, 'click', (e) => {
            if (AppState.menuExpanded && !elements.menu?.contains(e.target)) {
                this.collapseMenu();
            }
        });
    },
    
    // Initialize state subscriptions
    initStateSubscriptions() {
        // Subscribe to tab changes
        AppState.subscribe('currentTab', (newTab, oldTab) => {
            this.handleTabChange(newTab, oldTab);
        });
        
        // Subscribe to sidebar state
        AppState.subscribe('sidebarOpen', (isOpen) => {
            this.handleSidebarChange(isOpen);
        });
        
        // Subscribe to menu state
        AppState.subscribe('menuExpanded', (isExpanded) => {
            this.handleMenuChange(isExpanded);
        });
    },
    
    // Set initial state
    initDefaultState() {
        AppState.setState('currentTab', 'documentation');
        this.showSidebar();
    },
    
    // Menu management
    toggleMenu() {
        AppState.setState('menuExpanded', !AppState.menuExpanded);
    },
    
    expandMenu() {
        AppState.setState('menuExpanded', true);
    },
    
    collapseMenu() {
        AppState.setState('menuExpanded', false);
    },
    
    handleMenuChange(isExpanded) {
        if (this.elements.menu) {
            if (isExpanded) {
                DOM.addClass(this.elements.menu, 'expanded');
            } else {
                DOM.removeClass(this.elements.menu, 'expanded');
            }
        }
    },
    
    // Sidebar management
    toggleSidebar() {
        AppState.setState('sidebarOpen', !AppState.sidebarOpen);
    },
    
    showSidebar() {
        if (this.elements.pdfSidebar) {
            this.elements.pdfSidebar.style.display = 'flex';
        }
    },
    
    hideSidebar() {
        if (this.elements.pdfSidebar) {
            this.elements.pdfSidebar.style.display = 'none';
            AppState.setState('sidebarOpen', false);
        }
    },
    
    handleSidebarChange(isOpen) {
        if (this.elements.pdfSidebar && this.elements.body) {
            if (isOpen) {
                DOM.addClass(this.elements.pdfSidebar, 'active');
                DOM.addClass(this.elements.body, 'sidebar-active');
            } else {
                DOM.removeClass(this.elements.pdfSidebar, 'active');
                DOM.removeClass(this.elements.body, 'sidebar-active');
            }
        }
    },
    
    // Tab management
    switchTab(tabName) {
        if (tabName && tabName !== AppState.currentTab) {
            AppState.setState('currentTab', tabName);
            this.collapseMenu();
        }
    },
    
    handleTabChange(newTab, oldTab) {
        // Hide all content sections
        this.elements.contents.forEach(content => {
            DOM.removeClass(content, 'active');
        });
        
        // Show the selected content section
        const targetContent = DOM.select(`#${newTab}`);
        if (targetContent) {
            DOM.addClass(targetContent, 'active');
        }
        
        // Handle tab-specific logic
        switch (newTab) {
            case 'emi-calculator':
                this.initEMICalculator();
                this.hideSidebar();
                break;
                
            case 'documentation':
                this.showSidebar();
                break;
                
            case 'cbs-hierarchy':
                this.focusCBSSearch();
                this.hideSidebar();
                break;
                
            default:
                this.hideSidebar();
                break;
        }
    },
    
    // Tab-specific initialization
    initEMICalculator() {
        // Check if EMI calculator function exists and call it
        if (typeof initEMICalculator === 'function') {
            initEMICalculator();
        }
    },
    
    focusCBSSearch() {
        setTimeout(() => {
            const searchInput = DOM.select('#cbsSearchInput');
            if (searchInput) {
                searchInput.focus();
            }
        }, 50);
    },
    
    // Keyboard navigation
    handleKeyboardNavigation(e) {
        // ESC key closes menu
        if (e.key === 'Escape') {
            if (AppState.menuExpanded) {
                this.collapseMenu();
            }
        }
        
        // Alt + number keys for quick tab switching
        if (e.altKey && e.key >= '1' && e.key <= '5') {
            e.preventDefault();
            const tabMap = {
                '1': 'documentation',
                '2': 'emi-calculator', 
                '3': 'wealth-simulator',
                '4': 'cbs-hierarchy',
                '5': 'snap-container'
            };
            
            const targetTab = tabMap[e.key];
            if (targetTab) {
                this.switchTab(targetTab);
            }
        }
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        AppController.init();
    });
} else {
    AppController.init();
}

// Export for global access
window.AppController = AppController;
window.AppState = AppState;
window.DOM = DOM;
window.Animation = Animation;
