import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/contexts/auth/AuthContext';

interface Course {
  id: string;
  title: string;
  description: string;
  image_url: string;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  title: string;
  content: string;
  video_url: string;
}

interface CourseProgress {
  course_id: string;
  user_id: string;
  completed_lessons: string[];
}

export const useCourseData = (courseId: string | undefined) => {
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const [progress, setProgress] = useState<CourseProgress | null>(null);

  useEffect(() => {
    if (!courseId) {
      setError('Course ID is required');
      setLoading(false);
      return;
    }

    const fetchCourse = async () => {
      setLoading(true);
      try {
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select(`
            id,
            title,
            description,
            image_url,
            lessons (
              id,
              title,
              content,
              video_url
            )
          `)
          .eq('id', courseId)
          .single();

        if (courseError) {
          setError(courseError.message);
        } else if (courseData) {
          setCourse(courseData);
        } else {
          setError('Course not found');
        }
      } catch (err) {
        setError('Failed to fetch course');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [courseId]);

  useEffect(() => {
    if (!user || !courseId) return;

    const fetchProgress = async () => {
      try {
        const { data, error } = await supabase
          .from('course_progress')
          .select('*')
          .eq('course_id', courseId)
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching course progress:', error);
        } else {
          setProgress(data || null);
        }
      } catch (err) {
        console.error('Failed to fetch course progress:', err);
      }
    };

    fetchProgress();
  }, [user, courseId]);

  const markLessonComplete = async (lessonId: string) => {
    if (!user || !courseId) return;

    try {
      const currentCompletedLessons = progress?.completed_lessons || [];
      if (currentCompletedLessons.includes(lessonId)) return;

      const updatedLessons = [...currentCompletedLessons, lessonId];

      const { data, error } = await supabase
        .from('course_progress')
        .upsert(
          {
            course_id: courseId,
            user_id: user.id,
            completed_lessons: updatedLessons,
          },
          { onConflict: ['course_id', 'user_id'] }
        )
        .select('*')
        .single();

      if (error) {
        console.error('Error updating course progress:', error);
      } else {
        setProgress(data);
      }
    } catch (err) {
      console.error('Failed to update course progress:', err);
    }
  };

  const isLessonCompleted = (lessonId: string): boolean => {
    return progress?.completed_lessons?.includes(lessonId) || false;
  };

  return {
    course,
    loading,
    error,
    progress,
    markLessonComplete,
    isLessonCompleted,
  };
};
