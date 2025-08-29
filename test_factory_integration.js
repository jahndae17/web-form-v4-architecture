/**
 * Test Factory Integration for ResizeableBehavior
 * Tests the actual factory workflow to ensure proper behavior attachment
 */

// Load required modules for Node.js testing
const path = require('path');

// Mock DOM environment for testing
global.window = {
    BaseUserContainer: undefined,
    BaseUserContainerBehavior: undefined,
    SelectableBehavior: undefined,
    ResizeableBehavior: undefined,
    MovableBehavior: undefined
};

// Load the actual components
try {
    const BaseUserContainer = require('./App/Components/User Level/Base User Container/BaseUserContainer.js');
    const BaseUserContainerBehavior = require('./App/Components/User Level/Base User Container/BaseUserContainerBehavior.js');
    const SelectableBehavior = require('./App/Components/User Level/Base User Container/SelectableBehavior.js');
    const ResizeableBehavior = require('./App/Components/User Level/Base User Container/ResizeableBehavior.js');
    const MovableBehavior = require('./App/Components/User Level/Base User Container/MovableBehavior.js');
    const BaseUserContainerFactory = require('./App/Components/User Level/Base User Container/BaseUserContainerFactory.js');
    
    console.log('🧪 Factory Integration Test');
    console.log('============================');
    
    // Test 1: Factory Creation
    console.log('\n📋 Test 1: Factory Creation');
    const factory = new BaseUserContainerFactory();
    console.log('✅ Factory created successfully');
    
    // Test 2: Container Creation with Resize Enabled
    console.log('\n📦 Test 2: Container Creation with Resize Enabled');
    const containerConfig = {
        preset: 'layout_container',
        parent: null, // No parent for test
        options: {
            isResizeable: true,
            isSelectable: true,
            isMovable: true,
            position: { x: 100, y: 100 },
            dimensions: { width: 200, height: 150 }
        }
    };
    
    const result = factory.createContainer(containerConfig);
    
    console.log('Factory Result:', {
        success: result.success,
        hasContainer: !!result.container,
        hasBehavior: !!result.behavior,
        errorMessage: result.error
    });
    
    if (result.success && result.container) {
        const container = result.container;
        
        console.log('\n🔍 Container Properties:');
        console.log(`- containerId: ${container.containerId}`);
        console.log(`- isResizeable: ${container.isResizeable}`);
        console.log(`- isSelectable: ${container.isSelectable}`);
        console.log(`- isMovable: ${container.isMovable}`);
        
        // Test current mode detection
        try {
            console.log(`- getCurrentMode(): ${container.getCurrentMode()}`);
            console.log(`- isDesignMode(): ${container.isDesignMode()}`);
        } catch (error) {
            console.log(`⚠️ Mode detection error: ${error.message}`);
        }
        
        console.log('\n🎯 Behavior Integration Check:');
        
        // Check direct behavior properties
        console.log('Direct Behavior Properties:');
        console.log(`- resizeableBehavior: ${!!container.resizeableBehavior}`);
        console.log(`- selectableBehavior: ${!!container.selectableBehavior}`);
        console.log(`- movableBehavior: ${!!container.movableBehavior}`);
        
        // Check behavior object properties
        if (container.behavior) {
            console.log('Behavior Object Properties:');
            console.log(`- behavior.resizeableBehavior: ${!!container.behavior.resizeableBehavior}`);
            console.log(`- behavior.selectableBehavior: ${!!container.behavior.selectableBehavior}`);
            console.log(`- behavior.movableBehavior: ${!!container.behavior.movableBehavior}`);
        }
        
        // Test 3: ResizeableBehavior Functionality
        console.log('\n📏 Test 3: ResizeableBehavior Functionality');
        
        if (container.resizeableBehavior) {
            try {
                // Test _isAllowedInCurrentMode
                const isAllowed = container.resizeableBehavior._isAllowedInCurrentMode();
                console.log(`✅ _isAllowedInCurrentMode(): ${isAllowed}`);
                
                // Test showResizeHandles
                const showResult = container.resizeableBehavior.showResizeHandles({ visible: true });
                console.log('✅ showResizeHandles result:', {
                    success: showResult.success,
                    hasGraphicsRequest: !!showResult.graphics_request,
                    hasStateChange: !!showResult.state_change,
                    error: showResult.error
                });
                
                // Test resize operation
                const startResult = container.resizeableBehavior.startResize({
                    handle: 'bottom-right',
                    clientX: 300,
                    clientY: 250
                });
                
                console.log('✅ startResize result:', {
                    success: startResult.success,
                    hasGraphicsRequest: !!startResult.graphics_request,
                    error: startResult.error
                });
                
                if (startResult.success) {
                    const performResult = container.resizeableBehavior.performResize({
                        clientX: 350,
                        clientY: 300
                    });
                    
                    console.log('✅ performResize result:', {
                        success: performResult.success,
                        hasGraphicsRequest: !!performResult.graphics_request,
                        error: performResult.error
                    });
                    
                    const endResult = container.resizeableBehavior.endResize({});
                    console.log('✅ endResize result:', {
                        success: endResult.success,
                        hasGraphicsRequest: !!endResult.graphics_request,
                        error: endResult.error
                    });
                }
                
            } catch (error) {
                console.log(`❌ ResizeableBehavior test error: ${error.message}`);
                console.log(error.stack);
            }
        } else {
            console.log('❌ ResizeableBehavior not found on container');
        }
        
        // Test 4: Behavior Sync Check
        console.log('\n🔄 Test 4: Behavior Sync Check');
        const directBehavior = container.resizeableBehavior;
        const behaviorObjectBehavior = container.behavior?.resizeableBehavior;
        
        if (directBehavior && behaviorObjectBehavior) {
            console.log(`✅ Behaviors are synced: ${directBehavior === behaviorObjectBehavior}`);
        } else {
            console.log('⚠️ Behaviors are not properly synced:');
            console.log(`- Direct: ${!!directBehavior}`);
            console.log(`- Behavior Object: ${!!behaviorObjectBehavior}`);
        }
        
        console.log('\n🎉 Integration Test Complete');
        console.log('ResizeableBehavior integration:', 
            container.resizeableBehavior ? '✅ SUCCESS' : '❌ FAILED');
            
    } else {
        console.log('❌ Container creation failed');
    }
    
} catch (error) {
    console.error('❌ Test setup failed:', error.message);
    console.error(error.stack);
}
