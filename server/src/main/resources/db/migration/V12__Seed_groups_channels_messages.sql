-- Local development seed. Password for seeded users: admin123.
WITH seed_users(username, email, role, status) AS (
    VALUES
        ('mod01', 'mod01@messenger.local', 'USER', 'ACTIVE'),
        ('mod02', 'mod02@messenger.local', 'USER', 'ACTIVE'),
        ('mod03', 'mod03@messenger.local', 'USER', 'ACTIVE'),
        ('user01', 'user01@messenger.local', 'USER', 'ACTIVE'),
        ('user02', 'user02@messenger.local', 'USER', 'ACTIVE'),
        ('user03', 'user03@messenger.local', 'USER', 'ACTIVE'),
        ('user04', 'user04@messenger.local', 'USER', 'ACTIVE'),
        ('user05', 'user05@messenger.local', 'USER', 'ACTIVE'),
        ('user06', 'user06@messenger.local', 'USER', 'ACTIVE'),
        ('user07', 'user07@messenger.local', 'USER', 'ACTIVE'),
        ('user08', 'user08@messenger.local', 'USER', 'ACTIVE'),
        ('user09', 'user09@messenger.local', 'USER', 'ACTIVE'),
        ('user10', 'user10@messenger.local', 'USER', 'ACTIVE'),
        ('user11', 'user11@messenger.local', 'USER', 'ACTIVE'),
        ('user12', 'user12@messenger.local', 'USER', 'ACTIVE'),
        ('user13', 'user13@messenger.local', 'USER', 'ACTIVE'),
        ('user14', 'user14@messenger.local', 'USER', 'ACTIVE'),
        ('user15', 'user15@messenger.local', 'USER', 'ACTIVE'),
        ('user16', 'user16@messenger.local', 'USER', 'ACTIVE'),
        ('user17', 'user17@messenger.local', 'USER', 'BANNED'),
        ('user18', 'user18@messenger.local', 'USER', 'BANNED'),
        ('user19', 'user19@messenger.local', 'USER', 'DEACTIVATED'),
        ('user20', 'user20@messenger.local', 'USER', 'DEACTIVATED')
)
INSERT INTO users (username, email, password_hash, first_name, last_name, role, status, deactivated_at, created_at, updated_at)
SELECT su.username,
       su.email,
       '$2a$10$4NB8Nyqtpsqn1U/MQXAXNeoem.RgGsUAI5gwlmFyQiPQ3KQlmtEkW',
       initcap(su.username),
       'Seed',
       su.role,
       su.status,
       CASE WHEN su.status = 'DEACTIVATED' THEN CURRENT_TIMESTAMP ELSE NULL END,
       CURRENT_TIMESTAMP,
       CURRENT_TIMESTAMP
FROM seed_users su
WHERE NOT EXISTS (
    SELECT 1 FROM users existing WHERE lower(existing.username) = lower(su.username)
);

INSERT INTO chats (name, description, type, created_by, created_at, updated_at)
SELECT 'Seed Group ' || group_no,
       'Development group ' || group_no,
       'GROUP',
       (SELECT id FROM users WHERE username = 'admin'),
       CURRENT_TIMESTAMP,
       CURRENT_TIMESTAMP
FROM generate_series(1, 5) AS group_no
WHERE NOT EXISTS (
    SELECT 1 FROM chats WHERE name = 'Seed Group ' || group_no AND type = 'GROUP'
);

WITH seed_groups AS (
    SELECT id, row_number() OVER (ORDER BY id) AS rn
    FROM chats
    WHERE type = 'GROUP' AND name LIKE 'Seed Group %'
)
INSERT INTO chats (name, description, type, parent_group_id, is_readonly, created_by, created_at, updated_at)
SELECT 'Seed Channel ' || sg.rn || '-' || channel_no,
       'Development channel ' || channel_no || ' for group ' || sg.rn,
       'CHANNEL',
       sg.id,
       (channel_no = 4),
       (SELECT id FROM users WHERE username = 'admin'),
       CURRENT_TIMESTAMP,
       CURRENT_TIMESTAMP
FROM seed_groups sg
CROSS JOIN generate_series(1, 4) AS channel_no
WHERE NOT EXISTS (
    SELECT 1
    FROM chats
    WHERE type = 'CHANNEL'
      AND parent_group_id = sg.id
      AND name = 'Seed Channel ' || sg.rn || '-' || channel_no
);

INSERT INTO chat_members (chat_id, user_id, role, state, joined_at)
SELECT c.id, u.id, 'OWNER', 'ACTIVE', CURRENT_TIMESTAMP
FROM chats c
CROSS JOIN users u
WHERE c.name LIKE 'Seed %'
  AND u.username = 'admin'
ON CONFLICT (chat_id, user_id) DO NOTHING;

INSERT INTO chat_members (chat_id, user_id, role, state, joined_at)
SELECT c.id, u.id, 'MODERATOR', 'ACTIVE', CURRENT_TIMESTAMP
FROM chats c
JOIN users u ON u.username IN ('mod01', 'mod02', 'mod03')
WHERE c.type = 'CHANNEL'
  AND c.name LIKE 'Seed Channel %'
ON CONFLICT (chat_id, user_id) DO NOTHING;

INSERT INTO chat_members (chat_id, user_id, role, state, joined_at)
SELECT c.id, u.id, 'MEMBER', 'ACTIVE', CURRENT_TIMESTAMP
FROM chats c
JOIN users u ON u.username BETWEEN 'user01' AND 'user16'
WHERE c.type = 'CHANNEL'
  AND c.name LIKE 'Seed Channel %'
ON CONFLICT (chat_id, user_id) DO NOTHING;

WITH banned_users AS (
    SELECT id FROM users WHERE username IN ('user17', 'user18')
), admin_user AS (
    SELECT id FROM users WHERE username = 'admin'
)
INSERT INTO user_bans (user_id, banned_by, reason, created_at)
SELECT bu.id, au.id, 'Seed global ban', CURRENT_TIMESTAMP
FROM banned_users bu
CROSS JOIN admin_user au
WHERE NOT EXISTS (
    SELECT 1 FROM user_bans WHERE user_id = bu.id AND scope_channel_id IS NULL AND revoked_at IS NULL
);

WITH seed_channels AS (
    SELECT id, row_number() OVER (ORDER BY id) AS channel_rn
    FROM chats
    WHERE type = 'CHANNEL' AND name LIKE 'Seed Channel %'
), active_authors AS (
    SELECT id, row_number() OVER (ORDER BY id) AS author_rn, count(*) OVER () AS author_count
    FROM users
    WHERE username IN ('admin', 'mod01', 'mod02', 'mod03',
                       'user01', 'user02', 'user03', 'user04',
                       'user05', 'user06', 'user07', 'user08',
                       'user09', 'user10', 'user11', 'user12',
                       'user13', 'user14', 'user15', 'user16')
), generated_messages AS (
    SELECT sc.id AS channel_id,
           message_no,
           ((message_no - 1) % (SELECT max(author_count) FROM active_authors)) + 1 AS author_rn
    FROM seed_channels sc
    CROSS JOIN generate_series(1, 50) AS message_no
)
INSERT INTO messages (chat_id, sender_id, content, message_type, status, client_msg_id, created_at, updated_at)
SELECT gm.channel_id,
       aa.id,
       'Seed message ' || gm.message_no || ' in channel ' || gm.channel_id,
       'TEXT',
       'SENT',
       'seed-' || gm.channel_id || '-' || gm.message_no,
       CURRENT_TIMESTAMP - ((1000 - gm.message_no) || ' seconds')::interval,
       CURRENT_TIMESTAMP
FROM generated_messages gm
JOIN active_authors aa ON aa.author_rn = gm.author_rn
WHERE NOT EXISTS (
    SELECT 1 FROM messages m WHERE m.chat_id = gm.channel_id AND m.client_msg_id = 'seed-' || gm.channel_id || '-' || gm.message_no
);
