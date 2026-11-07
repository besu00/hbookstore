CREATE DATABASE IF NOT EXISTS hbookstore CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hbookstore;

CREATE TABLE IF NOT EXISTS users (
  id            BIGINT UNSIGNED NOT NULL PRIMARY KEY,          -- Telegram user id
  first_name    VARCHAR(128) NOT NULL DEFAULT '',
  username      VARCHAR(64)  NULL,
  language_code VARCHAR(10)  NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS categories (
  id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(64) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS books (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title        VARCHAR(255) NOT NULL,
  author       VARCHAR(255) NOT NULL,
  category_id  INT UNSIGNED NOT NULL,
  description  TEXT NULL,
  cover_url    VARCHAR(512) NULL,          -- full URL or /files/covers/xxx
  file_path    VARCHAR(255) NULL,          -- uploaded PDF filename (in uploads/books)
  external_url VARCHAR(1024) NULL,         -- or an external link
  downloads    INT UNSIGNED NOT NULL DEFAULT 0,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_books_cat FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  INDEX idx_books_cat (category_id),
  INDEX idx_books_created (created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS favorites (
  user_id    BIGINT UNSIGNED NOT NULL,
  book_id    INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, book_id),
  CONSTRAINT fk_fav_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_fav_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS book_opens (
  id        BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id   BIGINT UNSIGNED NOT NULL,
  book_id   INT UNSIGNED NOT NULL,
  opened_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_opens_user (user_id),
  CONSTRAINT fk_open_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_open_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
) ENGINE=InnoDB;
