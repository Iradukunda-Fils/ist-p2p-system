import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PurchaseRequest } from '@/types';
import { Card } from '@/components/common/Card';
import { Spinner } from '@/components/common/Spinner';
import { formatCurrency } from '@/utils/formatters';

interface LatestRequestsCardProps {
  requests: PurchaseRequest[];
  isLoading: boolean;
  onRequestClick?: (requestId: string) => void;
  maxItems?: number;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800';
    case 'APPROVED':
      return 'bg-green-100 text-green-800';
    case 'REJECTED':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getUrgencyColor = (amount: string) => {
  const numAmount = parseFloat(amount);
  if (numAmount > 10000) return 'border-l-red-500';
  if (numAmount > 5000) return 'border-l-yellow-500';
  return 'border-l-blue-500';
};

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  return date.toLocaleDateString();
};

export const LatestRequestsCard: React.FC<LatestRequestsCardProps> = ({
  requests,
  isLoading,
  onRequestClick,
  maxItems = 5
}) => {
  const navigate = useNavigate();

  const handleRequestClick = (requestId: string) => {
    if (onRequestClick) {
      onRequestClick(requestId);
    } else {
      navigate(`/requests/${requestId}`);
    }
  };

  const displayRequests = requests.slice(0, maxItems);

  return (
    <Card title="Latest Requests" className="h-full">
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size="md" />
          </div>
        ) : displayRequests.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm">No recent requests</p>
          </div>
        ) : (
          displayRequests.map((request) => (
            <div
              key={request.id}
              onClick={() => handleRequestClick(request.id)}
              className={`
                p-4 border-l-4 bg-white rounded-lg shadow-sm hover:shadow-md 
                transition-shadow cursor-pointer border border-gray-200
                ${getUrgencyColor(request.amount)}
              `}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {request.title}
                    </h4>
                    <span className={`
                      inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                      ${getStatusColor(request.status)}
                    `}>
                      {request.status}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center gap-4">
                      <span className="font-medium text-gray-900">
                        {formatCurrency(request.amount)}
                      </span>
                      <span>by {request.created_by.username}</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatTimeAgo(request.created_at)}
                    </span>
                  </div>
                  
                  {request.description && (
                    <p className="mt-1 text-xs text-gray-500 line-clamp-2">
                      {request.description}
                    </p>
                  )}
                </div>
                
                <div className="ml-3 flex-shrink-0">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          ))
        )}
        
        {!isLoading && requests.length > maxItems && (
          <div className="pt-3 border-t border-gray-200">
            <button
              onClick={() => navigate('/requests')}
              className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View all {requests.length} requests →
            </button>
          </div>
        )}
      </div>
    </Card>
  );
};

export default LatestRequestsCard;