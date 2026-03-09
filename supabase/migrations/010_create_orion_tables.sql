-- Orion Conversation Persistence
-- Creates the three tables required for Orion's chat history and business memory.
-- Without these, every tab switch clears the chat because state lives only in React.

-- ─── orion_conversations ──────────────────────────────────────────────────────
-- One row per chat session. Updated_at is bumped each time a message is saved
-- so the UI can always reload the most recent conversation on mount.

CREATE TABLE IF NOT EXISTS orion_conversations (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title       TEXT NOT NULL DEFAULT 'New conversation',
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orion_conversations_user_updated
    ON orion_conversations(user_id, updated_at DESC);

-- ─── orion_messages ───────────────────────────────────────────────────────────
-- Every user and assistant message, tied to a conversation.

CREATE TABLE IF NOT EXISTS orion_messages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES orion_conversations(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role            TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content         TEXT NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orion_messages_conversation
    ON orion_messages(conversation_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_orion_messages_user
    ON orion_messages(user_id, created_at DESC);

-- ─── orion_memory ─────────────────────────────────────────────────────────────
-- Persistent business facts Orion extracts from conversations.
-- Unique on (user_id, key) so insights are upserted, not duplicated.

CREATE TABLE IF NOT EXISTS orion_memory (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category                TEXT NOT NULL,   -- e.g. 'owner_preference', 'product_knowledge'
    key                     TEXT NOT NULL,   -- short identifier for the insight
    value                   TEXT NOT NULL,   -- the insight content
    source_conversation_id  UUID REFERENCES orion_conversations(id) ON DELETE SET NULL,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, key)
);

CREATE INDEX IF NOT EXISTS idx_orion_memory_user
    ON orion_memory(user_id, updated_at DESC);

-- ─── Row-Level Security ───────────────────────────────────────────────────────

ALTER TABLE orion_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE orion_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE orion_memory        ENABLE ROW LEVEL SECURITY;

-- Conversations: users see and manage only their own
CREATE POLICY "Users manage own conversations"
    ON orion_conversations FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Messages: users see and manage only their own
CREATE POLICY "Users manage own messages"
    ON orion_messages FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Memory: users see and manage only their own
CREATE POLICY "Users manage own memory"
    ON orion_memory FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
