import React, { useState, useEffect } from 'react';

interface UserInfo {
  userId: string;
  userDetails: string;
  userRoles: string[];
  identityProvider: string;
}

interface OpenAIConfig {
  endpoint: string;
  apiKey: string;
}

/**
 * React component that demonstrates Azure Static Web App authentication
 * integration with the KeyRetriever Azure Functions backend.
 * 
 * This component:
 * 1. Checks authentication status using /.auth/me endpoint
 * 2. Provides login/logout functionality 
 * 3. Fetches OpenAI configuration from authenticated Azure Function
 * 4. Makes authenticated API calls to Azure Functions
 */
export const AuthenticatedApp: React.FC = () => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [openaiConfig, setOpenaiConfig] = useState<OpenAIConfig | null>(null);
  const [error, setError] = useState<string>('');

  // Check authentication status on component mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/.auth/me');
      const data = await response.json();
      
      if (data.clientPrincipal) {
        setUserInfo(data.clientPrincipal);
        // User is authenticated, fetch OpenAI config
        await fetchOpenAIConfig();
      }
    } catch (err) {
      console.error('Error checking auth status:', err);
      setError('Failed to check authentication status');
    } finally {
      setLoading(false);
    }
  };

  const fetchOpenAIConfig = async () => {
    try {
      // Call Azure Function with CORS properly configured
      const response = await fetch('https://mortongroupaicred-hugxh8drhqabbphb.canadacentral-01.azurewebsites.net/api/openai/config', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // The authentication token is automatically included by Azure Static Web Apps
        },
        credentials: 'include' // Important for authenticated requests
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setOpenaiConfig(result.data);
        } else {
          setError('Failed to fetch OpenAI config: ' + result.error);
        }
      } else {
        setError(`HTTP error: ${response.status}`);
      }
    } catch (err) {
      console.error('Error fetching OpenAI config:', err);
      setError('Network error fetching OpenAI config');
    }
  };

  const handleLogin = () => {
    // Redirect to Azure AD login
    window.location.href = '/.auth/login/aad?post_login_redirect_uri=' + encodeURIComponent(window.location.pathname);
  };

  const handleLogout = () => {
    // Redirect to logout endpoint
    window.location.href = '/.auth/logout?post_logout_redirect_uri=' + encodeURIComponent(window.location.origin);
  };

  const makeAuthenticatedAPICall = async () => {
    if (!userInfo) {
      setError('User not authenticated');
      return;
    }

    try {
      // Example of making an authenticated call to the OpenAI proxy
      const response = await fetch('https://mortongroupaicred-hugxh8drhqabbphb.canadacentral-01.azurewebsites.net/api/openai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userInfo.userId, // Pass user ID for rate limiting
        },
        credentials: 'include',
        body: JSON.stringify({
          deployment: 'gpt-4o-mini',
          messages: [
            { role: 'user', content: 'Hello! This is an authenticated request.' }
          ],
          max_tokens: 150,
          temperature: 0.7
        })
      });

      const result = await response.json();
      console.log('OpenAI Response:', result);
    } catch (err) {
      console.error('Error making authenticated API call:', err);
      setError('Failed to make authenticated API call');
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <p>Checking authentication status...</p>
      </div>
    );
  }

  return (
    <div className="authenticated-app">
      <header>
        <h1>KeyRetriever - Authenticated Access</h1>
      </header>

      {error && (
        <div className="error" style={{ color: 'red', marginBottom: '1rem' }}>
          Error: {error}
        </div>
      )}

      {userInfo ? (
        <div className="authenticated-content">
          <div className="user-info">
            <h2>Welcome, {userInfo.userDetails}!</h2>
            <p><strong>User ID:</strong> {userInfo.userId}</p>
            <p><strong>Provider:</strong> {userInfo.identityProvider}</p>
            <p><strong>Roles:</strong> {userInfo.userRoles.join(', ')}</p>
          </div>

          {openaiConfig ? (
            <div className="openai-config">
              <h3>✅ OpenAI Configuration Retrieved</h3>
              <p><strong>Endpoint:</strong> {openaiConfig.endpoint}</p>
              <p><strong>API Key:</strong> {'*'.repeat(20)}... (hidden)</p>
            </div>
          ) : (
            <div className="openai-config">
              <h3>❌ OpenAI Configuration Not Available</h3>
              <p>Unable to fetch configuration from Azure Function</p>
            </div>
          )}

          <div className="actions">
            <button onClick={makeAuthenticatedAPICall}>
              Test Authenticated API Call
            </button>
            <button onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      ) : (
        <div className="unauthenticated-content">
          <h2>Authentication Required</h2>
          <p>Please sign in with your Microsoft account to access this application.</p>
          <button onClick={handleLogin}>
            Sign in with Microsoft
          </button>
        </div>
      )}

      <footer style={{ marginTop: '2rem', fontSize: '0.9rem', color: '#666' }}>
        <h3>Authentication Endpoints (for testing):</h3>
        <ul>
          <li><a href="/.auth/me">/.auth/me</a> - Current user info</li>
          <li><a href="/.auth/login/aad">/.auth/login/aad</a> - Microsoft login</li>
          <li><a href="/.auth/logout">/.auth/logout</a> - Logout</li>
        </ul>
      </footer>
    </div>
  );
};

export default AuthenticatedApp;