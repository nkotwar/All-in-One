/**
 * Modern Error Handling & Logging System
 * Provides centralized error handling, logging, and user notifications
 */

// Log levels
const LogLevel = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
};

// Modern Logger
const Logger = {
    level: LogLevel.INFO, // Default log level
    
    // Internal logging method
    _log(level, message, data = null, source = '') {
        if (level > this.level) return;
        
        const timestamp = new Date().toISOString();
        const levelNames = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
        const levelName = levelNames[level];
        
        const logEntry = {
            timestamp,
            level: levelName,
            message,
            data,
            source,
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        // Console output with appropriate styling
        const style = this._getConsoleStyle(level);
        console.groupCollapsed(`%c[${levelName}] ${timestamp} - ${message}`, style);
        
        if (data) {
            console.log('Data:', data);
        }
        
        if (source) {
            console.log('Source:', source);
        }
        
        console.trace('Stack trace');
        console.groupEnd();
        
        // Store in session for debugging
        this._storeLog(logEntry);
        
        return logEntry;
    },
    
    _getConsoleStyle(level) {
        const styles = {
            [LogLevel.ERROR]: 'color: #dc2626; font-weight: bold; background: #fef2f2; padding: 2px 4px; border-radius: 3px;',
            [LogLevel.WARN]: 'color: #d97706; font-weight: bold; background: #fffbeb; padding: 2px 4px; border-radius: 3px;',
            [LogLevel.INFO]: 'color: #2563eb; font-weight: bold; background: #eff6ff; padding: 2px 4px; border-radius: 3px;',
            [LogLevel.DEBUG]: 'color: #059669; font-weight: bold; background: #f0fdf4; padding: 2px 4px; border-radius: 3px;'
        };
        return styles[level] || '';
    },
    
    _storeLog(logEntry) {
        try {
            const logs = JSON.parse(sessionStorage.getItem('app_logs') || '[]');
            logs.push(logEntry);
            
            // Keep only last 100 logs
            if (logs.length > 100) {
                logs.splice(0, logs.length - 100);
            }
            
            sessionStorage.setItem('app_logs', JSON.stringify(logs));
        } catch (e) {
            // Ignore storage errors
        }
    },
    
    // Public logging methods
    error(message, data = null, source = '') {
        return this._log(LogLevel.ERROR, message, data, source);
    },
    
    warn(message, data = null, source = '') {
        return this._log(LogLevel.WARN, message, data, source);
    },
    
    info(message, data = null, source = '') {
        return this._log(LogLevel.INFO, message, data, source);
    },
    
    debug(message, data = null, source = '') {
        return this._log(LogLevel.DEBUG, message, data, source);
    },
    
    // Get stored logs
    getLogs() {
        try {
            return JSON.parse(sessionStorage.getItem('app_logs') || '[]');
        } catch (e) {
            return [];
        }
    },
    
    // Clear logs
    clearLogs() {
        try {
            sessionStorage.removeItem('app_logs');
        } catch (e) {
            // Ignore storage errors
        }
    },
    
    // Set log level
    setLevel(level) {
        this.level = level;
        this.info(`Log level set to: ${Object.keys(LogLevel)[level]}`);
    }
};

// Error Handler
const ErrorHandler = {
    // Error types
    ErrorTypes: {
        NETWORK: 'NETWORK_ERROR',
        VALIDATION: 'VALIDATION_ERROR',
        PERMISSION: 'PERMISSION_ERROR',
        NOT_FOUND: 'NOT_FOUND_ERROR',
        UNKNOWN: 'UNKNOWN_ERROR'
    },
    
    // Handle different types of errors
    handle(error, context = {}) {
        const errorInfo = this._parseError(error);
        
        // Log the error
        Logger.error(errorInfo.message, {
            ...errorInfo,
            context
        }, context.source || 'ErrorHandler');
        
        // Show user notification if needed
        if (errorInfo.showToUser) {
            this._showUserNotification(errorInfo);
        }
        
        // Additional error-specific handling
        this._handleSpecificError(errorInfo);
        
        return errorInfo;
    },
    
    _parseError(error) {
        let errorInfo = {
            type: this.ErrorTypes.UNKNOWN,
            message: 'An unknown error occurred',
            originalError: error,
            showToUser: true,
            severity: 'error'
        };
        
        if (error instanceof Error) {
            errorInfo.message = error.message;
            errorInfo.stack = error.stack;
            
            // Classify error based on message/type
            if (error.name === 'NetworkError' || error.message.includes('fetch')) {
                errorInfo.type = this.ErrorTypes.NETWORK;
                errorInfo.message = 'Network connection error. Please check your internet connection.';
            } else if (error.name === 'ValidationError') {
                errorInfo.type = this.ErrorTypes.VALIDATION;
                errorInfo.severity = 'warning';
            } else if (error.message.includes('Permission denied')) {
                errorInfo.type = this.ErrorTypes.PERMISSION;
                errorInfo.message = 'Permission denied. Please check your access rights.';
            } else if (error.message.includes('not found') || error.message.includes('404')) {
                errorInfo.type = this.ErrorTypes.NOT_FOUND;
                errorInfo.message = 'The requested resource was not found.';
            }
        } else if (typeof error === 'string') {
            errorInfo.message = error;
        } else if (error && typeof error === 'object') {
            errorInfo = { ...errorInfo, ...error };
        }
        
        return errorInfo;
    },
    
    _showUserNotification(errorInfo) {
        // Use toast notifications if available
        if (window.showToast) {
            window.showToast(errorInfo.message, errorInfo.severity);
        } else {
            // Fallback to alert for critical errors
            if (errorInfo.severity === 'error') {
                alert(`Error: ${errorInfo.message}`);
            }
        }
    },
    
    _handleSpecificError(errorInfo) {
        switch (errorInfo.type) {
            case this.ErrorTypes.NETWORK:
                // Could implement retry logic here
                break;
            case this.ErrorTypes.PERMISSION:
                // Could redirect to login or show permission request
                break;
            default:
                // Generic error handling
                break;
        }
    },
    
    // Wrapper for async functions with error handling
    async wrap(asyncFn, context = {}) {
        try {
            return await asyncFn();
        } catch (error) {
            this.handle(error, context);
            throw error; // Re-throw for caller to handle if needed
        }
    },
    
    // Create validation error
    validation(message, field = null) {
        const error = new Error(message);
        error.name = 'ValidationError';
        error.field = field;
        return error;
    },
    
    // Create network error
    network(message = 'Network error occurred') {
        const error = new Error(message);
        error.name = 'NetworkError';
        return error;
    }
};

// Performance Monitor
const PerformanceMonitor = {
    measurements: new Map(),
    
    // Start measuring performance
    start(label) {
        this.measurements.set(label, {
            startTime: performance.now(),
            endTime: null,
            duration: null
        });
    },
    
    // End measurement and log result
    end(label) {
        const measurement = this.measurements.get(label);
        if (!measurement) {
            Logger.warn(`Performance measurement '${label}' not found`);
            return null;
        }
        
        measurement.endTime = performance.now();
        measurement.duration = measurement.endTime - measurement.startTime;
        
        Logger.debug(`Performance: ${label} took ${measurement.duration.toFixed(2)}ms`);
        
        return measurement.duration;
    },
    
    // Measure function execution time
    measure(label, fn) {
        this.start(label);
        const result = fn();
        this.end(label);
        return result;
    },
    
    // Measure async function execution time
    async measureAsync(label, asyncFn) {
        this.start(label);
        try {
            const result = await asyncFn();
            this.end(label);
            return result;
        } catch (error) {
            this.end(label);
            throw error;
        }
    },
    
    // Get all measurements
    getResults() {
        const results = {};
        this.measurements.forEach((value, key) => {
            results[key] = value;
        });
        return results;
    },
    
    // Clear measurements
    clear() {
        this.measurements.clear();
    }
};

// Global error handlers
window.addEventListener('error', (event) => {
    ErrorHandler.handle(event.error, {
        source: 'Global Error Handler',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
    });
});

window.addEventListener('unhandledrejection', (event) => {
    ErrorHandler.handle(event.reason, {
        source: 'Unhandled Promise Rejection'
    });
});

// Development helpers
if (window.location.hostname === 'localhost' || window.location.protocol === 'file:') {
    // Enable debug logging in development
    Logger.setLevel(LogLevel.DEBUG);
    
    // Expose utilities for debugging
    window.Logger = Logger;
    window.ErrorHandler = ErrorHandler;
    window.PerformanceMonitor = PerformanceMonitor;
    
    Logger.info('🔧 Development mode enabled - Debug tools available');
}

// Export for module usage
window.Logger = Logger;
window.ErrorHandler = ErrorHandler;
window.PerformanceMonitor = PerformanceMonitor;
