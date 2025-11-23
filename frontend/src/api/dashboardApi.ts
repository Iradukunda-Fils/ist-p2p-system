import apiClient from './client';
import { PurchaseRequest, PaginatedResponse, User } from '@/types';

export interface DashboardStats {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  userSpecificStats: UserRoleStats;
}

export interface UserRoleStats {
  staff?: {
    myRequests: number;
    pendingApprovals: number;
  };
  approver?: {
    pendingApprovals: number;
    approvedToday: number;
  };
  finance?: {
    totalPOs: number;
    totalValue: number;
  };
}

export interface DashboardData {
  stats: DashboardStats;
  latestRequests: PurchaseRequest[];
  userRole: string;
}

/**
 * Dashboard-specific API calls with optimized caching
 */
export const dashboardApi = {
  /**
   * Get latest requests for dashboard (limited to recent items)
   */
  getLatestRequests: async (limit: number = 10): Promise<PurchaseRequest[]> => {
    const response = await apiClient.get<PaginatedResponse<PurchaseRequest>>('/purchases/requests/', {
      params: {
        page_size: limit,
        ordering: '-created_at', // Most recent first
      }
    });
    return response.data.results;
  },

  /**
   * Get dashboard statistics for current user
   */
  getDashboardStats: async (user: User): Promise<DashboardStats> => {
    // Get all requests for stats calculation
    const response = await apiClient.get<PaginatedResponse<PurchaseRequest>>('/purchases/requests/', {
      params: {
        page_size: 100, // Get enough for stats
      }
    });

    const requests = response.data.results;
    const totalRequests = response.data.count;
    
    // Calculate basic stats
    const pendingRequests = requests.filter(r => r.status === 'PENDING').length;
    const approvedRequests = requests.filter(r => r.status === 'APPROVED').length;
    const rejectedRequests = requests.filter(r => r.status === 'REJECTED').length;

    // Calculate user-specific stats based on role
    let userSpecificStats: UserRoleStats = {};

    if (user.role === 'staff') {
      const myRequests = requests.filter(r => r.created_by.id === user.id);
      userSpecificStats.staff = {
        myRequests: myRequests.length,
        pendingApprovals: myRequests.filter(r => r.status === 'PENDING').length,
      };
    }

    if (user.role === 'approver_lvl1' || user.role === 'approver_lvl2') {
      const today = new Date().toISOString().split('T')[0];
      const approvedToday = requests.filter(r => 
        r.status === 'APPROVED' && 
        r.approved_at && 
        r.approved_at.startsWith(today)
      ).length;

      userSpecificStats.approver = {
        pendingApprovals: pendingRequests,
        approvedToday,
      };
    }

    if (user.role === 'finance' || user.role === 'admin') {
      // For finance users, we'll need to get PO data separately
      try {
        const poResponse = await apiClient.get('/purchases/purchase-orders/summary/');
        userSpecificStats.finance = {
          totalPOs: poResponse.data.total_pos || 0,
          totalValue: poResponse.data.total_value || 0,
        };
      } catch (error) {
        // Fallback if PO data is not available
        userSpecificStats.finance = {
          totalPOs: 0,
          totalValue: 0,
        };
      }
    }

    return {
      totalRequests,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
      userSpecificStats,
    };
  },

  /**
   * Get comprehensive dashboard data in a single call
   */
  getDashboardData: async (user: User): Promise<DashboardData> => {
    try {
      // Fetch both stats and latest requests concurrently
      const [stats, latestRequests] = await Promise.all([
        dashboardApi.getDashboardStats(user),
        dashboardApi.getLatestRequests(10),
      ]);

      return {
        stats,
        latestRequests,
        userRole: user.role,
      };
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw error;
    }
  },

  /**
   * Get user-specific requests for dashboard
   */
  getUserRequests: async (userId: string, limit: number = 5): Promise<PurchaseRequest[]> => {
    const response = await apiClient.get<PaginatedResponse<PurchaseRequest>>('/purchases/requests/', {
      params: {
        created_by: userId,
        page_size: limit,
        ordering: '-created_at',
      }
    });
    return response.data.results;
  },

  /**
   * Get pending approvals for approver users
   */
  getPendingApprovals: async (limit: number = 10): Promise<PurchaseRequest[]> => {
    const response = await apiClient.get<PaginatedResponse<PurchaseRequest>>('/purchases/requests/', {
      params: {
        status: 'PENDING',
        page_size: limit,
        ordering: '-created_at',
      }
    });
    return response.data.results;
  },
};

export default dashboardApi;