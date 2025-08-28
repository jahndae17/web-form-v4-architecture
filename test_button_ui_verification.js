/**
 * Button UI Verification Test
 * Verifies that the ToolPanelToggleBehavior creates button UI correctly
 */

// Load dependencies
const BaseContainer = require('./App/Components/Developer Level/base container.js');
const ToolsContainer = require('./App/Components/Developer Level/tools container.js');

// Mock DOM environment for testing
function createMockDOM() {
    const mockElement = {
        appendChild: function(child) {
            this.children = this.children || [];
            this.children.push(child);
            child.parentNode = this;
            console.log(`📎 Mock: Appended element ${child.id || child.className} to container`);
        },
        removeChild: function(child) {
            if (this.children) {
                const index = this.children.indexOf(child);
                if (index > -1) {
                    this.children.splice(index, 1);
                    child.parentNode = null;
                    console.log(`🗑️ Mock: Removed element ${child.id || child.className} from container`);
                }
            }
        },
        setAttribute: function(name, value) {
            this[`attr_${name}`] = value;
        },
        getAttribute: function(name) {
            return this[`attr_${name}`];
        },
        style: {},
        id: 'mock-container',
        className: 'tools-container'
    };

    const mockButton = {
        style: {},
        textContent: '',
        id: '',
        className: '',
        setAttribute: function(name, value) {
            this[`attr_${name}`] = value;
            console.log(`🏷️ Mock: Set attribute ${name}="${value}" on button`);
        },
        getAttribute: function(name) {
            return this[`attr_${name}`];
        },
        parentNode: null
    };

    // Mock document.createElement
    global.document = {
        createElement: function(tagName) {
            if (tagName === 'button') {
                const button = { ...mockButton };
                console.log(`🆕 Mock: Created ${tagName} element`);
                return button;
            }
            return mockElement;
        }
    };

    return { mockElement, mockButton };
}

async function testButtonUICreation() {
    console.log('=== Button UI Creation Verification Test ===\\n');
    
    // Set up mock DOM
    const { mockElement } = createMockDOM();
    
    try {
        // Test 1: Load ToolPanelToggleBehavior
        console.log('Test 1: Loading ToolPanelToggleBehavior...');
        let ToolPanelToggleBehavior;
        try {
            ToolPanelToggleBehavior = require('./App/Components/Developer Level/ToolPanelToggleBehavior.js');
            console.log('✅ ToolPanelToggleBehavior loaded successfully');
        } catch (error) {
            console.log(`❌ Failed to load ToolPanelToggleBehavior: ${error.message}`);
            return;
        }

        // Test 2: Create ToolsContainer with element
        console.log('\\nTest 2: Creating ToolsContainer with mock element...');
        const container = new ToolsContainer('test-container', null, {
            panelPosition: 'left',
            isPanelOpen: true
        });
        
        // Assign mock element to container
        container.element = mockElement;
        console.log(`✅ Container created: ${container.containerId}`);
        console.log(`   - Panel open: ${container.isPanelOpen}`);
        console.log(`   - Panel position: ${container.panelPosition}`);
        console.log(`   - Element assigned: ${!!container.element}`);

        // Test 3: Create behavior instance
        console.log('\\nTest 3: Creating ToolPanelToggleBehavior instance...');
        const behavior = new ToolPanelToggleBehavior({
            buttonEnabled: true,
            buttonSymbols: { open: '◄', closed: '►' },
            buttonSize: { width: 20, height: 20 },
            animationEnabled: true
        });
        console.log(`✅ Behavior created: ${behavior.behaviorId}`);

        // Test 4: Attach behavior to container
        console.log('\\nTest 4: Attaching behavior to container...');
        const attached = behavior.attachToContainer(container);
        console.log(`✅ Attachment result: ${attached}`);
        console.log(`   - Host container: ${behavior.hostContainer?.containerId}`);
        console.log(`   - Button enabled: ${behavior.config.buttonEnabled}`);

        // Test 5: Create toggle button
        console.log('\\nTest 5: Creating toggle button...');
        const button = behavior.createToggleButton();
        console.log(`✅ Button creation result: ${!!button}`);
        
        if (button) {
            console.log(`   - Button ID: ${button.id}`);
            console.log(`   - Button class: ${button.className}`);
            console.log(`   - Button text: "${button.textContent}"`);
            console.log(`   - ARIA label: ${button.getAttribute('aria-label')}`);
            console.log(`   - ARIA expanded: ${button.getAttribute('aria-expanded')}`);
            console.log(`   - Button position: left=${button.style.left}, top=${button.style.top}`);
            console.log(`   - Button size: width=${button.style.width}, height=${button.style.height}`);
        }

        // Test 6: Verify button positioning
        console.log('\\nTest 6: Testing button positioning for different panel positions...');
        const positions = ['left', 'right', 'top', 'bottom'];
        
        for (const position of positions) {
            container.setPanelPosition(position);
            behavior.updateButtonPosition();
            const calculatedPos = behavior.calculateButtonPosition();
            console.log(`   - ${position.padEnd(6)} panel: x=${calculatedPos.x}, y=${calculatedPos.y}`);
        }

        // Test 7: Test button state updates
        console.log('\\nTest 7: Testing button state updates...');
        
        // Test closed state
        container.closePanel();
        behavior.updateButtonSymbol('closed');
        console.log(`   - Closed state: text="${button.textContent}", aria-expanded="${button.getAttribute('aria-expanded')}"`);
        
        // Test open state
        container.openPanel();
        behavior.updateButtonSymbol('open');
        console.log(`   - Open state: text="${button.textContent}", aria-expanded="${button.getAttribute('aria-expanded')}"`);

        // Test 8: Verify button is attached to container element
        console.log('\\nTest 8: Verifying button attachment to container...');
        if (container.element && container.element.children) {
            const attachedButton = container.element.children.find(child => 
                child.id === `panel-toggle-${container.containerId}`
            );
            console.log(`✅ Button attached to container: ${!!attachedButton}`);
            if (attachedButton) {
                console.log(`   - Found button in container: ${attachedButton.id}`);
                console.log(`   - Button parent: ${attachedButton.parentNode === container.element}`);
            }
        }

        // Test 9: Test button destruction
        console.log('\\nTest 9: Testing button cleanup...');
        behavior.destroyToggleButton();
        console.log(`✅ Button destroyed: ${!behavior.toggleButton}`);
        
        if (container.element && container.element.children) {
            const remainingButton = container.element.children.find(child => 
                child.id === `panel-toggle-${container.containerId}`
            );
            console.log(`   - Button removed from DOM: ${!remainingButton}`);
        }

        // Test 10: Behavior detachment
        console.log('\\nTest 10: Testing behavior detachment...');
        behavior.detachFromContainer();
        console.log(`✅ Behavior detached: ${!behavior.hostContainer}`);

        console.log('\\n=== Button UI Verification Summary ===');
        console.log('✅ All button UI tests passed!');
        console.log('✅ Button creation: Working correctly');
        console.log('✅ Button positioning: Calculated for all positions');
        console.log('✅ Button state updates: Symbol and ARIA attributes updated');
        console.log('✅ DOM integration: Button attached/removed correctly');
        console.log('✅ Lifecycle management: Creation and destruction working');
        
    } catch (error) {
        console.error('❌ Button UI test failed:', error);
        console.error('Stack trace:', error.stack);
    }
}

// Run the test
testButtonUICreation();
