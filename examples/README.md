# KeyRetriever React Client Examples

This directory contains React client examples for consuming the KeyRetriever Azure Function service.

## Available Examples

### 1. Basic React Client (`reactClient.tsx`)
- Simple React hook for fetching OpenAI configuration
- Basic error handling and loading states
- Example of calling Azure OpenAI directly from the client

### 2. OpenAI Proxy Client (`reactClientProxy.tsx`)
- Uses the OpenAI proxy function for secure API calls
- Chat completion example with conversation UI
- Handles streaming and rate limiting

### 3. **AG Grid Data Table (`reactClientWithAGGrid.tsx`) - NEW**
- **Fixes AG Grid pagination warning**
- Demonstrates proper AG Grid configuration
- Shows financial data with proper pagination settings

## AG Grid Warning Fix

The `reactClientWithAGGrid.tsx` example specifically addresses this AG Grid warning:

```
AG Grid: The paginationPageSize grid option is set to a value that is not in the list of page size options.
Please make sure that the paginationPageSize grid option is set to one of the values in the 
paginationPageSizeSelector array, or set the paginationPageSizeSelector to false to hide the page size selector.
```

### Solution Implementation

The warning occurs when `paginationPageSize` is not included in the `paginationPageSizeSelector` array. Here's the correct configuration:

```typescript
const gridOptions = {
    pagination: true,
    paginationPageSize: 20, // Must be in paginationPageSizeSelector
    paginationPageSizeSelector: [10, 20, 50, 100], // Available options
    // ... other options
};
```

**Key Points:**
- ✅ `paginationPageSize: 20` is included in `paginationPageSizeSelector: [10, 20, 50, 100]`
- ✅ This prevents the warning from appearing
- ✅ Users can still change page sizes using the selector dropdown

### Alternative Solutions

If you don't want the page size selector:

```typescript
const gridOptions = {
    pagination: true,
    paginationPageSize: 25, // Any value is fine
    paginationPageSizeSelector: false, // Hides the selector
};
```

## Installation

To use these examples in your React project:

### 1. Install Dependencies

```bash
npm install react react-dom ag-grid-react ag-grid-community
```

### 2. Install TypeScript Types (if using TypeScript)

```bash
npm install -D @types/react @types/react-dom typescript
```

### 3. Import and Use

```typescript
import DataGridExample from './examples/reactClientWithAGGrid';

function App() {
    return <DataGridExample />;
}
```

## Environment Variables

Set these environment variables in your React app:

```env
REACT_APP_AZURE_FUNCTION_URL=https://your-function-app.azurewebsites.net
```

Or use the default local development URL: `http://localhost:7071/api/openai/config`

## Features Demonstrated

### Basic Client (`reactClient.tsx`)
- ✅ Secure API key retrieval
- ✅ Error handling
- ✅ Loading states
- ✅ CORS configuration

### Proxy Client (`reactClientProxy.tsx`)
- ✅ Chat completions via proxy
- ✅ Conversation UI
- ✅ Rate limiting handling
- ✅ Deployment configuration

### AG Grid Client (`reactClientWithAGGrid.tsx`)
- ✅ **Fixed pagination warning**
- ✅ Data table with sorting and filtering
- ✅ Responsive design
- ✅ Custom cell renderers
- ✅ Proper pagination configuration
- ✅ Real-time KeyRetriever status

## Common Issues and Solutions

### AG Grid Pagination Warning

**Problem:** 
```
main.esm.mjs:373  AG Grid: The paginationPageSize grid option is set to a value that is not in the list of page size options.
```

**Solution:** Ensure `paginationPageSize` is in the `paginationPageSizeSelector` array:

```typescript
// ❌ Wrong - causes warning
paginationPageSize: 25,
paginationPageSizeSelector: [10, 20, 50, 100], // 25 not included

// ✅ Correct - no warning  
paginationPageSize: 20,
paginationPageSizeSelector: [10, 20, 50, 100], // 20 is included

// ✅ Alternative - disable selector
paginationPageSize: 25,
paginationPageSizeSelector: false, // Hides selector, any size OK
```

### KeyRetriever Connection Issues

1. **CORS Errors:** Ensure your domain is in `ALLOWED_ORIGINS` environment variable
2. **404 Errors:** Check the function URL and endpoint path
3. **Unauthorized:** Verify the Azure Function is deployed and running

### Styling Issues

Make sure to import AG Grid CSS:

```typescript
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
```

And use the theme class:

```tsx
<div className="ag-theme-alpine" style={{ height: '500px' }}>
    <AgGridReact {...props} />
</div>
```

## Production Deployment

1. **Build the React app:** `npm run build`
2. **Deploy the Azure Function:** Follow the main repository instructions
3. **Update environment variables:** Set production URLs
4. **Configure CORS:** Add your production domain to `ALLOWED_ORIGINS`

## Support

For issues with:
- **KeyRetriever Azure Function:** See main repository documentation
- **AG Grid configuration:** Refer to [AG Grid documentation](https://ag-grid.com/react-data-grid/)
- **React integration:** Check the example components in this directory