// Types for our blog entities
interface Blog {
  BlogId?: number;
  Name: string;
  Slug: string;
  Description?: string;
  Url?: string;
  CreatedAt: string;
}

interface Author {
  AuthorId?: number;
  BlogId: number;
  Name: string;
  Email?: string;
  ProfileUrl?: string;
  Bio?: string;
  CreatedAt: string;
}

interface Category {
  CategoryId?: number;
  BlogId: number;
  Name: string;
  Slug?: string;
}

interface Post {
  PostId?: number;
  BlogId: number;
  AuthorId?: number;
  CategoryId?: number;
  Title: string;
  Slug: string;
  Content?: string;
  Excerpt?: string;
  PublishedAt?: string;
  IsPublished: number;
  Views: number;
  ExternalId?: string;
  CreatedAt: string;
  UpdatedAt?: string;
}

interface Tag {
  TagId?: number;
  Name: string;
}

interface Comment {
  CommentId?: number;
  PostId: number;
  AuthorName?: string;
  AuthorEmail?: string;
  Content: string;
  CreatedAt: string;
  IsApproved: number;
  ExternalId?: string;
}

// Utility functions
function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

function createErrorResponse(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function createSuccessResponse(data: any): Response {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// Router function
async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method;
  const pathname = url.pathname;

  // Parse path segments
  const pathSegments = pathname.split('/').filter(Boolean);
  
  if (pathSegments[0] !== 'api') {
    return new Response('Blog API Server - Use /api/* endpoints', { status: 200 });
  }

  const resource = pathSegments[1];
  const id = pathSegments[2] ? parseInt(pathSegments[2]) : null;

  try {
    switch (resource) {
      case 'blogs':
        return await handleBlogs(method, id, request, env);
      case 'authors':
        return await handleAuthors(method, id, request, env);
      case 'categories':
        return await handleCategories(method, id, request, env);
      case 'posts':
        return await handlePosts(method, id, request, env, url);
      case 'tags':
        return await handleTags(method, id, request, env);
      case 'comments':
        return await handleComments(method, id, request, env);
      case 'simple':
        return await handleSimplePost(method, request, env);
      default:
        return createErrorResponse('Resource not found', 404);
    }
  } catch (error) {
    console.error('API Error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

// Blog handlers
async function handleBlogs(method: string, id: number | null, request: Request, env: Env): Promise<Response> {
  switch (method) {
    case 'GET':
      if (id) {
        // Get single blog
        const blog = await env.DB.prepare('SELECT * FROM Blogs WHERE BlogId = ?').bind(id).first();
        if (!blog) {
          return createErrorResponse('Blog not found', 404);
        }
        return createSuccessResponse(blog);
      } else {
        // Get all blogs
        const { results } = await env.DB.prepare('SELECT * FROM Blogs ORDER BY CreatedAt DESC').all();
        return createSuccessResponse(results);
      }
    
    case 'POST':
      const blogData = await request.json() as Blog;
      if (!blogData.Name || !blogData.Slug) {
        return createErrorResponse('Name and Slug are required');
      }
      
      blogData.CreatedAt = getCurrentTimestamp();
      
      const insertBlogResult = await env.DB.prepare(`
        INSERT INTO Blogs (Name, Slug, Description, Url, CreatedAt)
        VALUES (?, ?, ?, ?, ?)
      `).bind(
        blogData.Name,
        blogData.Slug,
        blogData.Description || null,
        blogData.Url || null,
        blogData.CreatedAt
      ).run();
      
      const newBlog = await env.DB.prepare('SELECT * FROM Blogs WHERE BlogId = ?')
        .bind(insertBlogResult.meta.last_row_id).first();
      
      return createSuccessResponse(newBlog);
    
    case 'PUT':
      if (!id) {
        return createErrorResponse('Blog ID is required for update');
      }
      
      const updateBlogData = await request.json() as Blog;
      if (!updateBlogData.Name || !updateBlogData.Slug) {
        return createErrorResponse('Name and Slug are required');
      }
      
      await env.DB.prepare(`
        UPDATE Blogs 
        SET Name = ?, Slug = ?, Description = ?, Url = ?
        WHERE BlogId = ?
      `).bind(
        updateBlogData.Name,
        updateBlogData.Slug,
        updateBlogData.Description || null,
        updateBlogData.Url || null,
        id
      ).run();
      
      const updatedBlog = await env.DB.prepare('SELECT * FROM Blogs WHERE BlogId = ?').bind(id).first();
      return createSuccessResponse(updatedBlog);
    
    case 'DELETE':
      if (!id) {
        return createErrorResponse('Blog ID is required for deletion');
      }
      
      await env.DB.prepare('DELETE FROM Blogs WHERE BlogId = ?').bind(id).run();
      return createSuccessResponse({ message: 'Blog deleted successfully' });
    
    default:
      return createErrorResponse('Method not allowed', 405);
  }
}

// Authors handlers
async function handleAuthors(method: string, id: number | null, request: Request, env: Env): Promise<Response> {
  switch (method) {
    case 'GET':
      if (id) {
        // Get single author
        const author = await env.DB.prepare(`
          SELECT a.*, b.Name as BlogName 
          FROM Authors a 
          LEFT JOIN Blogs b ON a.BlogId = b.BlogId 
          WHERE a.AuthorId = ?
        `).bind(id).first();
        
        if (!author) {
          return createErrorResponse('Author not found', 404);
        }
        return createSuccessResponse(author);
      } else {
        // Get all authors with blog info
        const { results } = await env.DB.prepare(`
          SELECT a.*, b.Name as BlogName 
          FROM Authors a 
          LEFT JOIN Blogs b ON a.BlogId = b.BlogId 
          ORDER BY a.CreatedAt DESC
        `).all();
        return createSuccessResponse(results);
      }
    
    case 'POST':
      const authorData = await request.json() as Author;
      if (!authorData.Name || !authorData.BlogId) {
        return createErrorResponse('Name and BlogId are required');
      }
      
      // Verify blog exists
      const blog = await env.DB.prepare('SELECT BlogId FROM Blogs WHERE BlogId = ?').bind(authorData.BlogId).first();
      if (!blog) {
        return createErrorResponse('Blog not found', 404);
      }
      
      authorData.CreatedAt = getCurrentTimestamp();
      
      const insertAuthorResult = await env.DB.prepare(`
        INSERT INTO Authors (BlogId, Name, Email, ProfileUrl, Bio, CreatedAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        authorData.BlogId,
        authorData.Name,
        authorData.Email || null,
        authorData.ProfileUrl || null,
        authorData.Bio || null,
        authorData.CreatedAt
      ).run();
      
      const newAuthor = await env.DB.prepare(`
        SELECT a.*, b.Name as BlogName 
        FROM Authors a 
        LEFT JOIN Blogs b ON a.BlogId = b.BlogId 
        WHERE a.AuthorId = ?
      `).bind(insertAuthorResult.meta.last_row_id).first();
      
      return createSuccessResponse(newAuthor);
    
    case 'PUT':
      if (!id) {
        return createErrorResponse('Author ID is required for update');
      }
      
      const updateAuthorData = await request.json() as Author;
      if (!updateAuthorData.Name || !updateAuthorData.BlogId) {
        return createErrorResponse('Name and BlogId are required');
      }
      
      // Verify blog exists
      const blogExists = await env.DB.prepare('SELECT BlogId FROM Blogs WHERE BlogId = ?').bind(updateAuthorData.BlogId).first();
      if (!blogExists) {
        return createErrorResponse('Blog not found', 404);
      }
      
      await env.DB.prepare(`
        UPDATE Authors 
        SET BlogId = ?, Name = ?, Email = ?, ProfileUrl = ?, Bio = ?
        WHERE AuthorId = ?
      `).bind(
        updateAuthorData.BlogId,
        updateAuthorData.Name,
        updateAuthorData.Email || null,
        updateAuthorData.ProfileUrl || null,
        updateAuthorData.Bio || null,
        id
      ).run();
      
      const updatedAuthor = await env.DB.prepare(`
        SELECT a.*, b.Name as BlogName 
        FROM Authors a 
        LEFT JOIN Blogs b ON a.BlogId = b.BlogId 
        WHERE a.AuthorId = ?
      `).bind(id).first();
      
      return createSuccessResponse(updatedAuthor);
    
    case 'DELETE':
      if (!id) {
        return createErrorResponse('Author ID is required for deletion');
      }
      
      await env.DB.prepare('DELETE FROM Authors WHERE AuthorId = ?').bind(id).run();
      return createSuccessResponse({ message: 'Author deleted successfully' });
    
    default:
      return createErrorResponse('Method not allowed', 405);
  }
}

// Categories handlers
async function handleCategories(method: string, id: number | null, request: Request, env: Env): Promise<Response> {
  switch (method) {
    case 'GET':
      if (id) {
        // Get single category
        const category = await env.DB.prepare(`
          SELECT c.*, b.Name as BlogName 
          FROM Categories c 
          LEFT JOIN Blogs b ON c.BlogId = b.BlogId 
          WHERE c.CategoryId = ?
        `).bind(id).first();
        
        if (!category) {
          return createErrorResponse('Category not found', 404);
        }
        return createSuccessResponse(category);
      } else {
        // Get all categories with blog info
        const { results } = await env.DB.prepare(`
          SELECT c.*, b.Name as BlogName 
          FROM Categories c 
          LEFT JOIN Blogs b ON c.BlogId = b.BlogId 
          ORDER BY c.Name
        `).all();
        return createSuccessResponse(results);
      }
    
    case 'POST':
      const categoryData = await request.json() as Category;
      if (!categoryData.Name || !categoryData.BlogId) {
        return createErrorResponse('Name and BlogId are required');
      }
      
      // Verify blog exists
      const blog = await env.DB.prepare('SELECT BlogId FROM Blogs WHERE BlogId = ?').bind(categoryData.BlogId).first();
      if (!blog) {
        return createErrorResponse('Blog not found', 404);
      }
      
      const insertCategoryResult = await env.DB.prepare(`
        INSERT INTO Categories (BlogId, Name, Slug)
        VALUES (?, ?, ?)
      `).bind(
        categoryData.BlogId,
        categoryData.Name,
        categoryData.Slug || null
      ).run();
      
      const newCategory = await env.DB.prepare(`
        SELECT c.*, b.Name as BlogName 
        FROM Categories c 
        LEFT JOIN Blogs b ON c.BlogId = b.BlogId 
        WHERE c.CategoryId = ?
      `).bind(insertCategoryResult.meta.last_row_id).first();
      
      return createSuccessResponse(newCategory);
    
    case 'PUT':
      if (!id) {
        return createErrorResponse('Category ID is required for update');
      }
      
      const updateCategoryData = await request.json() as Category;
      if (!updateCategoryData.Name || !updateCategoryData.BlogId) {
        return createErrorResponse('Name and BlogId are required');
      }
      
      // Verify blog exists
      const blogExists = await env.DB.prepare('SELECT BlogId FROM Blogs WHERE BlogId = ?').bind(updateCategoryData.BlogId).first();
      if (!blogExists) {
        return createErrorResponse('Blog not found', 404);
      }
      
      await env.DB.prepare(`
        UPDATE Categories 
        SET BlogId = ?, Name = ?, Slug = ?
        WHERE CategoryId = ?
      `).bind(
        updateCategoryData.BlogId,
        updateCategoryData.Name,
        updateCategoryData.Slug || null,
        id
      ).run();
      
      const updatedCategory = await env.DB.prepare(`
        SELECT c.*, b.Name as BlogName 
        FROM Categories c 
        LEFT JOIN Blogs b ON c.BlogId = b.BlogId 
        WHERE c.CategoryId = ?
      `).bind(id).first();
      
      return createSuccessResponse(updatedCategory);
    
    case 'DELETE':
      if (!id) {
        return createErrorResponse('Category ID is required for deletion');
      }
      
      await env.DB.prepare('DELETE FROM Categories WHERE CategoryId = ?').bind(id).run();
      return createSuccessResponse({ message: 'Category deleted successfully' });
    
    default:
      return createErrorResponse('Method not allowed', 405);
  }
}

// Posts handlers
async function handlePosts(method: string, id: number | null, request: Request, env: Env, url: URL): Promise<Response> {
  switch (method) {
    case 'GET':
      if (id) {
        // Get single post with all relations and tags
        const post = await env.DB.prepare(`
          SELECT p.*, 
                 b.Name as BlogName, 
                 a.Name as AuthorName, 
                 c.Name as CategoryName
          FROM Posts p 
          LEFT JOIN Blogs b ON p.BlogId = b.BlogId 
          LEFT JOIN Authors a ON p.AuthorId = a.AuthorId 
          LEFT JOIN Categories c ON p.CategoryId = c.CategoryId 
          WHERE p.PostId = ?
        `).bind(id).first();
        
        if (!post) {
          return createErrorResponse('Post not found', 404);
        }
        
        // Get tags for this post
        const { results: postTags } = await env.DB.prepare(`
          SELECT t.TagId, t.Name 
          FROM Tags t 
          JOIN PostTags pt ON t.TagId = pt.TagId 
          WHERE pt.PostId = ?
        `).bind(id).all();
        
        return createSuccessResponse({ ...post, tags: postTags });
      } else {
        // Get all posts with filtering
        const blogId = url.searchParams.get('blog');
        const authorId = url.searchParams.get('author');
        const categoryId = url.searchParams.get('category');
        const published = url.searchParams.get('published');
        const search = url.searchParams.get('search');
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const offset = parseInt(url.searchParams.get('offset') || '0');
        
        let query = `
          SELECT p.*, 
                 b.Name as BlogName, 
                 a.Name as AuthorName, 
                 c.Name as CategoryName
          FROM Posts p 
          LEFT JOIN Blogs b ON p.BlogId = b.BlogId 
          LEFT JOIN Authors a ON p.AuthorId = a.AuthorId 
          LEFT JOIN Categories c ON p.CategoryId = c.CategoryId 
          WHERE 1=1
        `;
        
        const bindings: any[] = [];
        
        if (blogId) {
          query += ' AND p.BlogId = ?';
          bindings.push(parseInt(blogId));
        }
        
        if (authorId) {
          query += ' AND p.AuthorId = ?';
          bindings.push(parseInt(authorId));
        }
        
        if (categoryId) {
          query += ' AND p.CategoryId = ?';
          bindings.push(parseInt(categoryId));
        }
        
        if (published) {
          query += ' AND p.IsPublished = ?';
          bindings.push(published === 'true' ? 1 : 0);
        }
        
        if (search) {
          query += ' AND (p.Title LIKE ? OR p.Content LIKE ? OR p.Excerpt LIKE ?)';
          const searchTerm = `%${search}%`;
          bindings.push(searchTerm, searchTerm, searchTerm);
        }
        
        query += ' ORDER BY p.CreatedAt DESC LIMIT ? OFFSET ?';
        bindings.push(limit, offset);
        
        const { results } = await env.DB.prepare(query).bind(...bindings).all();
        return createSuccessResponse(results);
      }
    
    case 'POST':
      const postData = await request.json() as Post & { tags?: number[] };
      if (!postData.Title || !postData.Slug || !postData.BlogId) {
        return createErrorResponse('Title, Slug, and BlogId are required');
      }
      
      // Verify blog exists
      const blog = await env.DB.prepare('SELECT BlogId FROM Blogs WHERE BlogId = ?').bind(postData.BlogId).first();
      if (!blog) {
        return createErrorResponse('Blog not found', 404);
      }
      
      // Verify author exists if provided
      if (postData.AuthorId) {
        const author = await env.DB.prepare('SELECT AuthorId FROM Authors WHERE AuthorId = ?').bind(postData.AuthorId).first();
        if (!author) {
          return createErrorResponse('Author not found', 404);
        }
      }
      
      // Verify category exists if provided
      if (postData.CategoryId) {
        const category = await env.DB.prepare('SELECT CategoryId FROM Categories WHERE CategoryId = ?').bind(postData.CategoryId).first();
        if (!category) {
          return createErrorResponse('Category not found', 404);
        }
      }
      
      postData.CreatedAt = getCurrentTimestamp();
      if (postData.IsPublished && !postData.PublishedAt) {
        postData.PublishedAt = getCurrentTimestamp();
      }
      
      const insertPostResult = await env.DB.prepare(`
        INSERT INTO Posts (BlogId, AuthorId, CategoryId, Title, Slug, Content, Excerpt, 
                          PublishedAt, IsPublished, Views, ExternalId, CreatedAt, UpdatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        postData.BlogId,
        postData.AuthorId || null,
        postData.CategoryId || null,
        postData.Title,
        postData.Slug,
        postData.Content || null,
        postData.Excerpt || null,
        postData.PublishedAt || null,
        postData.IsPublished || 0,
        postData.Views || 0,
        postData.ExternalId || null,
        postData.CreatedAt,
        postData.UpdatedAt || null
      ).run();
      
      const newPostId = insertPostResult.meta.last_row_id;
      
      // Add tags if provided
      if (postData.tags && postData.tags.length > 0) {
        for (const tagId of postData.tags) {
          await env.DB.prepare('INSERT INTO PostTags (PostId, TagId) VALUES (?, ?)')
            .bind(newPostId, tagId).run();
        }
      }
      
      // Return the new post with relations
      const newPost = await env.DB.prepare(`
        SELECT p.*, 
               b.Name as BlogName, 
               a.Name as AuthorName, 
               c.Name as CategoryName
        FROM Posts p 
        LEFT JOIN Blogs b ON p.BlogId = b.BlogId 
        LEFT JOIN Authors a ON p.AuthorId = a.AuthorId 
        LEFT JOIN Categories c ON p.CategoryId = c.CategoryId 
        WHERE p.PostId = ?
      `).bind(newPostId).first();
      
      return createSuccessResponse(newPost);
    
    case 'PUT':
      if (!id) {
        return createErrorResponse('Post ID is required for update');
      }
      
      const updatePostData = await request.json() as Post & { tags?: number[] };
      if (!updatePostData.Title || !updatePostData.Slug || !updatePostData.BlogId) {
        return createErrorResponse('Title, Slug, and BlogId are required');
      }
      
      // Verify references exist
      const blogExists = await env.DB.prepare('SELECT BlogId FROM Blogs WHERE BlogId = ?').bind(updatePostData.BlogId).first();
      if (!blogExists) {
        return createErrorResponse('Blog not found', 404);
      }
      
      if (updatePostData.AuthorId) {
        const authorExists = await env.DB.prepare('SELECT AuthorId FROM Authors WHERE AuthorId = ?').bind(updatePostData.AuthorId).first();
        if (!authorExists) {
          return createErrorResponse('Author not found', 404);
        }
      }
      
      if (updatePostData.CategoryId) {
        const categoryExists = await env.DB.prepare('SELECT CategoryId FROM Categories WHERE CategoryId = ?').bind(updatePostData.CategoryId).first();
        if (!categoryExists) {
          return createErrorResponse('Category not found', 404);
        }
      }
      
      updatePostData.UpdatedAt = getCurrentTimestamp();
      if (updatePostData.IsPublished && !updatePostData.PublishedAt) {
        updatePostData.PublishedAt = getCurrentTimestamp();
      }
      
      await env.DB.prepare(`
        UPDATE Posts 
        SET BlogId = ?, AuthorId = ?, CategoryId = ?, Title = ?, Slug = ?, 
            Content = ?, Excerpt = ?, PublishedAt = ?, IsPublished = ?, 
            Views = ?, ExternalId = ?, UpdatedAt = ?
        WHERE PostId = ?
      `).bind(
        updatePostData.BlogId,
        updatePostData.AuthorId || null,
        updatePostData.CategoryId || null,
        updatePostData.Title,
        updatePostData.Slug,
        updatePostData.Content || null,
        updatePostData.Excerpt || null,
        updatePostData.PublishedAt || null,
        updatePostData.IsPublished || 0,
        updatePostData.Views || 0,
        updatePostData.ExternalId || null,
        updatePostData.UpdatedAt,
        id
      ).run();
      
      // Update tags if provided
      if (updatePostData.tags !== undefined) {
        // Remove existing tags
        await env.DB.prepare('DELETE FROM PostTags WHERE PostId = ?').bind(id).run();
        
        // Add new tags
        if (updatePostData.tags.length > 0) {
          for (const tagId of updatePostData.tags) {
            await env.DB.prepare('INSERT INTO PostTags (PostId, TagId) VALUES (?, ?)')
              .bind(id, tagId).run();
          }
        }
      }
      
      const updatedPost = await env.DB.prepare(`
        SELECT p.*, 
               b.Name as BlogName, 
               a.Name as AuthorName, 
               c.Name as CategoryName
        FROM Posts p 
        LEFT JOIN Blogs b ON p.BlogId = b.BlogId 
        LEFT JOIN Authors a ON p.AuthorId = a.AuthorId 
        LEFT JOIN Categories c ON p.CategoryId = c.CategoryId 
        WHERE p.PostId = ?
      `).bind(id).first();
      
      return createSuccessResponse(updatedPost);
    
    case 'DELETE':
      if (!id) {
        return createErrorResponse('Post ID is required for deletion');
      }
      
      // PostTags will be deleted automatically due to CASCADE
      await env.DB.prepare('DELETE FROM Posts WHERE PostId = ?').bind(id).run();
      return createSuccessResponse({ message: 'Post deleted successfully' });
    
    default:
      return createErrorResponse('Method not allowed', 405);
  }
}

// Tags handlers
async function handleTags(method: string, id: number | null, request: Request, env: Env): Promise<Response> {
  switch (method) {
    case 'GET':
      if (id) {
        // Get single tag with post count
        const tag = await env.DB.prepare(`
          SELECT t.*, COUNT(pt.PostId) as PostCount
          FROM Tags t 
          LEFT JOIN PostTags pt ON t.TagId = pt.TagId 
          WHERE t.TagId = ? 
          GROUP BY t.TagId
        `).bind(id).first();
        
        if (!tag) {
          return createErrorResponse('Tag not found', 404);
        }
        return createSuccessResponse(tag);
      } else {
        // Get all tags with post counts
        const { results } = await env.DB.prepare(`
          SELECT t.*, COUNT(pt.PostId) as PostCount
          FROM Tags t 
          LEFT JOIN PostTags pt ON t.TagId = pt.TagId 
          GROUP BY t.TagId 
          ORDER BY t.Name
        `).all();
        return createSuccessResponse(results);
      }
    
    case 'POST':
      const tagData = await request.json() as Tag;
      if (!tagData.Name) {
        return createErrorResponse('Name is required');
      }
      
      // Check if tag already exists
      const existingTag = await env.DB.prepare('SELECT TagId FROM Tags WHERE Name = ?').bind(tagData.Name).first();
      if (existingTag) {
        return createErrorResponse('Tag with this name already exists', 409);
      }
      
      const insertTagResult = await env.DB.prepare(`
        INSERT INTO Tags (Name) VALUES (?)
      `).bind(tagData.Name).run();
      
      const newTag = await env.DB.prepare(`
        SELECT t.*, 0 as PostCount 
        FROM Tags t 
        WHERE t.TagId = ?
      `).bind(insertTagResult.meta.last_row_id).first();
      
      return createSuccessResponse(newTag);
    
    case 'PUT':
      if (!id) {
        return createErrorResponse('Tag ID is required for update');
      }
      
      const updateTagData = await request.json() as Tag;
      if (!updateTagData.Name) {
        return createErrorResponse('Name is required');
      }
      
      // Check if another tag with this name already exists
      const existingTagUpdate = await env.DB.prepare('SELECT TagId FROM Tags WHERE Name = ? AND TagId != ?')
        .bind(updateTagData.Name, id).first();
      if (existingTagUpdate) {
        return createErrorResponse('Tag with this name already exists', 409);
      }
      
      await env.DB.prepare(`UPDATE Tags SET Name = ? WHERE TagId = ?`)
        .bind(updateTagData.Name, id).run();
      
      const updatedTag = await env.DB.prepare(`
        SELECT t.*, COUNT(pt.PostId) as PostCount
        FROM Tags t 
        LEFT JOIN PostTags pt ON t.TagId = pt.TagId 
        WHERE t.TagId = ? 
        GROUP BY t.TagId
      `).bind(id).first();
      
      return createSuccessResponse(updatedTag);
    
    case 'DELETE':
      if (!id) {
        return createErrorResponse('Tag ID is required for deletion');
      }
      
      // PostTags associations will be deleted automatically due to CASCADE
      await env.DB.prepare('DELETE FROM Tags WHERE TagId = ?').bind(id).run();
      return createSuccessResponse({ message: 'Tag deleted successfully' });
    
    default:
      return createErrorResponse('Method not allowed', 405);
  }
}

// Comments handlers
async function handleComments(method: string, id: number | null, request: Request, env: Env): Promise<Response> {
  switch (method) {
    case 'GET':
      if (id) {
        // Get single comment with post info
        const comment = await env.DB.prepare(`
          SELECT c.*, p.Title as PostTitle, p.Slug as PostSlug
          FROM Comments c 
          LEFT JOIN Posts p ON c.PostId = p.PostId 
          WHERE c.CommentId = ?
        `).bind(id).first();
        
        if (!comment) {
          return createErrorResponse('Comment not found', 404);
        }
        return createSuccessResponse(comment);
      } else {
        // Get all comments with post info, with optional filtering
        const url = new URL(request.url);
        const postId = url.searchParams.get('post');
        const approved = url.searchParams.get('approved');
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const offset = parseInt(url.searchParams.get('offset') || '0');
        
        let query = `
          SELECT c.*, p.Title as PostTitle, p.Slug as PostSlug
          FROM Comments c 
          LEFT JOIN Posts p ON c.PostId = p.PostId 
          WHERE 1=1
        `;
        
        const bindings: any[] = [];
        
        if (postId) {
          query += ' AND c.PostId = ?';
          bindings.push(parseInt(postId));
        }
        
        if (approved) {
          query += ' AND c.IsApproved = ?';
          bindings.push(approved === 'true' ? 1 : 0);
        }
        
        query += ' ORDER BY c.CreatedAt DESC LIMIT ? OFFSET ?';
        bindings.push(limit, offset);
        
        const { results } = await env.DB.prepare(query).bind(...bindings).all();
        return createSuccessResponse(results);
      }
    
    case 'POST':
      const commentData = await request.json() as Comment;
      if (!commentData.Content || !commentData.PostId) {
        return createErrorResponse('Content and PostId are required');
      }
      
      // Verify post exists
      const post = await env.DB.prepare('SELECT PostId FROM Posts WHERE PostId = ?').bind(commentData.PostId).first();
      if (!post) {
        return createErrorResponse('Post not found', 404);
      }
      
      commentData.CreatedAt = getCurrentTimestamp();
      
      const insertCommentResult = await env.DB.prepare(`
        INSERT INTO Comments (PostId, AuthorName, AuthorEmail, Content, CreatedAt, IsApproved, ExternalId)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        commentData.PostId,
        commentData.AuthorName || null,
        commentData.AuthorEmail || null,
        commentData.Content,
        commentData.CreatedAt,
        commentData.IsApproved || 0,
        commentData.ExternalId || null
      ).run();
      
      const newComment = await env.DB.prepare(`
        SELECT c.*, p.Title as PostTitle, p.Slug as PostSlug
        FROM Comments c 
        LEFT JOIN Posts p ON c.PostId = p.PostId 
        WHERE c.CommentId = ?
      `).bind(insertCommentResult.meta.last_row_id).first();
      
      return createSuccessResponse(newComment);
    
    case 'PUT':
      if (!id) {
        return createErrorResponse('Comment ID is required for update');
      }
      
      const updateCommentData = await request.json() as Comment;
      if (!updateCommentData.Content || !updateCommentData.PostId) {
        return createErrorResponse('Content and PostId are required');
      }
      
      // Verify post exists
      const postExists = await env.DB.prepare('SELECT PostId FROM Posts WHERE PostId = ?').bind(updateCommentData.PostId).first();
      if (!postExists) {
        return createErrorResponse('Post not found', 404);
      }
      
      await env.DB.prepare(`
        UPDATE Comments 
        SET PostId = ?, AuthorName = ?, AuthorEmail = ?, Content = ?, IsApproved = ?, ExternalId = ?
        WHERE CommentId = ?
      `).bind(
        updateCommentData.PostId,
        updateCommentData.AuthorName || null,
        updateCommentData.AuthorEmail || null,
        updateCommentData.Content,
        updateCommentData.IsApproved || 0,
        updateCommentData.ExternalId || null,
        id
      ).run();
      
      const updatedComment = await env.DB.prepare(`
        SELECT c.*, p.Title as PostTitle, p.Slug as PostSlug
        FROM Comments c 
        LEFT JOIN Posts p ON c.PostId = p.PostId 
        WHERE c.CommentId = ?
      `).bind(id).first();
      
      return createSuccessResponse(updatedComment);
    
    case 'DELETE':
      if (!id) {
        return createErrorResponse('Comment ID is required for deletion');
      }
      
      await env.DB.prepare('DELETE FROM Comments WHERE CommentId = ?').bind(id).run();
      return createSuccessResponse({ message: 'Comment deleted successfully' });
    
    default:
      return createErrorResponse('Method not allowed', 405);
  }
}

// Simple post handler - creates posts with minimal input
async function handleSimplePost(method: string, request: Request, env: Env): Promise<Response> {
  if (method !== 'POST') {
    return createErrorResponse('Only POST method allowed for simple posts', 405);
  }

  try {
    const requestData = await request.json() as {
      blogUrl: string;
      postTexts: string[];
    };

    if (!requestData.blogUrl || !requestData.postTexts || !Array.isArray(requestData.postTexts)) {
      return createErrorResponse('blogUrl (string) and postTexts (array) are required');
    }

    if (requestData.postTexts.length === 0) {
      return createErrorResponse('At least one post text is required');
    }

    // Find or create blog based on URL
    let blog = await env.DB.prepare('SELECT * FROM Blogs WHERE Url = ?').bind(requestData.blogUrl).first();
    
    if (!blog) {
      // Create a default blog from the URL
      const urlObj = new URL(requestData.blogUrl);
      const blogName = urlObj.hostname.replace('www.', '').replace(/\.[^/.]+$/, ''); // Remove www and extension
      const blogSlug = blogName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      
      const insertBlogResult = await env.DB.prepare(`
        INSERT INTO Blogs (Name, Slug, Description, Url, CreatedAt)
        VALUES (?, ?, ?, ?, ?)
      `).bind(
        blogName.charAt(0).toUpperCase() + blogName.slice(1), // Capitalize first letter
        blogSlug,
        `Auto-created blog for ${urlObj.hostname}`,
        requestData.blogUrl,
        getCurrentTimestamp()
      ).run();

      blog = await env.DB.prepare('SELECT * FROM Blogs WHERE BlogId = ?')
        .bind(insertBlogResult.meta.last_row_id).first();
    }

    if (!blog) {
      return createErrorResponse('Failed to create or find blog', 500);
    }

    // Find or create a default author for this blog
    let author = await env.DB.prepare('SELECT * FROM Authors WHERE BlogId = ? LIMIT 1').bind(blog.BlogId).first();
    
    if (!author) {
      const insertAuthorResult = await env.DB.prepare(`
        INSERT INTO Authors (BlogId, Name, Email, Bio, CreatedAt)
        VALUES (?, ?, ?, ?, ?)
      `).bind(
        blog.BlogId,
        'Default Author',
        'author@' + new URL(requestData.blogUrl).hostname,
        'Auto-created default author',
        getCurrentTimestamp()
      ).run();

      author = await env.DB.prepare('SELECT * FROM Authors WHERE AuthorId = ?')
        .bind(insertAuthorResult.meta.last_row_id).first();
    }

    if (!author) {
      return createErrorResponse('Failed to create or find author', 500);
    }

    // Find or create a default category
    let category = await env.DB.prepare('SELECT * FROM Categories WHERE BlogId = ? LIMIT 1').bind(blog.BlogId).first();
    
    if (!category) {
      const insertCategoryResult = await env.DB.prepare(`
        INSERT INTO Categories (BlogId, Name, Slug)
        VALUES (?, ?, ?)
      `).bind(
        blog.BlogId,
        'General',
        'general'
      ).run();

      category = await env.DB.prepare('SELECT * FROM Categories WHERE CategoryId = ?')
        .bind(insertCategoryResult.meta.last_row_id).first();
    }

    if (!category) {
      return createErrorResponse('Failed to create or find category', 500);
    }

    const createdPosts = [];

    // Create posts from the provided texts
    for (let i = 0; i < requestData.postTexts.length; i++) {
      const postText = requestData.postTexts[i].trim();
      if (!postText) continue;

      // Generate title from first 50 characters or first sentence
      let title = postText.split(/[.!?]/)[0].substring(0, 50).trim();
      if (title.length === 50 && !title.endsWith('...')) {
        title += '...';
      }
      if (!title) {
        title = `Post ${i + 1}`;
      }

      // Generate slug from title
      const slug = title.toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '') + '-' + Date.now() + '-' + i;

      // Generate excerpt (first 150 characters)
      const excerpt = postText.length > 150 
        ? postText.substring(0, 150).trim() + '...'
        : postText;

      const currentTime = getCurrentTimestamp();

      const insertPostResult = await env.DB.prepare(`
        INSERT INTO Posts (BlogId, AuthorId, CategoryId, Title, Slug, Content, Excerpt, 
                          PublishedAt, IsPublished, Views, CreatedAt, UpdatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        blog.BlogId,
        author.AuthorId,
        category.CategoryId,
        title,
        slug,
        postText,
        excerpt,
        currentTime, // Auto-publish
        1, // Published
        0, // Initial views
        currentTime,
        currentTime
      ).run();

      const newPost = await env.DB.prepare(`
        SELECT p.*, 
               b.Name as BlogName, 
               a.Name as AuthorName, 
               c.Name as CategoryName
        FROM Posts p 
        LEFT JOIN Blogs b ON p.BlogId = b.BlogId 
        LEFT JOIN Authors a ON p.AuthorId = a.AuthorId 
        LEFT JOIN Categories c ON p.CategoryId = c.CategoryId 
        WHERE p.PostId = ?
      `).bind(insertPostResult.meta.last_row_id).first();

      createdPosts.push(newPost);
    }

    return createSuccessResponse({
      blog: blog,
      author: author,
      category: category,
      postsCreated: createdPosts.length,
      posts: createdPosts
    });

  } catch (error) {
    console.error('Simple post creation error:', error);
    return createErrorResponse('Failed to create posts', 500);
  }
}

export default {
  async fetch(request, env): Promise<Response> {
    return await handleRequest(request, env);
  },
} satisfies ExportedHandler<Env>;
