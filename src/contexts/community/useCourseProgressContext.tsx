import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '../auth/AuthContext';

interface CourseProgressContextType {
  progress: { [courseId: string]: { [lessonId: string]: boolean } };
  loading: boolean;
  error: string | null;
  markLessonComplete: (courseId: string, lessonId: string) => Promise<void>;
  isLessonComplete: (courseId: string, lessonId: string) => boolean;
  fetchCourseProgress: () => Promise<void>;
}

const CourseProgressContext = createContext<CourseProgressContextType | undefined>(undefined);

export const CourseProgressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [progress, setProgress] = useState<{ [courseId: string]: { [lessonId: string]: boolean } }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchCourseProgress();
    }
  }, [user]);

  const fetchCourseProgress = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('course_progress')
        .select('course_id, lesson_id, completed')
        .eq('user_id', user.id);

      if (error) {
        setError(error.message);
        toast.error(`Failed to fetch course progress: ${error.message}`);
        return;
      }

      const initialProgress: { [courseId: string]: { [lessonId: string]: boolean } } = {};
      data.forEach(({ course_id, lesson_id, completed }) => {
        if (!initialProgress[course_id]) {
          initialProgress[course_id] = {};
        }
        initialProgress[course_id][lesson_id] = completed;
      });

      setProgress(initialProgress);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      toast.error(`An unexpected error occurred: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const markLessonComplete = async (courseId: string, lessonId: string) => {
    if (!user) {
      toast.error('You must be logged in to mark lessons as complete.');
      return;
    }

    try {
      // Optimistically update local state
      setProgress(prevProgress => {
        const newProgress = { ...prevProgress };
        if (!newProgress[courseId]) {
          newProgress[courseId] = {};
        }
        newProgress[courseId][lessonId] = true;
        return newProgress;
      });

      // Update database
      const { error } = await supabase
        .from('course_progress')
        .upsert(
          {
            user_id: user.id,
            course_id: courseId,
            lesson_id: lessonId,
            completed: true,
            updated_at: new Date()
          },
          { onConflict: 'user_id, course_id, lesson_id', ignoreDuplicates: false }
        );

      if (error) {
        // Revert on error
        setProgress(prevProgress => {
          const newProgress = { ...prevProgress };
          if (!newProgress[courseId]) {
            newProgress[courseId] = {};
          }
          newProgress[courseId][lessonId] = false;
          return newProgress;
        });
        toast.error(`Failed to update progress: ${error.message}`);
      } else {
        toast.success('Lesson marked as complete!');
      }
    } catch (err: any) {
      toast.error(`An unexpected error occurred: ${err.message}`);
    }
  };

  const isLessonComplete = (courseId: string, lessonId: string) => {
    return progress[courseId]?.[lessonId] || false;
  };

  const value: CourseProgressContextType = {
    progress,
    loading,
    error,
    markLessonComplete,
    isLessonComplete,
    fetchCourseProgress
  };

  return (
    <CourseProgressContext.Provider value={value}>
      {children}
    </CourseProgressContext.Provider>
  );
};

export const useCourseProgress = (): CourseProgressContextType => {
  const context = useContext(CourseProgressContext);
  if (!context) {
    throw new Error('useCourseProgress must be used within a CourseProgressProvider');
  }
  return context;
};
