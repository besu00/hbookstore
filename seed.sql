-- Sample data, inserted only when the categories table is empty
INSERT IGNORE INTO categories (name) VALUES ('ታሪክ'), ('ልቦለድ'), ('ቴክኖሎጂ'), ('ፍልስፍና'), ('ሃይማኖት');

INSERT INTO books (title, author, category_id, cover_url, external_url)
SELECT t, a, c, i, u FROM (
  SELECT 'የኢትዮጵያ ታሪክ' AS t, 'ደራሲ XYZ' AS a, (SELECT id FROM categories WHERE name='ታሪክ') AS c,
         'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300' AS i, 'https://example.com' AS u
  UNION ALL SELECT 'ፍቅር እስከ መቃብር', 'ሀዲስ ዓለማየሁ', (SELECT id FROM categories WHERE name='ልቦለድ'),
         'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300', 'https://example.com'
  UNION ALL SELECT 'ሰው ሰራሽ አስተውሎት (AI)', 'ባለሙያ', (SELECT id FROM categories WHERE name='ቴክኖሎጂ'),
         'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=300', 'https://example.com'
  UNION ALL SELECT 'የሕይወት ፍልስፍና', 'ፈላስፋው', (SELECT id FROM categories WHERE name='ፍልስፍና'),
         'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=300', 'https://example.com'
) s WHERE NOT EXISTS (SELECT 1 FROM books);
