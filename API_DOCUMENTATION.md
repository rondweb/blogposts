# Blog API Documentation

This API provides complete CRUD operations for a multi-blog system with the following entities: Blogs, Authors, Categories, Posts, Tags, and Comments.

## Base URL
All endpoints start with `/api/`

## Response Format
All responses are JSON with the following structure:
- Success: `{ ...data }` or `[...array]`
- Error: `{ "error": "Error message" }`

## Blogs

### GET /api/blogs
Get all blogs
**Response:** Array of blog objects

### GET /api/blogs/{id}
Get a specific blog by ID
**Response:** Single blog object

### POST /api/blogs
Create a new blog
**Request Body:**
```json
{
  "Name": "string (required)",
  "Slug": "string (required)",
  "Description": "string (optional)",
  "Url": "string (optional)"
}
```

### PUT /api/blogs/{id}
Update an existing blog
**Request Body:** Same as POST

### DELETE /api/blogs/{id}
Delete a blog

---

## Authors

### GET /api/authors
Get all authors with blog information
**Response:** Array of author objects with BlogName

### GET /api/authors/{id}
Get a specific author by ID
**Response:** Single author object with blog information

### POST /api/authors
Create a new author
**Request Body:**
```json
{
  "BlogId": "number (required)",
  "Name": "string (required)",
  "Email": "string (optional)",
  "ProfileUrl": "string (optional)",
  "Bio": "string (optional)"
}
```

### PUT /api/authors/{id}
Update an existing author
**Request Body:** Same as POST

### DELETE /api/authors/{id}
Delete an author

---

## Categories

### GET /api/categories
Get all categories with blog information
**Response:** Array of category objects with BlogName

### GET /api/categories/{id}
Get a specific category by ID
**Response:** Single category object with blog information

### POST /api/categories
Create a new category
**Request Body:**
```json
{
  "BlogId": "number (required)",
  "Name": "string (required)",
  "Slug": "string (optional)"
}
```

### PUT /api/categories/{id}
Update an existing category
**Request Body:** Same as POST

### DELETE /api/categories/{id}
Delete a category

---

## Posts

### GET /api/posts
Get all posts with filtering options
**Query Parameters:**
- `blog`: Filter by BlogId
- `author`: Filter by AuthorId
- `category`: Filter by CategoryId
- `published`: Filter by published status (true/false)
- `search`: Search in title, content, and excerpt
- `limit`: Number of results (default: 50)
- `offset`: Pagination offset (default: 0)

**Response:** Array of post objects with BlogName, AuthorName, CategoryName

### GET /api/posts/{id}
Get a specific post by ID
**Response:** Single post object with related data and tags array

### POST /api/posts
Create a new post
**Request Body:**
```json
{
  "BlogId": "number (required)",
  "AuthorId": "number (optional)",
  "CategoryId": "number (optional)",
  "Title": "string (required)",
  "Slug": "string (required)",
  "Content": "string (optional)",
  "Excerpt": "string (optional)",
  "PublishedAt": "string (optional, ISO date)",
  "IsPublished": "number (0 or 1)",
  "Views": "number (default: 0)",
  "ExternalId": "string (optional)",
  "tags": "array of TagIds (optional)"
}
```

### PUT /api/posts/{id}
Update an existing post
**Request Body:** Same as POST
**Note:** Including `tags` array will replace all existing tags

### DELETE /api/posts/{id}
Delete a post

---

## Tags

### GET /api/tags
Get all tags with post counts
**Response:** Array of tag objects with PostCount

### GET /api/tags/{id}
Get a specific tag by ID
**Response:** Single tag object with post count

### POST /api/tags
Create a new tag
**Request Body:**
```json
{
  "Name": "string (required, must be unique)"
}
```

### PUT /api/tags/{id}
Update an existing tag
**Request Body:** Same as POST

### DELETE /api/tags/{id}
Delete a tag

---

## Comments

### GET /api/comments
Get all comments with filtering options
**Query Parameters:**
- `post`: Filter by PostId
- `approved`: Filter by approval status (true/false)
- `limit`: Number of results (default: 50)
- `offset`: Pagination offset (default: 0)

**Response:** Array of comment objects with PostTitle and PostSlug

### GET /api/comments/{id}
Get a specific comment by ID
**Response:** Single comment object with post information

### POST /api/comments
Create a new comment
**Request Body:**
```json
{
  "PostId": "number (required)",
  "AuthorName": "string (optional)",
  "AuthorEmail": "string (optional)",
  "Content": "string (required)",
  "IsApproved": "number (0 or 1, default: 0)",
  "ExternalId": "string (optional)"
}
```

### PUT /api/comments/{id}
Update an existing comment
**Request Body:** Same as POST

### DELETE /api/comments/{id}
Delete a comment

---

## Error Codes

- `400`: Bad Request (validation errors)
- `404`: Not Found (resource doesn't exist)
- `405`: Method Not Allowed
- `409`: Conflict (duplicate unique values)
- `500`: Internal Server Error

## Examples

### Create a blog post with tags:
```bash
curl -X POST /api/posts \
  -H "Content-Type: application/json" \
  -d '{
    "BlogId": 1,
    "AuthorId": 1,
    "CategoryId": 1,
    "Title": "My New Post",
    "Slug": "my-new-post",
    "Content": "This is the content...",
    "IsPublished": 1,
    "tags": [1, 2, 3]
  }'
```

### Search for published posts:
```bash
curl "/api/posts?published=true&search=database&limit=10"
```

### Get comments for a specific post:
```bash
curl "/api/comments?post=101&approved=true"
```

---

## Simple Post Creation

### POST /api/simple
Create posts with minimal input - just provide a blog URL and post texts
**Request Body:**
```json
{
  "blogUrl": "string (required) - The blog URL",
  "postTexts": ["array of strings (required) - Each string becomes a post"]
}
```

**Response:** 
```json
{
  "blog": { /* Blog object (created or existing) */ },
  "author": { /* Default author object */ },
  "category": { /* Default category object */ },
  "postsCreated": "number of posts created",
  "posts": [ /* Array of created post objects */ ]
}
```

**Features:**
- Automatically creates blog if it doesn't exist based on URL
- Creates default author and category if they don't exist
- Generates titles from first sentence or 50 characters of text
- Creates unique slugs with timestamps
- Auto-generates excerpts (first 150 characters)
- Publishes posts immediately
- Returns all created entities and posts

**Example:**
```bash
curl -X POST /api/simple \
  -H "Content-Type: application/json" \
  -d '{
    "blogUrl": "https://myblog.com",
    "postTexts": [
      "This is my first blog post. It contains some interesting content about web development.",
      "Here is another post about TypeScript and its benefits in modern development.",
      "A third post discussing the future of web technologies."
    ]
  }'
```