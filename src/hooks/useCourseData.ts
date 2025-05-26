
import { useState } from 'react';
import { useAuth } from '@/contexts/auth';
import { useCommunity } from '@/contexts/community';
import { getCourseData, Course, Lesson, Module } from '@/data/mockCourseData';
import { useVideoProgress } from './useVideoProgress';

interface UseCourseDataProps {
  courseId?: string;
}

export function useCourseData(courseId?: string) {
  const { isAuthenticated, user } = useAuth();
  const { 
    courseProgress = [],
    userBadges = [],
    recordLessonWatched,
    completeModule, 
    completeCourse
  } = useCommunity();

  // UI State
  const [activeTab, setActiveTab] = useState('content');
  const [activeVideoId, setActiveVideoId] = useState<number | null>(1);
  
  // Get course data
  const courseData = getCourseData(courseId);

  // Get active lesson and video info
  const activeLesson = courseData.lessons.find(lesson => lesson.id === activeVideoId);
  const videoUrl = activeLesson?.videoUrl || courseData.activeVideo?.url;
  const videoTitle = activeLesson?.title || courseData.activeVideo?.title || '';

  // Get user progress for this course
  const userProgress = courseProgress.find(progress => progress.courseId === courseId);
  
  // Define a wrapper for recordLessonWatched that matches the expected signature
  const handleRecordLessonWatched = async (courseId: string, lessonId: string): Promise<boolean> => {
    if (recordLessonWatched) {
      return await recordLessonWatched(courseId, lessonId);
    }
    return false;
  };
  
  // Handle video progress tracking
  const { 
    videoCompleted,
    handleVideoProgress,
    handleVideoEnded
  } = useVideoProgress({
    courseId: courseId || 'unknown',
    lessonId: activeVideoId,
    recordLessonWatched: handleRecordLessonWatched,
    videoTitle
  });
  
  // Calculate course progress percentage
  const calculateProgress = () => {
    if (!userProgress || courseData.lessons.length === 0) {
      return courseData.progress;
    }
    
    const watchedCount = userProgress.lessonsWatched.length;
    return Math.round((watchedCount / courseData.lessons.length) * 100);
  };
  
  const progressPercentage = calculateProgress();

  // Find which module contains a lesson
  const findModuleForLesson = (lessonId: number) => {
    const lessonIndex = courseData.lessons.findIndex(lesson => lesson.id === lessonId);
    if (lessonIndex === -1) return null;
    
    const moduleIndex = Math.floor(lessonIndex / (courseData.lessons.length / courseData.modules.length));
    return courseData.modules[moduleIndex < courseData.modules.length ? moduleIndex : 0];
  };
  
  // Check if all lessons in a module have been watched
  const checkAllModuleLessonsWatched = (module: Module) => {
    if (!userProgress) return false;
    
    const moduleIndex = courseData.modules.indexOf(module);
    const lessonsPerModule = Math.ceil(courseData.lessons.length / courseData.modules.length);
    const startIdx = moduleIndex * lessonsPerModule;
    const endIdx = Math.min(startIdx + lessonsPerModule, courseData.lessons.length);
    
    const moduleLessons = courseData.lessons.slice(startIdx, endIdx);
    
    return moduleLessons.every(lesson => 
      userProgress.lessonsWatched.includes(lesson.id.toString())
    );
  };
  
  // Check if all modules in course have been completed
  const checkAllModulesCompleted = () => {
    if (!userProgress) return false;
    
    return courseData.modules.every((_, index) => 
      userProgress.modulesCompleted.includes(index.toString())
    );
  };

  // Handle lesson click to update active video
  const handleLessonClick = async (lessonId: number) => {
    // Only update active video ID when clicking on a lesson
    setActiveVideoId(lessonId);
  };

  // Check if user has badge for course completion
  const hasCourseCompletionBadge = () => {
    if (!courseId || !userBadges || userBadges.length === 0) {
      return false;
    }
    
    return userBadges.some(userBadge => 
      userBadge.badge && userBadge.badge.name && userBadge.badge.name.includes(courseData.title.substring(0, 10))
    );
  };

  // Analyze progress and check for module/course completion when video is completed
  const checkCourseCompletion = async () => {
    if (!isAuthenticated || !user || !activeVideoId) return;
    
    // Check if module is completed
    const lessonModule = findModuleForLesson(activeVideoId);
    if (lessonModule) {
      const moduleId = courseData.modules.indexOf(lessonModule).toString();
      const allModuleLessonsWatched = checkAllModuleLessonsWatched(lessonModule);
      
      if (allModuleLessonsWatched && completeModule) {
        await completeModule(courseId || 'unknown', moduleId);
        
        // Check if all modules are completed -> course completion
        const allModulesCompleted = checkAllModulesCompleted();
        if (allModulesCompleted && completeCourse) {
          await completeCourse(courseId || 'unknown');
        }
      }
    }
  };

  // Check for completions when video has been completed
  if (videoCompleted) {
    checkCourseCompletion();
  }

  return {
    courseData,
    activeTab,
    setActiveTab,
    activeVideoId,
    activeLesson,
    videoUrl,
    videoTitle,
    progressPercentage,
    userProgress,
    handleLessonClick,
    handleVideoProgress,
    handleVideoEnded,
    hasCourseCompletionBadge,
    videoCompleted
  };
}
