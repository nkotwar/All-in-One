/**
 * Performance Optimization Module
 * Handles lazy loading, caching, and performance monitoring
 */

const PerformanceOptimizer = {
    // Cache for storing computed values
    cache: new Map(),
    
    // Intersection Observer for lazy loading
    intersectionObserver: null,
    
    // Performance metrics
    metrics: {
        pageLoadTime: 0,
        firstPaint: 0,
        firstContentfulPaint: 0,
        largestContentfulPaint: 0,
        cumulativeLayoutShift: 0,
        firstInputDelay: 0
    },
    
    init() {
        this.setupPerformanceMonitoring();
        this.setupLazyLoading();
        this.setupCaching();
        this.optimizeImages();
        
        Logger.info('🚀 Performance Optimizer initialized');
    },
    
    // Performance monitoring using modern Web APIs
    setupPerformanceMonitoring() {
        // Measure page load time
        window.addEventListener('load', () => {
            const navigationTiming = performance.getEntriesByType('navigation')[0];
            this.metrics.pageLoadTime = navigationTiming.loadEventEnd - navigationTiming.fetchStart;
            
            Logger.info(`📊 Page load time: ${this.metrics.pageLoadTime.toFixed(2)}ms`);
        });
        
        // Measure Core Web Vitals
        if ('PerformanceObserver' in window) {
            this.observePaintMetrics();
            this.observeLCP();
            this.observeCLS();
            this.observeFID();
        }
        
        // Memory usage monitoring (Chrome only)
        if (performance.memory) {
            setInterval(() => {
                const memory = performance.memory;
                Logger.debug('Memory usage', {
                    used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
                    total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
                    limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`
                });
            }, 30000); // Every 30 seconds
        }
    },
    
    observePaintMetrics() {
        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.name === 'first-paint') {
                    this.metrics.firstPaint = entry.startTime;
                } else if (entry.name === 'first-contentful-paint') {
                    this.metrics.firstContentfulPaint = entry.startTime;
                }
            }
        });
        observer.observe({ entryTypes: ['paint'] });
    },
    
    observeLCP() {
        const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            this.metrics.largestContentfulPaint = lastEntry.startTime;
        });
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
    },
    
    observeCLS() {
        let clsValue = 0;
        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (!entry.hadRecentInput) {
                    clsValue += entry.value;
                }
            }
            this.metrics.cumulativeLayoutShift = clsValue;
        });
        observer.observe({ entryTypes: ['layout-shift'] });
    },
    
    observeFID() {
        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                this.metrics.firstInputDelay = entry.processingStart - entry.startTime;
            }
        });
        observer.observe({ entryTypes: ['first-input'] });
    },
    
    // Lazy loading setup
    setupLazyLoading() {
        if ('IntersectionObserver' in window) {
            this.intersectionObserver = new IntersectionObserver(
                this.handleIntersection.bind(this),
                {
                    rootMargin: '50px 0px',
                    threshold: 0.1
                }
            );
            
            // Observe images with lazy loading
            document.querySelectorAll('img[data-src]').forEach(img => {
                this.intersectionObserver.observe(img);
            });
            
            // Observe sections for lazy initialization
            document.querySelectorAll('[data-lazy-init]').forEach(section => {
                this.intersectionObserver.observe(section);
            });
        }
    },
    
    handleIntersection(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const element = entry.target;
                
                // Lazy load images
                if (element.tagName === 'IMG' && element.dataset.src) {
                    this.lazyLoadImage(element);
                }
                
                // Lazy initialize sections
                if (element.dataset.lazyInit) {
                    this.lazyInitializeSection(element);
                }
                
                this.intersectionObserver.unobserve(element);
            }
        });
    },
    
    lazyLoadImage(img) {
        img.src = img.dataset.src;
        img.classList.add('loaded');
        img.removeAttribute('data-src');
        
        img.onload = () => {
            img.classList.add('fade-in');
        };
    },
    
    lazyInitializeSection(section) {
        const initFunction = section.dataset.lazyInit;
        if (window[initFunction] && typeof window[initFunction] === 'function') {
            try {
                window[initFunction](section);
                Logger.debug(`Lazy initialized: ${initFunction}`);
            } catch (error) {
                ErrorHandler.handle(error, { source: 'LazyInit', function: initFunction });
            }
        }
        section.removeAttribute('data-lazy-init');
    },
    
    // Caching system
    setupCaching() {
        // Enable service worker for caching (if available)
        if ('serviceWorker' in navigator) {
            this.registerServiceWorker();
        }
        
        // Set up memory cache cleanup
        setInterval(() => {
            this.cleanupCache();
        }, 300000); // Every 5 minutes
    },
    
    async registerServiceWorker() {
        try {
            // Note: Service worker file would need to be created separately
            // This is just the registration code
            const registration = await navigator.serviceWorker.register('/sw.js');
            Logger.info('Service worker registered', registration);
        } catch (error) {
            Logger.warn('Service worker registration failed', error);
        }
    },
    
    cleanupCache() {
        const maxCacheSize = 100;
        if (this.cache.size > maxCacheSize) {
            const entries = Array.from(this.cache.entries());
            const toDelete = entries.slice(0, entries.length - maxCacheSize);
            toDelete.forEach(([key]) => this.cache.delete(key));
            Logger.debug(`Cache cleaned up, removed ${toDelete.length} entries`);
        }
    },
    
    // Memoization helper
    memoize(key, computeFunction) {
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }
        
        const result = computeFunction();
        this.cache.set(key, result);
        return result;
    },
    
    // Image optimization
    optimizeImages() {
        // Add loading="lazy" to images that don't have it
        document.querySelectorAll('img:not([loading])').forEach(img => {
            img.loading = 'lazy';
        });
        
        // Optimize image formats for modern browsers
        if (this.supportsWebP()) {
            this.convertToWebP();
        }
    },
    
    supportsWebP() {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        return canvas.toDataURL('image/webp').indexOf('webp') !== -1;
    },
    
    convertToWebP() {
        // This would require server-side conversion or pre-converted images
        Logger.debug('WebP supported, consider using WebP images for better performance');
    },
    
    // Debounced resize handler
    setupResizeOptimization() {
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.handleResize();
            }, 250);
        });
    },
    
    handleResize() {
        // Trigger re-calculation of layout-dependent values
        this.cache.clear();
        
        // Dispatch custom resize event for components
        window.dispatchEvent(new CustomEvent('optimizedResize'));
    },
    
    // Critical resource preloading
    preloadCriticalResources() {
        const criticalResources = [
            { href: 'css/app.css', as: 'style' },
            { href: 'js/core/app.js', as: 'script' },
            { href: 'fonts/MaterialIcons-Regular.ttf', as: 'font', type: 'font/ttf', crossorigin: 'anonymous' }
        ];
        
        criticalResources.forEach(resource => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.href = resource.href;
            link.as = resource.as;
            if (resource.type) link.type = resource.type;
            if (resource.crossorigin) link.crossOrigin = resource.crossorigin;
            document.head.appendChild(link);
        });
    },
    
    // Resource hints
    addResourceHints() {
        // DNS prefetch for external domains
        const externalDomains = [
            // Add any external domains you might use
        ];
        
        externalDomains.forEach(domain => {
            const link = document.createElement('link');
            link.rel = 'dns-prefetch';
            link.href = domain;
            document.head.appendChild(link);
        });
    },
    
    // Bundle splitting simulation
    loadModuleOnDemand(moduleName) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = `js/modules/${moduleName}/${moduleName}.js`;
            script.defer = true;
            
            script.onload = () => {
                Logger.debug(`Module loaded on demand: ${moduleName}`);
                resolve();
            };
            
            script.onerror = () => {
                const error = new Error(`Failed to load module: ${moduleName}`);
                ErrorHandler.handle(error, { source: 'ModuleLoader', module: moduleName });
                reject(error);
            };
            
            document.head.appendChild(script);
        });
    },
    
    // Performance report
    getPerformanceReport() {
        const report = {
            metrics: this.metrics,
            cacheSize: this.cache.size,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            connection: navigator.connection ? {
                effectiveType: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink,
                rtt: navigator.connection.rtt
            } : null
        };
        
        return report;
    },
    
    // Optimize animation performance
    optimizeAnimations() {
        // Reduce animations for users who prefer reduced motion
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            document.documentElement.style.setProperty('--transition-base', 'none');
            document.documentElement.style.setProperty('--transition-fast', 'none');
            document.documentElement.style.setProperty('--transition-slow', 'none');
            Logger.info('Animations reduced for accessibility');
        }
        
        // Use transform instead of position changes
        this.promoteElementsToGPU();
    },
    
    promoteElementsToGPU() {
        const animatedElements = document.querySelectorAll('[data-animate]');
        animatedElements.forEach(element => {
            element.style.willChange = 'transform';
            element.style.transform = 'translateZ(0)'; // Force GPU layer
        });
    }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        PerformanceOptimizer.init();
    });
} else {
    PerformanceOptimizer.init();
}

// Export for global access
window.PerformanceOptimizer = PerformanceOptimizer;
