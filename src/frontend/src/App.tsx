import { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import ReconnectingOverlay from './components/ReconnectingOverlay';
import LoginScreen from './components/LoginScreen';
import SignOnScreen from './components/SignOnScreen';
import RoleSelectionScreen from './components/RoleSelectionScreen';
import OperatorHomeScreen from './pages/OperatorHomeScreen';
import AdminDashboard from './pages/AdminDashboard';
import CheckOutScreen from './pages/CheckOutScreen';
import CheckInScreen from './pages/CheckInScreen';
import ReportIssueScreen from './pages/ReportIssueScreen';
import ManageEquipmentScreen from './pages/ManageEquipmentScreen';
import { subscribeToRefreshState } from './lib/apiClient';

export interface CurrentUser {
  username: string;
  roles: string[];
  displayName?: string;
}

type ViewType = 'roleSelection' | 'signOn' | 'agentMenu' | 'adminMenu' | 'takeEquipment' | 'returnEquipment' | 'reportIssue' | 'manageEquipment';

// Helper to get current view from hash
function getViewFromHash(): ViewType {
  const hash = window.location.hash.slice(1); // Remove '#'
  const validViews: ViewType[] = ['roleSelection', 'signOn', 'agentMenu', 'adminMenu', 'takeEquipment', 'returnEquipment', 'reportIssue', 'manageEquipment'];
  return validViews.includes(hash as ViewType) ? (hash as ViewType) : 'roleSelection';
}

// Helper to navigate to a view
function navigateTo(view: ViewType) {
  window.location.hash = view;
}

export default function App() {
  const { auth, isRefreshing } = useAuth();
  
  const [apiClientRefreshing, setApiClientRefreshing] = useState(false);
  const [overlayDismissed, setOverlayDismissed] = useState(false);
  const [currentView, setCurrentView] = useState<ViewType>(getViewFromHash());

  // Convert auth to CurrentUser format for backward compatibility with child components
  const legacyCurrentUser: CurrentUser | null = auth ? {
    username: auth.user,
    roles: [auth.role],
    displayName: auth.name,
  } : null;

  // Subscribe to hash changes
  useEffect(() => {
    const handleHashChange = () => {
      setCurrentView(getViewFromHash());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Navigate to roleSelection when auth becomes truthy and hash is empty or invalid
  useEffect(() => {
    if (auth) {
      const currentHash = window.location.hash.slice(1);
      const validSignedInViews: ViewType[] = ['roleSelection', 'signOn', 'agentMenu', 'adminMenu', 'takeEquipment', 'returnEquipment', 'reportIssue', 'manageEquipment'];
      
      // If hash is empty or not a valid signed-in view, navigate to roleSelection
      if (!currentHash || !validSignedInViews.includes(currentHash as ViewType)) {
        console.log('[App] Auth became truthy with invalid/empty hash, navigating to roleSelection');
        navigateTo('roleSelection');
      }
    }
  }, [auth]);

  // Subscribe to apiClient refresh state
  useEffect(() => {
    const unsubscribe = subscribeToRefreshState((refreshing) => {
      setApiClientRefreshing(refreshing);
      if (refreshing) {
        setOverlayDismissed(false);
      }
    });
    return unsubscribe;
  }, []);

  // Auto-dismiss overlay after timeout
  useEffect(() => {
    const showOverlay = isRefreshing || apiClientRefreshing;
    
    if (showOverlay) {
      setOverlayDismissed(false);
      
      const timer = setTimeout(() => {
        console.log('[App] Auto-dismissing overlay after timeout');
        setOverlayDismissed(true);
      }, 10000);
      
      return () => clearTimeout(timer);
    } else {
      setOverlayDismissed(false);
    }
  }, [isRefreshing, apiClientRefreshing]);

  // Define overlay state and handlers
  const showReconnectingOverlay = (isRefreshing || apiClientRefreshing) && !overlayDismissed;

  const handleOverlayDismiss = () => {
    console.log('[App] User dismissed overlay');
    setOverlayDismissed(true);
  };

  // Render decision: derive directly from auth
  console.log('[App] Rendering - auth:', auth ? `${auth.name} (${auth.role})` : 'none', 'currentView:', currentView);

  // If not authenticated, render LoginScreen
  if (!auth) {
    return (
      <>
        <LoginScreen onLogin={() => {}} />
        <ReconnectingOverlay 
          isVisible={showReconnectingOverlay} 
          onDismiss={handleOverlayDismiss}
        />
      </>
    );
  }

  // Authenticated: render signed-in UI based on currentView (derived from hash)
  let content;
  switch (currentView) {
    case 'roleSelection':
      content = (
        <RoleSelectionScreen
          currentUser={legacyCurrentUser}
          onContinueAsAgent={() => navigateTo('agentMenu')}
          onContinueToAdmin={() => navigateTo('adminMenu')}
          onBack={() => navigateTo('roleSelection')}
        />
      );
      break;

    case 'signOn':
      content = (
        <SignOnScreen
          currentUser={legacyCurrentUser}
          onAgentLogin={() => navigateTo('agentMenu')}
          onAdminLogin={() => navigateTo('adminMenu')}
          onBack={() => navigateTo('roleSelection')}
        />
      );
      break;

    case 'agentMenu':
      content = (
        <OperatorHomeScreen
          onTakeEquipment={() => navigateTo('takeEquipment')}
          onReturnEquipment={() => navigateTo('returnEquipment')}
          onReportIssue={() => navigateTo('reportIssue')}
          onBack={() => {
            if (auth?.role === 'manager' || auth?.role === 'admin') {
              navigateTo('roleSelection');
            } else {
              navigateTo('signOn');
            }
          }}
        />
      );
      break;

    case 'takeEquipment':
      content = <CheckOutScreen onBack={() => navigateTo('agentMenu')} />;
      break;

    case 'returnEquipment':
      content = <CheckInScreen onBack={() => navigateTo('agentMenu')} />;
      break;

    case 'reportIssue':
      content = <ReportIssueScreen onBack={() => navigateTo('agentMenu')} />;
      break;

    case 'adminMenu':
      content = (
        <AdminDashboard 
          onBack={() => {
            if (auth?.role === 'manager' || auth?.role === 'admin') {
              navigateTo('roleSelection');
            } else {
              navigateTo('signOn');
            }
          }}
          onManageEquipment={() => navigateTo('manageEquipment')}
        />
      );
      break;

    case 'manageEquipment':
      content = <ManageEquipmentScreen onBack={() => navigateTo('adminMenu')} />;
      break;

    default:
      console.warn('[App] Unexpected currentView state:', currentView);
      content = (
        <RoleSelectionScreen
          currentUser={legacyCurrentUser}
          onContinueAsAgent={() => navigateTo('agentMenu')}
          onContinueToAdmin={() => navigateTo('adminMenu')}
          onBack={() => navigateTo('roleSelection')}
        />
      );
      break;
  }

  return (
    <>
      {content}
      <ReconnectingOverlay 
        isVisible={showReconnectingOverlay} 
        onDismiss={handleOverlayDismiss}
      />
    </>
  );
}
