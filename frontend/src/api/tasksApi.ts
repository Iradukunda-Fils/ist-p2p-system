import apiClient from "./client";
import { TaskResult, ActiveTasksResponse, WorkerStatusResponse } from "@/types";

/**
 * Service for interacting with Celery task monitoring endpoints
 */
export const tasksApi = {
    /**
     * Get the status and result of a specific task
     */
    getTaskStatus: async (taskId: string): Promise<TaskResult> => {
        const response = await apiClient.get<TaskResult>(`/tasks/${taskId}/`);
        return response.data;
    },

    /**
     * List all currently active tasks across all workers
     */
    listActiveTasks: async (): Promise<ActiveTasksResponse> => {
        const response = await apiClient.get<ActiveTasksResponse>('/tasks/');
        return response.data;
    },

    /**
     * Check the health and status of Celery workers
     */
    getWorkerStatus: async (): Promise<WorkerStatusResponse> => {
        const response = await apiClient.get<WorkerStatusResponse>('/celery/status/');
        return response.data;
    }
};

export default tasksApi;
