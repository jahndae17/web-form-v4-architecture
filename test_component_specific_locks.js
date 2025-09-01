/**
 * Test Component-Specific Lock System
 * Tests that multiple components can perform the same operation simultaneously
 * while preventing conflicting operations on the same component.
 */

// Mock ChangeLog
const mockChangeLog = {
    updateContext: async () => {},
    getContextValue: () => null,
    registerHandler: () => {},
    subscribe: () => {},
    notifyChange: () => {}
};

// Load Event Handler
const EventHandler = require('./App/Handler/Event Handler.js');

async function testComponentSpecificLocks() {
    const handler = new EventHandler();
    handler.changeLog = mockChangeLog; // Set up the mock before init
    await handler.init(mockChangeLog);
    
    console.log('🔧 Testing component-specific lock system...\n');
    
    // Test 1: Two components should be able to move simultaneously
    console.log('1️⃣ Testing simultaneous movement of different components:');
    const result1 = await handler.requestLock('drag_lock', 'move_operation_element_123');
    const result2 = await handler.requestLock('drag_lock', 'move_operation_element_456');
    console.log('   Component 123 move lock:', result1 ? '✅ GRANTED' : '❌ DENIED');
    console.log('   Component 456 move lock:', result2 ? '✅ GRANTED' : '❌ DENIED');
    
    // Test 2: Same component can't move and resize simultaneously
    console.log('\n2️⃣ Testing conflicting operations on same component:');
    const result3 = await handler.requestLock('resize_lock', 'resize_operation_element_123');
    console.log('   Component 123 resize lock (should fail):', result3 ? '❌ UNEXPECTEDLY GRANTED' : '✅ CORRECTLY DENIED');
    
    // Test 3: Different components should be able to resize simultaneously
    console.log('\n3️⃣ Testing simultaneous resize of different components:');
    const result4 = await handler.requestLock('resize_lock', 'resize_operation_element_789');
    console.log('   Component 789 resize lock:', result4 ? '✅ GRANTED' : '❌ DENIED');
    
    // Test 4: After releasing move lock, resize should work
    console.log('\n4️⃣ Testing lock release and new operation:');
    await handler.releaseLock('drag_lock', 'move_operation_element_123');
    const result5 = await handler.requestLock('resize_lock', 'resize_operation_element_123');
    console.log('   Component 123 resize after move release:', result5 ? '✅ GRANTED' : '❌ DENIED');
    
    // Test 5: Global lock should block everything
    console.log('\n5️⃣ Testing global lock behavior:');
    await handler.requestLock('global_lock', 'emergency_lock');
    const result6 = await handler.requestLock('drag_lock', 'move_operation_element_999');
    console.log('   Move lock while global lock active:', result6 ? '❌ UNEXPECTEDLY GRANTED' : '✅ CORRECTLY DENIED');
    
    console.log('\n📊 Final lock status:');
    const status = handler.getLockStatus();
    console.log('   Active locks:', Object.keys(status.active_locks).length);
    console.log('   Queued locks:', status.queued_locks);
    
    // Show all active locks for debugging
    console.log('\n🔍 Active lock details:');
    for (const [lockKey, lockInfo] of Object.entries(status.active_locks)) {
        const componentId = handler._extractComponentIdFromOperationId(lockInfo.operationId);
        console.log(`   ${lockKey}: component=${componentId || 'none'}, priority=${lockInfo.priority}`);
    }
}

// Run the test
testComponentSpecificLocks().catch(console.error);
