/**
 * Modern Toast Notification System
 * Provides beautiful, accessible toast notifications
 */

const ToastSystem = {
    container: null,
    toasts: new Map(),
    defaultDuration: 4000,
    
    // Initialize the toast system
    init() {
        if (this.container) return; // Already initialized
        
        this.container = this.createContainer();
        document.body.appendChild(this.container);
        
        // Add CSS if not already present
        if (!document.querySelector('#toast-styles')) {
            this.injectStyles();
        }
    },
    
    createContainer() {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        container.setAttribute('aria-live', 'polite');
        container.setAttribute('aria-atomic', 'false');
        return container;
    },
    
    injectStyles() {
        const styles = document.createElement('style');
        styles.id = 'toast-styles';
        styles.textContent = `
            .toast-container {
                position: fixed;
                top: var(--space-4, 1rem);
                right: var(--space-4, 1rem);
                z-index: var(--z-toast, 1080);
                max-width: 420px;
                pointer-events: none;
            }
            
            .toast {
                background: var(--neutral-800, #262626);
                color: var(--neutral-50, #fafafa);
                border-radius: var(--radius-lg, 0.5rem);
                padding: var(--space-4, 1rem);
                margin-bottom: var(--space-2, 0.5rem);
                box-shadow: var(--shadow-lg, 0 10px 15px -3px rgb(0 0 0 / 0.1));
                display: flex;
                align-items: flex-start;
                gap: var(--space-3, 0.75rem);
                min-height: 64px;
                pointer-events: auto;
                transform: translateX(100%);
                transition: all var(--transition-base, 300ms ease);
                opacity: 0;
                border-left: 4px solid var(--neutral-600, #525252);
            }
            
            .toast.show {
                transform: translateX(0);
                opacity: 1;
            }
            
            .toast.hide {
                transform: translateX(100%);
                opacity: 0;
                margin-bottom: 0;
                padding-top: 0;
                padding-bottom: 0;
                min-height: 0;
            }
            
            .toast-icon {
                flex-shrink: 0;
                width: 20px;
                height: 20px;
                margin-top: 2px;
            }
            
            .toast-content {
                flex: 1;
                min-width: 0;
            }
            
            .toast-title {
                font-weight: var(--font-weight-semibold, 600);
                font-size: var(--font-size-sm, 0.875rem);
                line-height: var(--line-height-tight, 1.25);
                margin-bottom: var(--space-1, 0.25rem);
            }
            
            .toast-message {
                font-size: var(--font-size-sm, 0.875rem);
                line-height: var(--line-height-normal, 1.5);
                opacity: 0.9;
            }
            
            .toast-close {
                background: none;
                border: none;
                color: inherit;
                cursor: pointer;
                padding: var(--space-1, 0.25rem);
                border-radius: var(--radius-sm, 0.125rem);
                opacity: 0.7;
                transition: opacity var(--transition-fast, 150ms ease);
                flex-shrink: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 24px;
                height: 24px;
            }
            
            .toast-close:hover,
            .toast-close:focus {
                opacity: 1;
                outline: none;
            }
            
            .toast-close:focus-visible {
                box-shadow: 0 0 0 2px var(--primary-500, #5d7b94);
            }
            
            .toast-progress {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 3px;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 0 0 var(--radius-lg, 0.5rem) var(--radius-lg, 0.5rem);
                transform-origin: left;
                transition: transform linear;
            }
            
            /* Toast Types */
            .toast.success {
                border-left-color: var(--success-500, #22c55e);
            }
            
            .toast.success .toast-icon {
                color: var(--success-500, #22c55e);
            }
            
            .toast.error {
                border-left-color: var(--error-500, #ef4444);
            }
            
            .toast.error .toast-icon {
                color: var(--error-500, #ef4444);
            }
            
            .toast.warning {
                border-left-color: var(--warning-500, #f59e0b);
            }
            
            .toast.warning .toast-icon {
                color: var(--warning-500, #f59e0b);
            }
            
            .toast.info {
                border-left-color: var(--info-500, #3b82f6);
            }
            
            .toast.info .toast-icon {
                color: var(--info-500, #3b82f6);
            }
            
            /* Responsive */
            @media (max-width: 640px) {
                .toast-container {
                    left: var(--space-4, 1rem);
                    right: var(--space-4, 1rem);
                    max-width: none;
                }
                
                .toast {
                    transform: translateY(-100%);
                }
                
                .toast.show {
                    transform: translateY(0);
                }
                
                .toast.hide {
                    transform: translateY(-100%);
                }
            }
            
            /* Reduced motion */
            @media (prefers-reduced-motion: reduce) {
                .toast {
                    transition: opacity 0.2s ease;
                }
                
                .toast-progress {
                    display: none;
                }
            }
        `;
        document.head.appendChild(styles);
    },
    
    // Show a toast notification
    show(message, type = 'info', options = {}) {
        this.init(); // Ensure initialized
        
        const config = {
            title: null,
            duration: this.defaultDuration,
            closable: true,
            showProgress: true,
            onClick: null,
            onClose: null,
            ...options
        };
        
        const toast = this.createToast(message, type, config);
        const toastId = this.generateId();
        
        this.toasts.set(toastId, {
            element: toast,
            config,
            timeoutId: null
        });
        
        this.container.appendChild(toast);
        
        // Trigger show animation
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });
        
        // Set up auto-dismiss
        if (config.duration > 0) {
            this.setAutoDismiss(toastId, config.duration);
        }
        
        return toastId;
    },
    
    createToast(message, type, config) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
        toast.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
        
        const icon = this.getIcon(type);
        const closeButton = config.closable ? this.createCloseButton() : '';
        const progressBar = config.showProgress && config.duration > 0 ? 
            '<div class="toast-progress"></div>' : '';
        
        const titleHtml = config.title ? 
            `<div class="toast-title">${this.escapeHtml(config.title)}</div>` : '';
        
        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-content">
                ${titleHtml}
                <div class="toast-message">${this.escapeHtml(message)}</div>
            </div>
            ${closeButton}
            ${progressBar}
        `;
        
        // Add click handler
        if (config.onClick) {
            toast.addEventListener('click', config.onClick);
            toast.style.cursor = 'pointer';
        }
        
        // Add close button handler
        if (config.closable) {
            const closeBtn = toast.querySelector('.toast-close');
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.dismiss(this.getToastId(toast));
            });
        }
        
        // Set up progress bar animation
        if (config.showProgress && config.duration > 0) {
            const progressElement = toast.querySelector('.toast-progress');
            if (progressElement) {
                progressElement.style.transitionDuration = `${config.duration}ms`;
                requestAnimationFrame(() => {
                    progressElement.style.transform = 'scaleX(0)';
                });
            }
        }
        
        return toast;
    },
    
    getIcon(type) {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };
        return icons[type] || icons.info;
    },
    
    createCloseButton() {
        return '<button type="button" class="toast-close" aria-label="Close notification">✕</button>';
    },
    
    setAutoDismiss(toastId, duration) {
        const toastData = this.toasts.get(toastId);
        if (!toastData) return;
        
        toastData.timeoutId = setTimeout(() => {
            this.dismiss(toastId);
        }, duration);
    },
    
    // Dismiss a specific toast
    dismiss(toastId) {
        const toastData = this.toasts.get(toastId);
        if (!toastData) return;
        
        const { element, config, timeoutId } = toastData;
        
        // Clear auto-dismiss timer
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        
        // Trigger hide animation
        element.classList.add('hide');
        
        // Remove from DOM after animation
        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
            this.toasts.delete(toastId);
            
            // Call onClose callback
            if (config.onClose) {
                config.onClose();
            }
        }, 300);
    },
    
    // Dismiss all toasts
    dismissAll() {
        const toastIds = Array.from(this.toasts.keys());
        toastIds.forEach(id => this.dismiss(id));
    },
    
    // Utility methods
    generateId() {
        return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    },
    
    getToastId(element) {
        for (const [id, data] of this.toasts) {
            if (data.element === element) {
                return id;
            }
        }
        return null;
    },
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    // Convenience methods
    success(message, options = {}) {
        return this.show(message, 'success', options);
    },
    
    error(message, options = {}) {
        return this.show(message, 'error', { duration: 6000, ...options });
    },
    
    warning(message, options = {}) {
        return this.show(message, 'warning', options);
    },
    
    info(message, options = {}) {
        return this.show(message, 'info', options);
    }
};

// Global toast function for backward compatibility
window.showToast = (message, type = 'info', options = {}) => {
    return ToastSystem.show(message, type, options);
};

// Export the system
window.ToastSystem = ToastSystem;
