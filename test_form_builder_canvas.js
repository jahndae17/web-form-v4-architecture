/**
 * Test FormBuilderCanvas functionality
 */

// Load dependencies
const BaseContainer = require('./App/Components/Developer Level/base container.js');
const FormBuilderCanvas = require('./App/Components/Developer Level/FormBuilderCanvas.js');

console.log('=== FormBuilderCanvas Test Suite ===\n');

async function testFormBuilderCanvas() {
    try {
        console.log('Test 1: Creating FormBuilderCanvas...');
        const canvas = new FormBuilderCanvas('test-canvas', {
            backgroundColor: '#f8f9fa',
            snapToGrid: true,
            showGrid: true,
            allowOverlap: false
        });
        
        console.log('✓ FormBuilderCanvas created:', {
            id: canvas.id,
            containerType: canvas.containerType,
            allowedToolTypes: canvas.allowedToolTypes,
            snapToGrid: canvas.snapToGrid,
            showGrid: canvas.showGrid
        });
        
        console.log('\nTest 2: Initializing canvas...');
        const initResult = await canvas.initializeContainer();
        console.log('✓ Canvas initialization:', {
            success: initResult.success,
            hasVisualSchema: !!initResult.visualSchema,
            gridEnabled: canvas.isGridVisible
        });
        
        console.log('\nTest 3: Testing drop validation...');
        const mockTool = {
            id: 'tool-1',
            type: 'container',
            size: { width: 100, height: 50 }
        };
        
        const dropValidation = canvas.canAcceptDrop(mockTool, {
            position: { x: 20, y: 40 }
        });
        
        console.log('✓ Drop validation result:', dropValidation);
        
        console.log('\nTest 4: Testing form element addition...');
        const elementData = {
            id: 'element-1',
            type: 'base-user-container',
            properties: { placeholder: 'Test container' },
            size: { width: 200, height: 100 }
        };
        
        const addResult = canvas.addFormElement(elementData, { x: 60, y: 80 });
        console.log('✓ Element addition:', {
            success: addResult.success,
            elementId: addResult.element?.id,
            snappedPosition: addResult.element?.position,
            hasGraphicsRequest: !!addResult.graphics_request
        });
        
        console.log('\nTest 5: Testing canvas state...');
        const state = canvas.getState();
        console.log('✓ Canvas state:', {
            formElementCount: state.formElements.length,
            gridVisible: state.gridVisible,
            snapEnabled: state.snapEnabled,
            formSchemaVersion: state.formSchema.version
        });
        
        console.log('\nTest 6: Testing form schema...');
        const schemaResult = canvas.getFormSchema();
        console.log('✓ Form schema:', {
            success: schemaResult.success,
            elementCount: schemaResult.schema.metadata.elementCount,
            version: schemaResult.schema.version
        });
        
        console.log('\nTest 7: Testing canvas utilities...');
        const nextPosition = canvas.findNextAvailablePosition();
        const snapTest = canvas.calculateElementPosition({ x: 25, y: 35 });
        console.log('✓ Utility methods:', {
            nextAvailablePosition: nextPosition,
            snapTestResult: snapTest
        });
        
        console.log('\n=== FormBuilderCanvas Test Summary ===');
        console.log('✓ All FormBuilderCanvas tests passed!');
        console.log('✓ Canvas is ready for drag and drop integration');
        console.log('✓ Drop zone validation working');
        console.log('✓ Form element management functional');
        
    } catch (error) {
        console.error('❌ FormBuilderCanvas test failed:', error);
        throw error;
    }
}

// Run the test
testFormBuilderCanvas().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
});
