
import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../auth';
import { Post, Comment } from '@/lib/community/types';
import { 
  getCommunityPosts, 
  registerCommunityPost, 
  getPostById, 
  likePost, 
  uploadPostMedia
} from '@/lib/community/posts-service';
import {
  getPostComments,
  addComment
} from '@/lib/community/comments-service';
import { createTag, getAllTags, addTagsToPost } from '@/lib/community/tags-service';
import { Tag } from '@/lib/community/types';

// Define the context type
interface PostsContextType {
  posts: Post[];
  tags: Tag[];
  loading: boolean;
  activePostId: string | null;
  activePost: Post | null;
  activePostComments: Comment[];
  addNewPost: (title: string, content: string, mediaUrls?: string[], tagIds?: string[], newTags?: string[]) => Promise<boolean>;
  handlePostLiked: (postId: string) => Promise<void>;
  setActivePostId: (postId: string | null) => void;
  addNewComment: (postId: string, content: string, parentCommentId?: string) => Promise<string | null>;
  handleCommentAdded: (postId: string) => Promise<void>;
  createPost: {
    uploadMedia: (file: File) => Promise<string | null>;
  };
  refreshData: {
    fetchPosts: () => Promise<void>;
    fetchTags: () => Promise<void>;
  };
}

// Create the context with default values
const PostsContext = createContext<PostsContextType>({
  posts: [],
  tags: [],
  loading: true,
  activePostId: null,
  activePost: null,
  activePostComments: [],
  addNewPost: async () => false,
  handlePostLiked: async () => {},
  setActivePostId: () => {},
  addNewComment: async () => null,
  handleCommentAdded: async () => {},
  createPost: {
    uploadMedia: async () => null,
  },
  refreshData: {
    fetchPosts: async () => {},
    fetchTags: async () => {},
  },
});

export const PostsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [activePost, setActivePost] = useState<Post | null>(null);
  const [activePostComments, setActivePostComments] = useState<Comment[]>([]);

  // Initialize on mount
  useEffect(() => {
    fetchTags().catch(err => console.error('Error fetching tags:', err));
  }, []);
  
  useEffect(() => {
    fetchPosts().catch(err => console.error('Error fetching posts:', err));
  }, []);
  
  // Fetch post details when activePostId changes
  useEffect(() => {
    if (activePostId) {
      fetchActivePost(activePostId).catch(err => console.error('Error fetching active post:', err));
      fetchComments(activePostId).catch(err => console.error('Error fetching comments:', err));
    } else {
      setActivePost(null);
      setActivePostComments([]);
    }
  }, [activePostId]);
  
  const fetchPosts = async () => {
    setLoading(true);
    try {
      const fetchedPosts = await getCommunityPosts();
      setPosts(fetchedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('שגיאה בטעינת הפוסטים');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchTags = async () => {
    try {
      const fetchedTags = await getAllTags();
      setTags(fetchedTags);
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };
  
  const fetchActivePost = async (postId: string) => {
    try {
      const post = await getPostById(postId);
      setActivePost(post);
    } catch (error) {
      console.error('Error fetching post details:', error);
    }
  };
  
  const fetchComments = async (postId: string) => {
    try {
      const comments = await getPostComments(postId);
      setActivePostComments(comments);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };
  
  const addNewPost = async (
    title: string, 
    content: string, 
    mediaUrls: string[] = [],
    tagIds: string[] = [],
    newTags: string[] = []
  ) => {
    if (!isAuthenticated || !user) {
      toast.error('יש להתחבר כדי לפרסם');
      return false;
    }
    
    try {
      // Create new tags if needed
      const createdTagIds: string[] = [];
      
      for (const tagName of newTags) {
        const tagId = await createTag(tagName);
        if (tagId) {
          createdTagIds.push(tagId);
          
          // Update the local tags state
          setTags(prevTags => [
            ...prevTags,
            { id: tagId, name: tagName }
          ]);
        }
      }
      
      // Combine existing and newly created tag IDs
      const allTagIds = [...tagIds, ...createdTagIds];
      
      // Create the post
      const postId = await registerCommunityPost(
        user.id,
        title,
        content,
        mediaUrls,
        allTagIds
      );
      
      if (postId) {
        // Refresh the posts list
        await fetchPosts();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('שגיאה בפרסום הפוסט');
      return false;
    }
  };
  
  const handlePostLiked = async (postId: string) => {
    if (!isAuthenticated || !user) {
      toast.error('יש להתחבר כדי לבצע פעולה זו');
      return;
    }

    try {
      await likePost(postId, user.id);
      
      // Refresh the posts to show updated like count
      await fetchPosts();
      
      // If viewing single post, refresh it too
      if (activePostId === postId && activePost) {
        await fetchActivePost(postId);
      }
    } catch (error) {
      console.error('Error liking post:', error);
      toast.error('שגיאה בהוספת לייק');
    }
  };
  
  const addNewComment = async (
    postId: string, 
    content: string,
    parentCommentId?: string
  ) => {
    if (!isAuthenticated || !user) {
      toast.error('יש להתחבר כדי להגיב');
      return null;
    }
    
    try {
      const commentId = await addComment(
        postId,
        user.id,
        content,
        parentCommentId
      );
      
      return commentId;
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('שגיאה בהוספת תגובה');
      return null;
    }
  };
  
  const handleCommentAdded = async (postId: string) => {
    // Refresh comments
    await fetchComments(postId);
    
    // Refresh posts to show updated comment count
    await fetchPosts();
    
    // If viewing single post, refresh it too
    if (activePostId === postId && activePost) {
      await fetchActivePost(postId);
    }
  };
  
  // Helper object for post creation operations
  const createPost = {
    uploadMedia: async (file: File): Promise<string | null> => {
      if (!isAuthenticated || !user) {
        toast.error('יש להתחבר כדי להעלות תמונות');
        return null;
      }
      
      return await uploadPostMedia(user.id, file);
    }
  };
  
  // Provide context value
  const value: PostsContextType = {
    posts,
    tags,
    loading,
    activePostId,
    activePost,
    activePostComments,
    addNewPost,
    handlePostLiked,
    setActivePostId,
    addNewComment,
    handleCommentAdded,
    createPost,
    refreshData: {
      fetchPosts,
      fetchTags
    }
  };
  
  return (
    <PostsContext.Provider value={value}>
      {children}
    </PostsContext.Provider>
  );
};

export const usePosts = () => {
  const context = useContext(PostsContext);
  
  if (context === undefined) {
    throw new Error('usePosts must be used within a PostsProvider');
  }
  
  return context;
};
