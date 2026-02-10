import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { ensureUserContext } from '../lib/ensureUserContext';
import type { Equipment, Assignment, Issue, ActivityLog } from '../backend';

// Equipment queries
export function useGetAllEquipment() {
  const { actor, isFetching } = useActor();

  return useQuery<Equipment[]>({
    queryKey: ['equipment'],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await actor.getAllEquipment();
      } catch (error) {
        console.error('Failed to fetch equipment:', error);
        return [];
      }
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetEquipment(id: string) {
  const { actor, isFetching } = useActor();

  return useQuery<Equipment | null>({
    queryKey: ['equipment', id],
    queryFn: async () => {
      if (!actor) return null;
      try {
        return await actor.getEquipment(id);
      } catch (error) {
        console.error('Failed to fetch equipment:', error);
        return null;
      }
    },
    enabled: !!actor && !isFetching && !!id,
  });
}

export function useUpdateEquipment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (equipment: Equipment) => {
      if (!actor) throw new Error('Actor not available');
      
      // Validate session before write operation
      // Pass the operator ID if available for badge validation
      const operatorId = equipment.assigned_operator || undefined;
      const isValid = await ensureUserContext(operatorId);
      if (!isValid) {
        throw new Error('Authentication validation failed');
      }
      
      await actor.updateEquipment(equipment);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
    },
  });
}

// Assignment queries
export function useCreateAssignment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assignment: Assignment) => {
      if (!actor) throw new Error('Actor not available');
      
      // Validate session before write operation
      // Pass the operator ID for badge validation
      const isValid = await ensureUserContext(assignment.operator_id);
      if (!isValid) {
        throw new Error('Authentication validation failed');
      }
      
      await actor.createAssignment(assignment);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
    },
  });
}

export function useGetAllAssignments() {
  const { actor, isFetching } = useActor();

  return useQuery<Assignment[]>({
    queryKey: ['assignments'],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await actor.getAllAssignments();
      } catch (error) {
        console.error('Failed to fetch assignments:', error);
        return [];
      }
    },
    enabled: !!actor && !isFetching,
  });
}

// Issue queries
export function useReportIssue() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (issue: Issue) => {
      if (!actor) throw new Error('Actor not available');
      
      // Validate session before write operation
      // Pass the operator ID for badge validation
      const isValid = await ensureUserContext(issue.operator_id);
      if (!isValid) {
        throw new Error('Authentication validation failed');
      }
      
      await actor.reportIssue(issue);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
    },
  });
}

export function useUpdateIssue() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (issue: Issue) => {
      if (!actor) throw new Error('Actor not available');
      
      // Validate session before write operation (admin only)
      // No badge ID needed for admin operations
      const isValid = await ensureUserContext();
      if (!isValid) {
        throw new Error('Authentication validation failed');
      }
      
      await actor.updateIssue(issue);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
    },
  });
}

export function useGetAllIssues() {
  const { actor, isFetching } = useActor();

  return useQuery<Issue[]>({
    queryKey: ['issues'],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await actor.getAllIssues();
      } catch (error) {
        console.error('Failed to fetch issues:', error);
        return [];
      }
    },
    enabled: !!actor && !isFetching,
  });
}

// Activity log queries
export function useLogActivity() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (activity: ActivityLog) => {
      if (!actor) throw new Error('Actor not available');
      
      // Validate session before write operation
      // Pass the user ID for badge validation
      const isValid = await ensureUserContext(activity.user_id);
      if (!isValid) {
        throw new Error('Authentication validation failed');
      }
      
      await actor.logActivity(activity);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
    },
  });
}

export function useGetAllActivityLogs() {
  const { actor, isFetching } = useActor();

  return useQuery<ActivityLog[]>({
    queryKey: ['activityLogs'],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await actor.getAllActivityLogs();
      } catch (error) {
        console.error('Failed to fetch activity logs:', error);
        return [];
      }
    },
    enabled: !!actor && !isFetching,
  });
}

// User profile queries
export function useGetCallerUserProfile() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) return null;
      try {
        return await actor.getCallerUserProfile();
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
        return null;
      }
    },
    enabled: !!actor && !isFetching,
  });
}

// Get current time from backend
export function useGetCurrentTime() {
  const { actor, isFetching } = useActor();

  return useQuery<bigint>({
    queryKey: ['currentTime'],
    queryFn: async () => {
      if (!actor) return BigInt(Date.now() * 1000000);
      try {
        return await actor.getCurrentTime();
      } catch (error) {
        console.error('Failed to fetch current time:', error);
        return BigInt(Date.now() * 1000000);
      }
    },
    enabled: !!actor && !isFetching,
    staleTime: 0,
  });
}
