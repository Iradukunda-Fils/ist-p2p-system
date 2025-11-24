import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { Login } from '@/pages/auth/Login';
import { LoadingPage } from '@/components/common/Spinner';

// Lazy load pages for code splitting
const Dashboard = React.lazy(() => import('@/pages/dashboard/Dashboard'));
const RequestsList = React.lazy(() => import('@/pages/requests/RequestsList'));
const RequestDetail = React.lazy(() => import('@/pages/requests/RequestDetail'));
const CreateRequest = React.lazy(() => import('@/pages/requests/CreateRequest'));
const OrdersList = React.lazy(() => import('@/pages/orders/OrdersList'));
const OrderDetail = React.lazy(() => import('@/pages/orders/OrderDetail'));
const DocumentsList = React.lazy(() => import('@/pages/documents/DocumentsList'));
const DocumentDetail = React.lazy(() => import('@/pages/documents/DocumentDetail'));
const DocumentUpload = React.lazy(() => import('@/pages/documents/DocumentUpload'));
const UserManagement = React.lazy(() => import('@/pages/admin/UserManagement').then(m => ({ default: m.UserManagement })));
const UserProfile = React.lazy(() => import('@/pages/profile/UserProfile').then(m => ({ default: m.UserProfile })));
const AuthDiagnostic = React.lazy(() => import('@/pages/AuthDiagnostic'));

export const AppRoutes: React.FC = () => {
    return (
        <BrowserRouter>
            <React.Suspense fallback={<LoadingPage />}>
                <Routes>
                    {/* Public routes */}
                    <Route path="/login" element={<Login />} />

                    {/* Protected routes */}
                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute>
                                <Dashboard />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/requests"
                        element={
                            <ProtectedRoute>
                                <RequestsList />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/requests/create"
                        element={
                            <ProtectedRoute roles={['staff', 'admin']}>
                                <CreateRequest />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/requests/:id"
                        element={
                            <ProtectedRoute>
                                <RequestDetail />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/orders"
                        element={
                            <ProtectedRoute roles={['finance', 'admin']}>
                                <OrdersList />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/orders/:id"
                        element={
                            <ProtectedRoute roles={['finance', 'admin']}>
                                <OrderDetail />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/documents"
                        element={
                            <ProtectedRoute>
                                <DocumentsList />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/documents/:id"
                        element={
                            <ProtectedRoute>
                                <DocumentDetail />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/documents/upload"
                        element={
                            <ProtectedRoute>
                                <DocumentUpload />
                            </ProtectedRoute>
                        }
                    />

                    {/* Admin Routes */}
                    <Route
                        path="/admin/users"
                        element={
                            <ProtectedRoute roles={['admin']}>
                                <UserManagement />
                            </ProtectedRoute>
                        }
                    />

                    {/* Profile Route */}
                    <Route
                        path="/profile"
                        element={
                            <ProtectedRoute>
                                <UserProfile />
                            </ProtectedRoute>
                        }
                    />

                    {/* Diagnostic Page - for debugging */}
                    <Route path="/diagnostic" element={<AuthDiagnostic />} />

                    {/* Default redirect */}
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />

                    {/* 404 */}
                    <Route path="*" element={<div className="p-8 text-center">Page not found</div>} />
                </Routes>
            </React.Suspense>
        </BrowserRouter>
    );
};
