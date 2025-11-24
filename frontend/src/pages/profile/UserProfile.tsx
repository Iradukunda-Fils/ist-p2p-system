import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { Card } from '@/components/common/Card';
import { Avatar } from '@/components/common/Avatar';
import { VStack } from '@/components/common/Spacing';
import { Typography } from '@/components/common/Typography';
import { Button } from '@/components/common/Button';
import { ChangePasswordModal } from '@/components/profile/ChangePasswordModal';
import { formatDate } from '@/utils/formatters';
import { USER_ROLES } from '@/utils/constants';
import clsx from 'clsx';

export const UserProfile: React.FC = () => {
    const { user } = useAuthStore();
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

    if (!user) return null;

    const roleLabel = USER_ROLES[user.role as keyof typeof USER_ROLES] || user.role;

    return (
        <MainLayout>
            <VStack size="content">
                <Breadcrumb 
                    items={[
                        { label: 'Dashboard', href: '/' },
                        { label: 'My Profile' }
                    ]}
                />

                <PageHeader
                    title="My Profile"
                    subtitle="Manage your account settings and view your profile information"
                    actions={
                        <Button variant="secondary" onClick={() => setIsPasswordModalOpen(true)}>
                            Change Password
                        </Button>
                    }
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Profile Card */}
                    <div className="md:col-span-1">
                        <Card>
                            <div className="flex flex-col items-center text-center p-4">
                                <Avatar name={user.username} size="lg" className="mb-4" />
                                <Typography variant="heading-3" className="mb-1">
                                    {user.first_name && user.last_name 
                                        ? `${user.first_name} ${user.last_name}`
                                        : user.username}
                                </Typography>
                                <Typography variant="body" color="muted" className="mb-4">
                                    {user.email}
                                </Typography>
                                
                                <div className="flex flex-wrap gap-2 justify-center">
                                    <span className={clsx(
                                        'px-3 py-1 rounded-full text-sm font-medium',
                                        user.role === 'admin' && 'bg-red-100 text-red-800',
                                        user.role === 'finance' && 'bg-orange-100 text-orange-800',
                                        user.role === 'approver_lvl2' && 'bg-purple-100 text-purple-800',
                                        user.role === 'approver_lvl1' && 'bg-blue-100 text-blue-800',
                                        user.role === 'staff' && 'bg-gray-100 text-gray-800'
                                    )}>
                                        {roleLabel}
                                    </span>
                                    <span className={clsx(
                                        'px-3 py-1 rounded-full text-sm font-medium',
                                        user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                    )}>
                                        {user.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Details Card */}
                    <div className="md:col-span-2">
                        <Card title="Account Details">
                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Username</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{user.username}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Email Address</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">First Name</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{user.first_name || '-'}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Last Name</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{user.last_name || '-'}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Date Joined</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{formatDate(user.date_joined)}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Last Login</dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        {user.last_login ? formatDate(user.last_login) : 'Never'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">User ID</dt>
                                    <dd className="mt-1 text-sm text-gray-900 font-mono">{user.id}</dd>
                                </div>
                            </dl>
                        </Card>
                    </div>
                </div>
            </VStack>

            <ChangePasswordModal 
                isOpen={isPasswordModalOpen} 
                onClose={() => setIsPasswordModalOpen(false)} 
            />
        </MainLayout>
    );
};
