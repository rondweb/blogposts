DROP TABLE IF EXISTS Customers;
-- CREATE TABLE IF NOT EXISTS Customers (CustomerId INTEGER PRIMARY KEY, CompanyName TEXT, ContactName TEXT);
-- INSERT INTO Customers (CustomerID, CompanyName, ContactName) VALUES (1, 'Alfreds Futterkiste', 'Maria Anders'), (4, 'Around the Horn', 'Thomas Hardy'), (11, 'Bs Beverages', 'Victoria Ashworth'), (13, 'Bs Beverages', 'Random Name');

PRAGMA foreign_keys = ON;

-- Drop existing backup schema tables if present
DROP TABLE IF EXISTS PostTags;
DROP TABLE IF EXISTS Tags;
DROP TABLE IF EXISTS Comments;
DROP TABLE IF EXISTS Posts;
DROP TABLE IF EXISTS Categories;
DROP TABLE IF EXISTS Authors;
DROP TABLE IF EXISTS Blogs;
DROP TABLE IF EXISTS Backups;

-- Core schema for many-blog backup
CREATE TABLE IF NOT EXISTS Blogs (
    BlogId INTEGER PRIMARY KEY,
    Name TEXT NOT NULL,
    Slug TEXT UNIQUE NOT NULL,
    Description TEXT,
    Url TEXT,
    CreatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS Authors (
    AuthorId INTEGER PRIMARY KEY,
    BlogId INTEGER NOT NULL,
    Name TEXT NOT NULL,
    Email TEXT,
    ProfileUrl TEXT,
    Bio TEXT,
    CreatedAt TEXT NOT NULL,
    FOREIGN KEY(BlogId) REFERENCES Blogs(BlogId) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Categories (
    CategoryId INTEGER PRIMARY KEY,
    BlogId INTEGER NOT NULL,
    Name TEXT NOT NULL,
    Slug TEXT,
    FOREIGN KEY(BlogId) REFERENCES Blogs(BlogId) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Posts (
    PostId INTEGER PRIMARY KEY,
    BlogId INTEGER NOT NULL,
    AuthorId INTEGER,
    CategoryId INTEGER,
    Title TEXT NOT NULL,
    Slug TEXT NOT NULL,
    Content TEXT,
    Excerpt TEXT,
    PublishedAt TEXT,
    IsPublished INTEGER DEFAULT 0,
    Views INTEGER DEFAULT 0,
    ExternalId TEXT, -- original id from source service if any
    CreatedAt TEXT NOT NULL,
    UpdatedAt TEXT,
    FOREIGN KEY(BlogId) REFERENCES Blogs(BlogId) ON DELETE CASCADE,
    FOREIGN KEY(AuthorId) REFERENCES Authors(AuthorId),
    FOREIGN KEY(CategoryId) REFERENCES Categories(CategoryId)
);

CREATE TABLE IF NOT EXISTS Tags (
    TagId INTEGER PRIMARY KEY,
    Name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS PostTags (
    PostId INTEGER NOT NULL,
    TagId INTEGER NOT NULL,
    PRIMARY KEY (PostId, TagId),
    FOREIGN KEY(PostId) REFERENCES Posts(PostId) ON DELETE CASCADE,
    FOREIGN KEY(TagId) REFERENCES Tags(TagId) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Comments (
    CommentId INTEGER PRIMARY KEY,
    PostId INTEGER NOT NULL,
    AuthorName TEXT,
    AuthorEmail TEXT,
    Content TEXT NOT NULL,
    CreatedAt TEXT NOT NULL,
    IsApproved INTEGER DEFAULT 0,
    ExternalId TEXT,
    FOREIGN KEY(PostId) REFERENCES Posts(PostId) ON DELETE CASCADE
);

-- Optional backups metadata table to track snapshot exports
CREATE TABLE IF NOT EXISTS Backups (
    BackupId INTEGER PRIMARY KEY,
    ExportedAt TEXT NOT NULL,
    Source TEXT,
    Note TEXT
);

-- Indexes to speed common queries
CREATE INDEX IF NOT EXISTS idx_posts_blog ON Posts(BlogId);
CREATE INDEX IF NOT EXISTS idx_posts_author ON Posts(AuthorId);
CREATE INDEX IF NOT EXISTS idx_tags_name ON Tags(Name);

-- Seed data: a small multi-blog dataset to act as a backup sample

-- Blogs
INSERT INTO Blogs (BlogId, Name, Slug, Description, Url, CreatedAt) VALUES
    (1, 'Tech Thoughts', 'tech-thoughts', 'Personal essays on software, devops, and tooling', 'https://tech.example.com', '2020-01-10T08:00:00Z'),
    (2, 'Travel Diaries', 'travel-diaries', 'Stories and guides from trips around the world', 'https://travel.example.com', '2019-05-21T09:30:00Z'),
    (3, 'Food & Recipes', 'food-recipes', 'Recipes, reviews, and kitchen tips', 'https://food.example.com', '2021-03-15T07:45:00Z');

-- Authors
INSERT INTO Authors (AuthorId, BlogId, Name, Email, ProfileUrl, Bio, CreatedAt) VALUES
    (1, 1, 'Ava Martin', 'ava@tech.example.com', 'https://tech.example.com/authors/ava', 'Engineer and writer.', '2020-01-11T10:00:00Z'),
    (2, 1, 'Liam Chen', 'liam@tech.example.com', 'https://tech.example.com/authors/liam', 'DevOps enthusiast.', '2020-06-01T12:00:00Z'),
    (3, 2, 'Sofia Rossi', 'sofia@travel.example.com', 'https://travel.example.com/authors/sofia', 'Backpacker and photographer.', '2019-05-22T08:15:00Z'),
    (4, 3, 'Mateo Garcia', 'mateo@food.example.com', 'https://food.example.com/authors/mateo', 'Home cook and recipe developer.', '2021-03-16T11:20:00Z');

-- Categories
INSERT INTO Categories (CategoryId, BlogId, Name, Slug) VALUES
    (1, 1, 'Programming', 'programming'),
    (2, 1, 'DevOps', 'devops'),
    (3, 2, 'Guides', 'guides'),
    (4, 2, 'Destinations', 'destinations'),
    (5, 3, 'Recipes', 'recipes'),
    (6, 3, 'Reviews', 'reviews');

-- Tags
INSERT INTO Tags (TagId, Name) VALUES
    (1, 'sql'),
    (2, 'azure'),
    (3, 'travel-tips'),
    (4, 'italy'),
    (5, 'dinner'),
    (6, 'baking'),
    (7, 'devops');

-- Posts (multiple blogs / authors)
INSERT INTO Posts (PostId, BlogId, AuthorId, CategoryId, Title, Slug, Content, Excerpt, PublishedAt, IsPublished, Views, ExternalId, CreatedAt, UpdatedAt) VALUES
    (101, 1, 1, 1, 'Designing Resilient Databases', 'designing-resilient-databases', 'A short guide on transactional design, backups, and sharding strategies.', 'Resilient DB design fundamentals.', '2022-07-15T09:00:00Z', 1, 1245, 'ext-101', '2022-07-10T08:00:00Z', '2022-07-15T09:00:00Z'),
    (102, 1, 2, 2, 'CI/CD for Small Teams', 'ci-cd-small-teams', 'Practical CI/CD pipelines using minimal infrastructure and automation.', 'CI/CD recommendations.', '2023-02-02T14:30:00Z', 1, 842, 'ext-102', '2023-01-20T10:00:00Z', '2023-02-02T14:30:00Z'),
    (103, 2, 3, 3, 'Packing Light: Essentials for a Two-Week Trip', 'packing-light-essentials', 'What to pack and what to leave behind when traveling light.', 'Packing essentials for two weeks.', '2021-11-05T06:45:00Z', 1, 560, 'ext-103', '2021-10-30T09:00:00Z', '2021-11-05T06:45:00Z'),
    (104, 2, 3, 4, 'Florence in 48 Hours', 'florence-in-48-hours', 'A weekend plan to see the highlights of Florence.', 'Weekend Florence itinerary.', '2020-09-14T18:00:00Z', 1, 1720, 'ext-104', '2020-09-01T12:00:00Z', '2020-09-14T18:00:00Z'),
    (105, 3, 4, 5, 'One-Pan Lemon Chicken', 'one-pan-lemon-chicken', 'Easy one-pan recipe with bright lemon and herbs.', 'Simple lemon chicken recipe.', '2022-04-22T17:30:00Z', 1, 430, 'ext-105', '2022-04-20T08:00:00Z', '2022-04-22T17:30:00Z'),
    (106, 3, 4, 6, 'Best Non-Stick Pans 2023', 'best-non-stick-pans-2023', 'A comparative review of popular non-stick pans.', 'Top non-stick pans review.', '2023-01-10T11:00:00Z', 1, 210, 'ext-106', '2023-01-05T09:30:00Z', '2023-01-10T11:00:00Z'),
    (107, 1, 1, 1, 'Practical SQL Window Functions', 'practical-sql-windows', 'Examples and use cases for window functions in reporting.', 'Window functions for reporting.', '2024-03-08T07:00:00Z', 1, 320, 'ext-107', '2024-02-28T10:00:00Z', '2024-03-08T07:00:00Z'),
    (108, 2, 3, 4, 'Hidden Beaches of Portugal', 'hidden-beaches-portugal', 'A list of lesser-known beaches and how to get there.', 'Off-the-beaten-path beaches.', '2023-06-18T12:00:00Z', 1, 910, 'ext-108', '2023-06-10T08:00:00Z', '2023-06-18T12:00:00Z'),
    (109, 3, 4, 5, 'Sourdough Starter 101', 'sourdough-starter-101', 'How to create and maintain a sourdough starter at home.', 'Beginner sourdough guide.', '2021-08-01T05:30:00Z', 1, 1290, 'ext-109', '2021-07-20T09:00:00Z', '2021-08-01T05:30:00Z');

-- Post tags associations
INSERT INTO PostTags (PostId, TagId) VALUES
    (101, 1), (101, 7),
    (102, 7), (102, 2),
    (103, 3),
    (104, 3), (104, 4),
    (105, 5),
    (106, 6),
    (107, 1),
    (108, 3),
    (109, 6);

-- Comments
INSERT INTO Comments (CommentId, PostId, AuthorName, AuthorEmail, Content, CreatedAt, IsApproved, ExternalId) VALUES
    (1001, 101, 'Jane Doe', 'jane@example.com', 'Great overview — helped me redesign our backup plan.', '2022-07-16T08:20:00Z', 1, 'c-ext-1001'),
    (1002, 104, 'Luca', 'luca@example.it', 'Thanks for the Florence tips, saved me a day!', '2020-09-15T09:00:00Z', 1, 'c-ext-1002'),
    (1003, 109, 'Emma', 'emma@example.com', 'My starter came alive on day 5 — awesome guide.', '2021-08-03T07:10:00Z', 1, 'c-ext-1003');

-- Record a sample backup export entry
INSERT INTO Backups (BackupId, ExportedAt, Source, Note) VALUES
    (1, '2024-09-22T12:00:00Z', 'blogger-export', 'Sample backup snapshot including blogs, posts, tags, and comments.');
