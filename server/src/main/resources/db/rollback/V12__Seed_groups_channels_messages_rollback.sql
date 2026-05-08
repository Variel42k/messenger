-- Rollback for V12 local seed data. This is intentionally scoped by seed naming.

DELETE FROM messages WHERE client_msg_id LIKE 'seed-%';
DELETE FROM user_bans
WHERE reason = 'Seed global ban'
  AND user_id IN (SELECT id FROM users WHERE username IN ('user17', 'user18'));
DELETE FROM chat_members
WHERE chat_id IN (SELECT id FROM chats WHERE name LIKE 'Seed %');
DELETE FROM chats WHERE name LIKE 'Seed Channel %';
DELETE FROM chats WHERE name LIKE 'Seed Group %';
DELETE FROM users
WHERE username IN (
    'mod01', 'mod02', 'mod03',
    'user01', 'user02', 'user03', 'user04', 'user05',
    'user06', 'user07', 'user08', 'user09', 'user10',
    'user11', 'user12', 'user13', 'user14', 'user15',
    'user16', 'user17', 'user18', 'user19', 'user20'
);
