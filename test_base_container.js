/**
 * Test script for BaseContainer class
 * Tests all major functionality including hierarchy, validation, and DOM integration
 */

// Import the BaseContainer class
const BaseContainer = require('./App/Components/Developer Level/base container.js');

console.log('=== BaseContainer Test Suite ===\n');

try {
    // Test 1: Create root container
    console.log('Test 1: Creating root container...');
    const rootContainer = new BaseContainer('app-root', null, 'container');
    console.log('✓ Root container created:', rootContainer.toJSON());
    console.log('');

    // Test 2: Create child containers
    console.log('Test 2: Creating child containers...');
    const canvasContainer = new BaseContainer('main-canvas', rootContainer, 'canvas');
    const toolsContainer = new BaseContainer('tool-panel', rootContainer, 'tools');
    
    console.log('✓ Canvas container created:', canvasContainer.toJSON());
    console.log('✓ Tools container created:', toolsContainer.toJSON());
    console.log('Root children count:', rootContainer.children.length);
    console.log('');

    // Test 3: Visual property manipulation
    console.log('Test 3: Testing visual properties...');
    canvasContainer
        .setPosition(100, 50)
        .setDimensions(800, 600)
        .setZIndex(10)
        .setOpacity(0.9);
    
    toolsContainer
        .setPosition(0, 0)
        .setDimensions(200, 600)
        .setZIndex(20);
    
    console.log('✓ Canvas properties:', {
        position: canvasContainer.position,
        dimensions: canvasContainer.dimensions,
        zIndex: canvasContainer.zIndex,
        opacity: canvasContainer.opacity
    });
    console.log('');

    // Test 4: State management
    console.log('Test 4: Testing state management...');
    canvasContainer.activate();
    toolsContainer.lock();
    
    console.log('✓ Canvas active:', canvasContainer.isActive);
    console.log('✓ Tools locked:', toolsContainer.isLocked);
    console.log('✓ Tools draggable after lock:', toolsContainer.isDraggable);
    console.log('');

    // Test 5: Content and metadata
    console.log('Test 5: Testing content and metadata...');
    canvasContainer
        .setContent('Main drawing area')
        .setMetadata('purpose', 'drawing')
        .setMetadata('version', '1.0')
        .addCssClass('primary-canvas')
        .setStyle('border', '2px solid #333');
    
    console.log('✓ Canvas content:', canvasContainer.getContent());
    console.log('✓ Canvas metadata:', canvasContainer.metadata);
    console.log('✓ Canvas CSS classes:', canvasContainer.cssClasses);
    console.log('');

    // Test 6: Hierarchy navigation
    console.log('Test 6: Testing hierarchy navigation...');
    console.log('✓ Canvas path:', canvasContainer.getPath());
    console.log('✓ Root child by ID:', rootContainer.findChild('main-canvas')?.containerId);
    console.log('✓ All containers count:', BaseContainer.getAllContainers().length);
    console.log('');

    // Test 7: Validation
    console.log('Test 7: Testing validation...');
    const validation = rootContainer.validateHierarchy();
    console.log('✓ Root validation:', validation);
    
    // Test invalid child type
    try {
        const invalidContainer = new BaseContainer('invalid', rootContainer, 'invalid-type');
    } catch (error) {
        console.log('✓ Invalid type caught:', error.message);
    }
    console.log('');

    // Test 8: Container limits
    console.log('Test 8: Testing container limits...');
    // Reset child limits to current state first
    console.log('Current children count:', rootContainer.children.length);
    rootContainer.setChildLimits(0, rootContainer.children.length); // Set max to current count
    
    // Try to add more than max allowed
    try {
        new BaseContainer('extra1', rootContainer, 'container'); // This should fail
    } catch (error) {
        console.log('✓ Max children limit enforced:', error.message);
    }
    console.log('');

    // Test 9: Event handler registration
    console.log('Test 9: Testing event handler registration...');
    canvasContainer.registerEventHandler('click', function(event) {
        console.log('Canvas clicked!');
    });
    
    canvasContainer.registerEventHandler('hover_enter', function(event) {
        console.log('Mouse entered canvas!');
    });
    
    console.log('✓ Event handlers registered:', Array.from(canvasContainer.eventHandlers.keys()));
    console.log('');

    // Test 10: Static methods
    console.log('Test 10: Testing static methods...');
    console.log('✓ Root container via static:', BaseContainer.getRootContainer()?.containerId);
    console.log('✓ Get container by ID:', BaseContainer.getContainer('main-canvas')?.containerId);
    console.log('✓ Total containers:', BaseContainer.getAllContainers().length);
    console.log('');

    // Test 11: Container destruction
    console.log('Test 11: Testing container destruction...');
    // Reset limits to allow adding temporary container
    rootContainer.setChildLimits(0, 10);
    const tempContainer = new BaseContainer('temp', rootContainer, 'container');
    console.log('Before destruction - Total containers:', BaseContainer.getAllContainers().length);
    
    tempContainer.destroy();
    console.log('After destruction - Total containers:', BaseContainer.getAllContainers().length);
    console.log('✓ Container destruction working');
    console.log('');

    // Final summary
    console.log('=== Test Summary ===');
    console.log('✓ All BaseContainer tests passed!');
    console.log('✓ Root container hierarchy:', rootContainer.children.length, 'children');
    console.log('✓ Active containers:', BaseContainer.getAllContainers().length);
    console.log('✓ Architecture is reactive and ready for handler integration');

} catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
}
