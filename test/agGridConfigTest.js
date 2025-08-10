// Test script to validate AG Grid pagination configuration
// This ensures the paginationPageSize is in paginationPageSizeSelector to prevent warnings

function validateGridConfiguration(config) {
    if (!config.pagination) {
        return { valid: true, message: "Pagination disabled - no validation needed" };
    }

    if (config.paginationPageSizeSelector === false) {
        return { valid: true, message: "Page size selector disabled - any page size is valid" };
    }

    if (Array.isArray(config.paginationPageSizeSelector)) {
        const isValidPageSize = config.paginationPageSizeSelector.includes(config.paginationPageSize);
        if (isValidPageSize) {
            return { 
                valid: true, 
                message: `✅ Valid: paginationPageSize (${config.paginationPageSize}) is in paginationPageSizeSelector [${config.paginationPageSizeSelector.join(', ')}]`
            };
        } else {
            return { 
                valid: false, 
                message: `❌ Invalid: paginationPageSize (${config.paginationPageSize}) is NOT in paginationPageSizeSelector [${config.paginationPageSizeSelector.join(', ')}]. This will cause AG Grid warning!`
            };
        }
    }

    return { valid: false, message: "Invalid configuration structure" };
}

// Test configurations
const testConfigs = [
    // ✅ Valid - our example configuration 
    {
        pagination: true,
        paginationPageSize: 20,
        paginationPageSizeSelector: [10, 20, 50, 100]
    },
    
    // ❌ Invalid - would cause warning
    {
        pagination: true,
        paginationPageSize: 25, 
        paginationPageSizeSelector: [10, 20, 50, 100]
    },
    
    // ✅ Valid - selector disabled
    {
        pagination: true,
        paginationPageSize: 25,
        paginationPageSizeSelector: false
    },
    
    // ✅ Valid - pagination disabled
    {
        pagination: false,
        paginationPageSize: 20,
        paginationPageSizeSelector: [10, 20, 50, 100]
    }
];

console.log('🧪 Testing AG Grid Pagination Configurations\n');

testConfigs.forEach((config, index) => {
    const result = validateGridConfiguration(config);
    console.log(`Test ${index + 1}: ${result.message}`);
    
    if (!result.valid) {
        console.log('   Fix: Either add the page size to the selector array or set paginationPageSizeSelector to false');
    }
    console.log('');
});

console.log('📋 Summary:');
console.log('- Our reactClientWithAGGrid.tsx example uses the FIRST configuration (✅ Valid)');
console.log('- This prevents the "paginationPageSize not in list" AG Grid warning');
console.log('- Users can still change page sizes via the dropdown selector');

module.exports = { validateGridConfiguration };