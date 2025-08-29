// Simple ResizeableBehavior debug test
// Test the ResizeableBehavior methods directly

console.log('🔍 ResizeableBehavior Debug Test');
console.log('================================');

// Import the components (minimal test environment)
const path = require('path');

// Mock component for testing
class MockContainer {
    constructor() {
        this.containerId = 'debug-container';
        this.inputMode = 'design';
        this.isResizeable = true;
        this.element = {
            getBoundingClientRect: () => ({ width: 100, height: 50, left: 0, top: 0 })
        };
    }
    
    getCurrentMode() {
        return this.inputMode || 'design';
    }
    
    isDesignMode() {
        console.log(`🔍 isDesignMode() called, getCurrentMode() returns: "${this.getCurrentMode()}"`);
        return this.getCurrentMode() === 'design';
    }
    
    isPreviewMode() {
        return this.getCurrentMode() === 'preview';
    }
}

try {
    // Load ResizeableBehavior
    const ResizeableBehavior = require('./App/Components/User Level/Base User Container/ResizeableBehavior.js');
    console.log('✅ ResizeableBehavior loaded successfully');
    
    // Create mock container
    const container = new MockContainer();
    console.log('✅ Mock container created');
    console.log(`📊 Container isResizeable: ${container.isResizeable}`);
    console.log(`📊 Container isDesignMode(): ${container.isDesignMode()}`);
    
    // Create ResizeableBehavior instance
    const resizeableBehavior = new ResizeableBehavior(container);
    console.log('✅ ResizeableBehavior instance created');
    console.log(`📊 ResizeableBehavior componentId: ${resizeableBehavior.componentId}`);
    
    // Test _isAllowedInCurrentMode
    console.log('\n🔍 Testing _isAllowedInCurrentMode()...');
    try {
        const isAllowed = resizeableBehavior._isAllowedInCurrentMode();
        console.log(`📊 _isAllowedInCurrentMode() result: ${isAllowed}`);
    } catch (error) {
        console.log(`❌ _isAllowedInCurrentMode() error: ${error.message}`);
    }
    
    // Test showResizeHandles
    console.log('\n🔍 Testing showResizeHandles()...');
    try {
        const result = resizeableBehavior.showResizeHandles({ visible: true });
        console.log('📊 showResizeHandles result:', {
            success: result.success,
            error: result.error,
            hasGraphicsRequest: !!result.graphics_request,
            hasStateChange: !!result.state_change
        });
        
        if (result.graphics_request) {
            console.log('📊 Graphics request type:', result.graphics_request.type);
        }
        
    } catch (error) {
        console.log(`❌ showResizeHandles() error: ${error.message}`);
        console.log(`❌ Stack trace: ${error.stack}`);
    }
    
} catch (error) {
    console.log(`❌ Test setup error: ${error.message}`);
    console.log(`❌ Stack trace: ${error.stack}`);
}

console.log('\n🔍 Debug test complete');
