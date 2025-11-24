import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { VStack, HStack } from '@/components/common/Spacing';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import { SimpleBarChart } from '@/components/common/SimpleBarChart';
import { ApprovalSummaryWidget } from '@/components/dashboard/ApprovalSummaryWidget';
import { LatestRequestsCard } from '@/components/dashboard/LatestRequestsCard';
import { DashboardStatsCard } from '@/components/dashboard/DashboardStatsCard';
import { ProcessingStatusWidget } from '@/components/dashboard/ProcessingStatusWidget';
import { DashboardGrid, DashboardStatsGrid, DashboardContentGrid, DashboardColumn } from '@/components/dashboard/DashboardGrid';
import { useDashboardQueries } from '@/hooks/useDashboard';

const Dashboard: React.FC = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();

    // Use enhanced dashboard data fetching
    const {
        latestRequests,
        stats,
        hasError,
        refetchAll
    } = useDashboardQueries();

    if (!user) return null;

    const isStaff = user.role === 'staff';
    const isApprover = user.role === 'approver_lvl1' || user.role === 'approver_lvl2';
    const isFinance = user.role === 'finance' || user.role === 'admin';

    // Handle error state
    if (hasError) {
        return (
            <MainLayout>
                <EmptyState
                    title="Unable to load dashboard"
                    description="There was an error loading your dashboard data. Please try again."
                    action={{
                        label: "Retry",
                        onClick: refetchAll
                    }}
                />
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <VStack size="content">
                {/* Breadcrumb Navigation */}
                <Breadcrumb />
                
                {/* Page Header */}
                <PageHeader
                    title="Dashboard"
                    subtitle={`Welcome back, ${user.username}. Here's what's happening with your procurement system.`}
                    size="lg"
                />

                {/* Stats Grid */}
                <DashboardStatsGrid>
                    {isStaff && stats.data?.userSpecificStats.staff && (
                        <>
                            <DashboardStatsCard
                                title="My Requests"
                                value={stats.data.userSpecificStats.staff.myRequests}
                                isLoading={stats.isLoading}
                                color="blue"
                                icon={
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                }
                            />
                            <DashboardStatsCard
                                title="Pending Approvals"
                                value={stats.data.userSpecificStats.staff.pendingApprovals}
                                isLoading={stats.isLoading}
                                color="yellow"
                                icon={
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                }
                            />
                        </>
                    )}

                    {isApprover && stats.data?.userSpecificStats.approver && (
                        <>
                            <DashboardStatsCard
                                title="Pending Approvals"
                                value={stats.data.userSpecificStats.approver.pendingApprovals}
                                isLoading={stats.isLoading}
                                color="orange"
                                icon={
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                }
                            />
                            <DashboardStatsCard
                                title="Approved Today"
                                value={stats.data.userSpecificStats.approver.approvedToday}
                                isLoading={stats.isLoading}
                                color="green"
                                icon={
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                }
                            />
                        </>
                    )}

                    {isFinance && stats.data?.userSpecificStats.finance && (
                        <>
                            <DashboardStatsCard
                                title="Total POs"
                                value={formatNumber(stats.data.userSpecificStats.finance.totalPOs)}
                                isLoading={stats.isLoading}
                                color="indigo"
                                icon={
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                }
                            />
                            <DashboardStatsCard
                                title="Total Value"
                                value={formatCurrency(stats.data.userSpecificStats.finance.totalValue)}
                                isLoading={stats.isLoading}
                                color="green"
                                icon={
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                }
                            />
                        </>
                    )}

                    <DashboardStatsCard
                        title="All Requests"
                        value={stats.data?.totalRequests || 0}
                        isLoading={stats.isLoading}
                        color="gray"
                        icon={
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        }
                    />
                </DashboardStatsGrid>

                {/* Main Content Grid */}
                <DashboardContentGrid>
                    {/* Latest Requests Card */}
                    <DashboardColumn.TwoThirds>
                        <LatestRequestsCard
                            requests={latestRequests.data || []}
                            isLoading={latestRequests.isLoading}
                            onRequestClick={(id) => navigate(`/requests/${id}`)}
                        />
                    </DashboardColumn.TwoThirds>

                    {/* Right Column - Role-specific widgets */}
                    <DashboardColumn.OneThird>
                        <VStack size="component">
                            {/* Approval Summary for Approvers */}
                            {isApprover && <ApprovalSummaryWidget />}

                            {/* Processing Status Widget for all users */}
                            <ProcessingStatusWidget />

                            {/* Quick Actions for non-approvers */}
                            {!isApprover && (
                                <Card title="Quick Actions">
                                    <VStack size="element">
                                        {(isStaff || user.role === 'admin') && (
                                            <Button 
                                                onClick={() => navigate('/requests/create')}
                                                fullWidth
                                                leftIcon={
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                    </svg>
                                                }
                                            >
                                                Create New Request
                                            </Button>
                                        )}
                                        <Button 
                                            onClick={() => navigate('/documents/upload')}
                                            variant="secondary"
                                            fullWidth
                                            leftIcon={
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                </svg>
                                            }
                                        >
                                            Upload Document
                                        </Button>
                                        <Button 
                                            variant="outline" 
                                            onClick={() => navigate('/requests')}
                                            fullWidth
                                            leftIcon={
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                </svg>
                                            }
                                        >
                                            View All Requests
                                        </Button>
                                        {isFinance && (
                                            <Button 
                                                variant="outline" 
                                                onClick={() => navigate('/orders')}
                                                fullWidth
                                                leftIcon={
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                                    </svg>
                                                }
                                            >
                                                View Purchase Orders
                                            </Button>
                                        )}
                                    </VStack>
                                </Card>
                            )}
                        </VStack>
                    </DashboardColumn.OneThird>
                </DashboardContentGrid>

                {/* Analytics Chart */}
                {stats.data && (
                    <Card title="Requests Overview">
                        <SimpleBarChart 
                            data={[
                                { label: 'Pending', value: stats.data.pendingRequests, color: 'bg-yellow-500' },
                                { label: 'Approved', value: stats.data.approvedRequests, color: 'bg-green-500' },
                                { label: 'Rejected', value: stats.data.rejectedRequests, color: 'bg-red-500' },
                            ]} 
                            height={200}
                        />
                    </Card>
                )}
            </VStack>
        </MainLayout>
    );
};

export default Dashboard;
