import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useAuthStore } from "./store/useAuthStore.js";
import { useThemeStore } from "./store/useThemeStore.js";
// import { useCallStore } from "./store/useCallStore.js";
// import { getSocket } from "./lib/socket.js";

import HomePage         from "./pages/HomePage.jsx";
import SignUpPage       from "./pages/SignUpPage.jsx";
import LoginPage        from "./pages/LoginPage.jsx";
import SettingsPage     from "./pages/SettingsPage.jsx";
import ProfilePage      from "./pages/ProfilePage.jsx";
import Navbar           from "./components/Navbar.jsx";
// import IncomingCallModal from "./components/calls/IncomingCallModal.jsx";
// import CallWindow       from "./components/calls/CallWindow.jsx";
import LoadingSpinner   from "./components/skeletons/LoadingSpinner.jsx";

function App() {
  const { authUser, checkAuth, isCheckingAuth } = useAuthStore();
  const { theme } = useThemeStore();
  // const {
  //   subscribeToCallEvents, unsubscribeFromCallEvents,
  //   incomingCall, isCallActive,
  // } = useCallStore();

  // const subscribedRef = useRef(false);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  // ── Subscribe to call events as soon as socket is ready ──
  // Poll until socket is connected (handles the race condition where
  // socket hasn't connected yet when authUser first becomes available)
  // useEffect(() => {
  //   if (!authUser) { subscribedRef.current = false; return; }

  //   const trySubscribe = () => {
  //     const socket = getSocket();
  //     if (socket?.connected) {
  //       if (!subscribedRef.current) {
  //         subscribeToCallEvents();
  //         subscribedRef.current = true;
  //       }
  //     } else {
  //       // Retry in 300ms until socket is ready
  //       setTimeout(trySubscribe, 300);
  //     }
  //   };

  //   trySubscribe();

  //   return () => {
  //     unsubscribeFromCallEvents();
  //     subscribedRef.current = false;
  //   };
  // }, [authUser]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isCheckingAuth) return <LoadingSpinner />;

  return (
    <div data-theme={theme} className="min-h-screen">
      <Navbar />
      <Routes>
        <Route path="/"        element={authUser ? <HomePage />    : <Navigate to="/login" />} />
        <Route path="/signup"  element={!authUser ? <SignUpPage /> : <Navigate to="/" />} />
        <Route path="/login"   element={!authUser ? <LoginPage />  : <Navigate to="/" />} />
        <Route path="/settings" element={authUser ? <SettingsPage /> : <Navigate to="/login" />} />
        <Route path="/profile"  element={authUser ? <ProfilePage /> : <Navigate to="/login" />} />
      </Routes>

      {/* Global call overlays — always mounted so socket events work */}
      {/* {incomingCall  && <IncomingCallModal />}
      {isCallActive  && <CallWindow />} */}

      <Toaster position="top-center" />
    </div>
  );
}

export default App;
