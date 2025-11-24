import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { usersApi, type UserCreateData, type UserUpdateData } from '@/api/usersApi';
import { User } from '@/types';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { VStack } from '@/components/common/Spacing';
import { showErrorToast, showSuccessToast } from '@/utils/errorHandler';
import { formatDate } from '@/utils/formatters';
import { USER_ROLES } from '@/utils/constants';
import clsx from 'clsx';

export const UserManagement: React.FC = () => {
    const navigate = useNavigate();
    const { user: currentUser } = useAuthStore();
    const queryClient = useQueryClient();
    
    // State
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    
    // Fetch users
    const { data: usersData, isLoading } = useQuery({
        queryKey: ['users', searchTerm, roleFilter, statusFilter],
        queryFn: () => usersApi.getUsers({
            search: searchTerm || undefined,
            role: roleFilter || undefined,
            is_active: statusFilter ? statusFilter === 'active' : undefined,
        }),
    });

    // Fetch stats
    const { data: stats } = useQuery({
        queryKey: ['users', 'stats'],
        queryFn: () => usersApi.getStats(),
    });

    // Create user mutation
    const createMutation = useMutation({
        mutationFn: usersApi.createUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setIsCreateModalOpen(false);
            showSuccessToast('User created successfully');
        },
        onError: (error) => {
            showErrorToast(error, 'Failed to create user');
        },
    });

    // Update user mutation
    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: UserUpdateData }) =>
            usersApi.updateUser(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setIsEditModalOpen(false);
            setSelectedUser(null);
            showSuccessToast('User updated successfully');
        },
        onError: (error) => {
            showErrorToast(error, 'Failed to update user');
        },
    });

    // Delete user mutation
    const deleteMutation = useMutation({
        mutationFn: usersApi.deleteUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setIsDeleteModalOpen(false);
            setSelectedUser(null);
            showSuccessToast('User deleted successfully');
        },
        onError: (error) => {
            showErrorToast(error, 'Failed to delete user');
        },
    });

    // Toggle active status mutation
    const toggleActiveMutation = useMutation({
        mutationFn: ({ id, activate }: { id: string; activate: boolean }) =>
            activate ? usersApi.activateUser(id) : usersApi.deactivateUser(id),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            showSuccessToast(`User ${variables.activate ? 'activated' : 'deactivated'} successfully`);
        },
        onError: (error) => {
            showErrorToast(error, 'Failed to update user status');
        },
    });

    const handleEdit = (user: User) => {
        setSelectedUser(user);
        setIsEditModalOpen(true);
    };

    const handleDelete = (user: User) => {
        setSelectedUser(user);
        setIsDeleteModalOpen(true);
    };

    const handleToggleActive = (user: User) => {
        toggleActiveMutation.mutate({
            id: user.id,
            activate: !user.is_active,
        });
    };

    // Check if current user is admin
    if (!currentUser || currentUser.role !== 'admin') {
        return (
            <MainLayout>
                <div className="min-h-[60vh] flex items-center justify-center">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
                        <p className="mt-2 text-gray-600">You don't have permission to access this page.</p>
                    </div>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <VStack size="content">
                {/* Breadcrumb Navigation */}
                <Breadcrumb 
                    items={[
                        { label: 'Dashboard', href: '/' },
                        { label: 'User Management' }
                    ]}
                />

                {/* Header */}
                <PageHeader
                    title="User Management"
                    subtitle="Manage system users and their roles"
                    actions={
                        <Button onClick={() => setIsCreateModalOpen(true)}>
                            Create User
                        </Button>
                    }
                />

                {/* Stats Cards */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-sm font-medium text-gray-600">Total Users</h3>
                            <p className="mt-2 text-3xl font-bold text-gray-900">{stats.total_users}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-sm font-medium text-gray-600">Active Users</h3>
                            <p className="mt-2 text-3xl font-bold text-green-600">{stats.active_users}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-sm font-medium text-gray-600">Inactive Users</h3>
                            <p className="mt-2 text-3xl font-bold text-red-600">{stats.inactive_users}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-sm font-medium text-gray-600">Admins</h3>
                            <p className="mt-2 text-3xl font-bold text-blue-600">
                                {stats.role_counts.admin?.count || 0}
                            </p>
                        </div>
                    </div>
                )}

                {/* Filters */}
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <Input
                            placeholder="Search users..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="flex-1"
                        />
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                        >
                            <option value="">All Roles</option>
                            {Object.entries(USER_ROLES).map(([key, value]) => (
                                <option key={key} value={key}>{value}</option>
                            ))}
                        </select>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                        >
                            <option value="">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                </div>

                {/* Users Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    {isLoading ? (
                        <div className="p-12 text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                            <p className="mt-4 text-gray-600">Loading users...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            User
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Role
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Joined
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Last Login
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {usersData?.results.map((user) => (
                                        <tr key={user.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                                                        <span className="text-primary-700 font-medium text-sm">
                                                            {user.username.charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">{user.username}</div>
                                                        <div className="text-sm text-gray-500">{user.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={clsx(
                                                    'px-2 inline-flex text-xs leading-5 font-semibold rounded-full',
                                                    user.role === 'admin' && 'bg-red-100 text-red-800',
                                                    user.role === 'finance' && 'bg-orange-100 text-orange-800',
                                                    user.role === 'approver_lvl2' && 'bg-purple-100 text-purple-800',
                                                    user.role === 'approver_lvl1' && 'bg-blue-100 text-blue-800',
                                                    user.role === 'staff' && 'bg-gray-100 text-gray-800'
                                                )}>
                                                    {user.role_display || USER_ROLES[user.role]}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={clsx(
                                                    'px-2 inline-flex text-xs leading-5 font-semibold rounded-full',
                                                    user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                )}>
                                                    {user.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {formatDate(user.date_joined)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {user.last_login ? formatDate(user.last_login) : 'Never'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => navigate(`/requests?created_by=${user.id}`)}
                                                        className="text-blue-600 hover:text-blue-900 mr-2"
                                                    >
                                                        View Requests
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleActive(user)}
                                                        className="text-blue-600 hover:text-blue-900"
                                                        disabled={user.id === currentUser.id}
                                                    >
                                                        {user.is_active ? 'Deactivate' : 'Activate'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleEdit(user)}
                                                        className="text-indigo-600 hover:text-indigo-900"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(user)}
                                                        className="text-red-600 hover:text-red-900"
                                                        disabled={user.id === currentUser.id}
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Create User Modal */}
                <CreateUserModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onSubmit={(data) => createMutation.mutate(data)}
                    isLoading={createMutation.isPending}
                />

                {/* Edit User Modal */}
                {selectedUser && (
                    <EditUserModal
                        isOpen={isEditModalOpen}
                        onClose={() => {
                            setIsEditModalOpen(false);
                            setSelectedUser(null);
                        }}
                        user={selectedUser}
                        onSubmit={(data) => updateMutation.mutate({ id: selectedUser.id, data })}
                        isLoading={updateMutation.isPending}
                    />
                )}

                {/* Delete Confirmation Modal */}
                {selectedUser && (
                    <Modal
                        isOpen={isDeleteModalOpen}
                        onClose={() => {
                            setIsDeleteModalOpen(false);
                            setSelectedUser(null);
                        }}
                        title="Delete User"
                    >
                        <div className="space-y-4">
                            <p>Are you sure you want to delete user <strong>{selectedUser.username}</strong>?</p>
                            <p className="text-sm text-red-600">This action cannot be undone.</p>
                            <div className="flex justify-end gap-4">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setIsDeleteModalOpen(false);
                                        setSelectedUser(null);
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="danger"
                                    onClick={() => deleteMutation.mutate(selectedUser.id)}
                                    isLoading={deleteMutation.isPending}
                                >
                                    Delete
                                </Button>
                            </div>
                        </div>
                    </Modal>
                )}
            </VStack>
        </MainLayout>
    );
};

// Create User Modal Component
interface CreateUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: UserCreateData) => void;
    isLoading: boolean;
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({ isOpen, onClose, onSubmit, isLoading }) => {
    const [formData, setFormData] = useState<UserCreateData>({
        username: '',
        email: '',
        password: '',
        password_confirm: '',
        first_name: '',
        last_name: '',
        role: 'staff',
        is_active: true,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create New User">
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                />
                <Input
                    label="Email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                />
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="First Name"
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    />
                    <Input
                        label="Last Name"
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                        required
                    >
                        {Object.entries(USER_ROLES).map(([key, value]) => (
                            <option key={key} value={key}>{value}</option>
                        ))}
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                    />
                    <Input
                        label="Confirm Password"
                        type="password"
                        value={formData.password_confirm}
                        onChange={(e) => setFormData({ ...formData, password_confirm: e.target.value })}
                        required
                    />
                </div>
                <div className="flex items-center">
                    <input
                        type="checkbox"
                        id="is_active"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                        Active
                    </label>
                </div>
                <div className="flex justify-end gap-4">
                    <Button variant="outline" onClick={onClose} type="button">
                        Cancel
                    </Button>
                    <Button type="submit" isLoading={isLoading}>
                        Create User
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

// Edit User Modal Component
interface EditUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
    onSubmit: (data: UserUpdateData) => void;
    isLoading: boolean;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ isOpen, onClose, user, onSubmit, isLoading }) => {
    const [formData, setFormData] = useState<UserUpdateData>({
        email: user.email,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        role: user.role,
        is_active: user.is_active,
        password: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const submitData = { ...formData };
        if (!submitData.password) {
            delete submitData.password;
        }
        onSubmit(submitData);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Edit User: ${user.username}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                />
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="First Name"
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    />
                    <Input
                        label="Last Name"
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                        required
                    >
                        {Object.entries(USER_ROLES).map(([key, value]) => (
                            <option key={key} value={key}>{value}</option>
                        ))}
                    </select>
                </div>
                <Input
                    label="New Password (leave blank to keep current)"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <div className="flex items-center">
                    <input
                        type="checkbox"
                        id="is_active_edit"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="is_active_edit" className="ml-2 block text-sm text-gray-900">
                        Active
                    </label>
                </div>
                <div className="flex justify-end gap-4">
                    <Button variant="outline" onClick={onClose} type="button">
                        Cancel
                    </Button>
                    <Button type="submit" isLoading={isLoading}>
                        Update User
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
