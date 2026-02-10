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

export default function App() {
  const [subView, setSubView] = useState<'roleSelection' | 'signOn' | 'agentMenu' | 'adminMenu' | 'takeEquipment' | 'returnEquipment' | 'reportIssue' | 'manageEquipment'>('roleSelection');
  
  const { auth, isRefreshing } = useAuth();
  
  const [apiClientRefreshing, setApiClientRefreshing] = useState(false);
  const [overlayDismissed, setOverlayDismissed] = useState(false);

  // Convert auth to CurrentUser format for backward compatibility with child components
  const legacyCurrentUser: CurrentUser | null = auth ? {
    username: auth.user,
    roles: [auth.role],
    displayName: auth.name,
  } : null;

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
  console.log('[App] Rendering - auth:', auth ? `${auth.name} (${auth.role})` : 'none', 'subView:', subView);

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

  // Authenticated: render signed-in UI based on subView
  let content;
  switch (subView) {
    case 'roleSelection':
      content = (
        <RoleSelectionScreen
          currentUser={legacyCurrentUser}
          onContinueAsAgent={() => setSubView('agentMenu')}
          onContinueToAdmin={() => setSubView('adminMenu')}
          onBack={() => setSubView('roleSelection')}
        />
      );
      break;

    case 'signOn':
      content = (
        <SignOnScreen
          currentUser={legacyCurrentUser}
          onAgentLogin={() => setSubView('agentMenu')}
          onAdminLogin={() => setSubView('adminMenu')}
          onBack={() => setSubView('roleSelection')}
        />
      );
      break;

    case 'agentMenu':
      content = (
        <OperatorHomeScreen
          onTakeEquipment={() => setSubView('takeEquipment')}
          onReturnEquipment={() => setSubView('returnEquipment')}
          onReportIssue={() => setSubView('reportIssue')}
          onBack={() => {
            if (auth?.role === 'manager' || auth?.role === 'admin') {
              setSubView('roleSelection');
            } else {
              setSubView('signOn');
            }
          }}
        />
      );
      break;

    case 'takeEquipment':
      content = <CheckOutScreen onBack={() => setSubView('agentMenu')} />;
      break;

    case 'returnEquipment':
      content = <CheckInScreen onBack={() => setSubView('agentMenu')} />;
      break;

    case 'reportIssue':
      content = <ReportIssueScreen onBack={() => setSubView('agentMenu')} />;
      break;

    case 'adminMenu':
      content = (
        <AdminDashboard 
          onBack={() => {
            if (auth?.role === 'manager' || auth?.role === 'admin') {
              setSubView('roleSelection');
            } else {
              setSubView('signOn');
            }
          }}
          onManageEquipment={() => setSubView('manageEquipment')}
        />
      );
      break;

    case 'manageEquipment':
      content = <ManageEquipmentScreen onBack={() => setSubView('adminMenu')} />;
      break;

    default:
      console.warn('[App] Unexpected subView state:', subView);
      content = (
        <RoleSelectionScreen
          currentUser={legacyCurrentUser}
          onContinueAsAgent={() => setSubView('agentMenu')}
          onContinueToAdmin={() => setSubView('adminMenu')}
          onBack={() => setSubView('roleSelection')}
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
