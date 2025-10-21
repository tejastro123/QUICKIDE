import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = () => {
    const { isAuthenticated } = useContext(AuthContext);

    if (!isAuthenticated) {
        // Not logged in, redirect to login page
        return <Navigate to="/login" replace />;
    }

    // Logged in, show the child route (e.g., IdePage)
    return <Outlet />;
};

export default ProtectedRoute;