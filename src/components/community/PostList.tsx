
import React from 'react';

interface Post {
  id: string;
  title: string;
  content: string;
  author: string;
  createdAt: string;
  likes: number;
  comments: number;
}

interface PostListProps {
  posts: Post[];
}

const PostList: React.FC<PostListProps> = ({ posts }) => {
  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <div key={post.id} className="bg-card p-4 rounded-lg border">
          <h3 className="font-semibold text-lg mb-2">{post.title}</h3>
          <p className="text-muted-foreground mb-3">{post.content}</p>
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <span>מאת {post.author}</span>
            <div className="flex gap-4">
              <span>{post.likes} לייקים</span>
              <span>{post.comments} תגובות</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PostList;
