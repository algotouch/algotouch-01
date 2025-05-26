
import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../auth';
import { CourseProgress } from '@/lib/community/types';
import { getUserCourseProgress } from '@/lib/community/course-service';
import { useCourseActions } from './useCourseActions';

// Define the context type
interface CourseProgressContextType {
  courseProgress: CourseProgress[];
  recordLessonWatched: (courseId: string, lessonId: string) => Promise<boolean>;
  completeModule: (courseId: string, moduleId: string) => Promise<boolean>;
  completeCourse: (courseId: string) => Promise<boolean>;
  refreshData: {
    fetchUserCourseProgress: () => Promise<void> | void;
  }
}

// Create the context with default values
const CourseProgressContext = createContext<CourseProgressContextType>({
  courseProgress: [],
  recordLessonWatched: async () => false,
  completeModule: async () => false,
  completeCourse: async () => false,
  refreshData: {
    fetchUserCourseProgress: () => {}
  }
});

export const CourseProgressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [courseProgress, setCourseProgress] = useState<CourseProgress[]>([]);
  
  // Initialize course actions with a refresh function for badges and reputation
  const refreshAllUserData = async () => {
    if (user) {
      await fetchUserCourseProgress(user.id);
    }
  };
  
  const { 
    recordLessonWatched: recordLesson, 
    completeModule: completeModuleAction, 
    completeCourse: completeCourseAction 
  } = useCourseActions(user?.id, refreshAllUserData);
  
  // Fetch user course progress when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchUserCourseProgress(user.id).catch(err => 
        console.error('Error fetching course progress:', err));
    }
  }, [isAuthenticated, user]);
  
  const fetchUserCourseProgress = async (userId: string) => {
    try {
      const progress = await getUserCourseProgress(userId);
      // Transform the data to match CourseProgress interface
      const mappedProgress: CourseProgress[] = progress.map(item => ({
        id: item.id,
        courseId: item.course_id,
        userId: item.user_id,
        lessonsWatched: item.lessons_watched || [],
        modulesCompleted: item.modules_completed || [],
        isCompleted: item.is_completed || false,
        lastWatched: item.last_watched,
        created_at: item.created_at,
        updated_at: item.updated_at
      }));
      setCourseProgress(mappedProgress);
    } catch (error) {
      console.error('Error fetching user course progress:', error);
    }
  };
  
  // Wrapper functions that include toast notifications
  const handleRecordLessonWatched = async (courseId: string, lessonId: string): Promise<boolean> => {
    if (!isAuthenticated || !user) return false;
    
    const success = await recordLesson(courseId, lessonId);
    if (success) {
      toast.success('קיבלת 5 נקודות על צפייה בשיעור!', { duration: 3000 });
      await refreshAllUserData();
    }
    return success;
  };
  
  const handleCompleteModule = async (courseId: string, moduleId: string): Promise<boolean> => {
    if (!isAuthenticated || !user) return false;
    
    const success = await completeModuleAction(courseId, moduleId);
    if (success) {
      toast.success('מודול הושלם! קיבלת 20 נקודות!', { duration: 3000 });
      await refreshAllUserData();
    }
    return success;
  };
  
  const handleCompleteCourse = async (courseId: string): Promise<boolean> => {
    if (!isAuthenticated || !user) return false;
    
    const success = await completeCourseAction(courseId);
    if (success) {
      toast.success('קורס הושלם! קיבלת 50 נקודות ותעודה חדשה!', { duration: 4000 });
      await refreshAllUserData();
    }
    return success;
  };
  
  // Provide context value
  const value: CourseProgressContextType = {
    courseProgress,
    recordLessonWatched: handleRecordLessonWatched,
    completeModule: handleCompleteModule,
    completeCourse: handleCompleteCourse,
    refreshData: {
      fetchUserCourseProgress: () => user && fetchUserCourseProgress(user.id)
    }
  };
  
  return (
    <CourseProgressContext.Provider value={value}>
      {children}
    </CourseProgressContext.Provider>
  );
};

export const useCourseProgress = () => {
  const context = useContext(CourseProgressContext);
  
  if (context === undefined) {
    throw new Error('useCourseProgress must be used within a CourseProgressProvider');
  }
  
  return context;
};
