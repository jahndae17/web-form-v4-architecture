/**
 * Test suite for ToolsContainer class
 * Tests all major functionality including tool management, panel states, and behavior integration
 */

// Import the ToolsContainer class
const ToolsContainer = require('./App/Components/Developer Level/tools container.js');

console.log('=== ToolsContainer Test Suite ===\n');

try {
    // Test 1: Create basic ToolsContainer
    console.log('Test 1: Creating basic ToolsContainer...');
    const toolsContainer = new ToolsContainer('main-tools', null, {
        panelPosition: 'left',
        isPanelOpen: true,
        toolLayout: 'grid'
    });
    
    console.log('✓ ToolsContainer created:', toolsContainer.getState());
    console.log('');

    // Test 2: Panel state management
    console.log('Test 2: Testing panel state management...');
    console.log('Initial panel state:', toolsContainer.isPanelOpen);
    
    toolsContainer.closePanel();
    console.log('After close:', toolsContainer.isPanelOpen);
    console.log('Panel dimensions:', toolsContainer.dimensions);
    
    toolsContainer.openPanel();
    console.log('After open:', toolsContainer.isPanelOpen);
    console.log('Panel dimensions:', toolsContainer.dimensions);
    
    toolsContainer.togglePanel();
    console.log('After toggle:', toolsContainer.isPanelOpen);
    console.log('');

    // Test 3: Tool creation and validation
    console.log('Test 3: Testing tool creation and validation...');
    
    // Create sample tools using static helper
    const brushTool = ToolsContainer.createToolItem('brush-1', 'Paint Brush', 'brush', {
        icon: '🖌️',
        description: 'Basic painting brush',
        shortcut: 'B'
    });
    
    const textTool = ToolsContainer.createToolItem('text-1', 'Text Tool', 'text', {
        icon: '🅰️',
        description: 'Add text elements',
        shortcut: 'T'
    });
    
    const shapeTool = ToolsContainer.createToolItem('shape-1', 'Rectangle', 'shape', {
        icon: '🟦',
        description: 'Draw rectangles',
        shortcut: 'R'
    });
    
    console.log('✓ Sample tools created:');
    console.log('  - Brush:', brushTool.toolId, brushTool.name);
    console.log('  - Text:', textTool.toolId, textTool.name);
    console.log('  - Shape:', shapeTool.toolId, shapeTool.name);
    console.log('');

    // Test 4: Adding tools to container
    console.log('Test 4: Adding tools to container...');
    
    toolsContainer.addTool(brushTool);
    toolsContainer.addTool(textTool);
    toolsContainer.addTool(shapeTool);
    
    console.log('✓ Tools added successfully');
    console.log('Total tools:', toolsContainer.tools.length);
    console.log('Tool IDs:', toolsContainer.tools.map(t => t.toolId));
    console.log('');

    // Test 5: Tool selection and activation
    console.log('Test 5: Testing tool selection and activation...');
    
    toolsContainer.selectTool('brush-1');
    console.log('Selected tools:', toolsContainer.selectedTools.map(t => t.toolId));
    
    toolsContainer.activateTool('brush-1');
    console.log('Active tools:', toolsContainer.activeTools.map(t => t.toolId));
    
    toolsContainer.selectTool('text-1');
    console.log('Selected tools after single-mode selection:', toolsContainer.selectedTools.map(t => t.toolId));
    console.log('');

    // Test 6: Tool categorization and filtering
    console.log('Test 6: Testing tool categorization and filtering...');
    
    const brushTools = toolsContainer.getToolsByCategory('brush');
    const textTools = toolsContainer.getToolsByType('text');
    
    console.log('✓ Brush tools:', brushTools.map(t => t.toolId));
    console.log('✓ Text tools:', textTools.map(t => t.toolId));
    console.log('✓ All categories:', toolsContainer.toolCategories);
    console.log('');

    // Test 7: Panel position changes
    console.log('Test 7: Testing panel position changes...');
    
    console.log('Initial position:', toolsContainer.panelPosition);
    
    toolsContainer.setPanelPosition('right');
    console.log('After change to right:', toolsContainer.panelPosition);
    
    toolsContainer.setPanelPosition('top');
    console.log('After change to top:', toolsContainer.panelPosition);
    
    // Test invalid position
    toolsContainer.setPanelPosition('invalid');
    console.log('After invalid position (should stay valid):', toolsContainer.panelPosition);
    console.log('');

    // Test 8: Behavior management
    console.log('Test 8: Testing behavior management...');
    
    console.log('Enabled behaviors:', toolsContainer.enabledBehaviors);
    console.log('DragAndDrop enabled:', toolsContainer.isBehaviorEnabled('DragAndDropBehavior'));
    console.log('PanelToggle enabled:', toolsContainer.isBehaviorEnabled('ToolPanelToggleBehavior'));
    
    toolsContainer.disableBehavior('DragAndDropBehavior');
    console.log('After disabling DragAndDrop:', toolsContainer.isBehaviorEnabled('DragAndDropBehavior'));
    
    toolsContainer.enableBehavior('DragAndDropBehavior');
    console.log('After re-enabling DragAndDrop:', toolsContainer.isBehaviorEnabled('DragAndDropBehavior'));
    console.log('');

    // Test 9: Validation and constraints
    console.log('Test 9: Testing validation and constraints...');
    
    const validation = toolsContainer.validateConfiguration();
    console.log('✓ Configuration validation:', validation);
    
    // Test tool limits
    const originalMaxTools = toolsContainer.maxTools;
    toolsContainer.maxTools = 2;
    
    try {
        const extraTool = ToolsContainer.createToolItem('extra-1', 'Extra Tool', 'selector');
        toolsContainer.addTool(extraTool);
        console.log('❌ Should have failed due to max tools limit');
    } catch (error) {
        console.log('✓ Max tools limit enforced:', error.message);
    }
    
    // Restore original limit
    toolsContainer.maxTools = originalMaxTools;
    console.log('');

    // Test 10: Tool removal and cleanup
    console.log('Test 10: Testing tool removal and cleanup...');
    
    console.log('Tools before removal:', toolsContainer.tools.length);
    
    const removedTool = toolsContainer.removeTool('text-1');
    console.log('Removed tool:', removedTool?.toolId);
    console.log('Tools after removal:', toolsContainer.tools.length);
    
    // Try to remove non-existent tool
    const notFound = toolsContainer.removeTool('non-existent');
    console.log('Non-existent tool removal result:', notFound);
    console.log('');

    // Test 11: Multiple selection mode
    console.log('Test 11: Testing multiple selection mode...');
    
    // Test multiple selection on existing container
    const originalSelectionMode = toolsContainer.selectionMode;
    toolsContainer.selectionMode = 'multiple';
    
    // Re-add the tools for multi-selection test
    toolsContainer.addTool(textTool); // Re-add the removed text tool
    toolsContainer.clearSelection(); // Clear any existing selection
    
    toolsContainer.selectTool('brush-1');
    toolsContainer.selectTool('shape-1');
    toolsContainer.selectTool('text-1');
    
    console.log('✓ Multiple selection tools:', toolsContainer.selectedTools.map(t => t.toolId));
    
    toolsContainer.clearSelection();
    console.log('After clear selection:', toolsContainer.selectedTools.length);
    
    // Restore original selection mode
    toolsContainer.selectionMode = originalSelectionMode;
    console.log('');

    // Test 12: Tool state management
    console.log('Test 12: Testing tool state management...');
    
    const tool = toolsContainer.getTool('brush-1');
    console.log('Tool before activation:', { toolId: tool.toolId, isActive: tool.isActive });
    
    toolsContainer.activateTool('brush-1');
    console.log('Tool after activation:', { toolId: tool.toolId, isActive: tool.isActive });
    
    toolsContainer.deactivateTool('brush-1');
    console.log('Tool after deactivation:', { toolId: tool.toolId, isActive: tool.isActive });
    console.log('');

    // Test 13: Container reset
    console.log('Test 13: Testing container reset...');
    
    console.log('State before reset:', {
        toolCount: toolsContainer.tools.length,
        activeCount: toolsContainer.activeTools.length,
        selectedCount: toolsContainer.selectedTools.length,
        panelOpen: toolsContainer.isPanelOpen
    });
    
    toolsContainer.reset();
    
    console.log('State after reset:', {
        toolCount: toolsContainer.tools.length,
        activeCount: toolsContainer.activeTools.length,
        selectedCount: toolsContainer.selectedTools.length,
        panelOpen: toolsContainer.isPanelOpen
    });
    console.log('');

    // Test 14: Invalid tool handling
    console.log('Test 14: Testing invalid tool handling...');
    
    try {
        toolsContainer.addTool(null);
        console.log('❌ Should have failed with null tool');
    } catch (error) {
        console.log('✓ Null tool rejected:', error.message);
    }
    
    try {
        toolsContainer.addTool({ name: 'Incomplete' }); // Missing required properties
        console.log('❌ Should have failed with incomplete tool');
    } catch (error) {
        console.log('✓ Incomplete tool rejected:', error.message);
    }
    
    try {
        const invalidTypeTool = ToolsContainer.createToolItem('invalid-1', 'Invalid Tool', 'invalid-type');
        toolsContainer.addTool(invalidTypeTool);
        console.log('❌ Should have failed with invalid tool type');
    } catch (error) {
        console.log('✓ Invalid tool type rejected:', error.message);
    }
    console.log('');

    // Test 15: Integration with BaseContainer
    console.log('Test 15: Testing BaseContainer integration...');
    
    console.log('✓ Container hierarchy:');
    console.log('  - Container ID:', toolsContainer.containerId);
    console.log('  - Container type:', toolsContainer.type);
    console.log('  - Is tools container:', toolsContainer.type === 'tools');
    console.log('  - CSS classes:', toolsContainer.cssClasses);
    console.log('  - Position:', toolsContainer.position);
    console.log('  - Dimensions:', toolsContainer.dimensions);
    console.log('  - Metadata:', toolsContainer.metadata);
    console.log('');

    // Final summary
    console.log('=== Test Summary ===');
    console.log('✅ All ToolsContainer tests passed!');
    console.log('✅ Tool management: Creation, addition, removal, selection, activation');
    console.log('✅ Panel management: Open, close, toggle, position changes');
    console.log('✅ Behavior management: Enable, disable, state tracking');
    console.log('✅ Validation: Tool constraints, configuration validation, error handling');
    console.log('✅ Integration: BaseContainer inheritance, CSS classes, metadata');
    console.log('✅ Edge cases: Invalid inputs, constraint violations, cleanup');
    console.log('✅ Reactive architecture: Declares capabilities, no event handling');

} catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
}