-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS VECTOR;

-- Documents table
CREATE TABLE DOCUMENTS (
    ID UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
    TITLE TEXT NOT NULL,
    CONTENT TEXT NOT NULL,
    METADATA JSONB,
    CREATED_AT TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    USER_ID UUID REFERENCES AUTH.USERS(ID)
);

-- Chunks table for storing document chunks with embeddings
CREATE TABLE CHUNKS (
    ID UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
    DOCUMENT_ID UUID NOT NULL REFERENCES DOCUMENTS(ID) ON DELETE CASCADE,
    CONTENT TEXT NOT NULL,
    EMBEDDING VECTOR(1536) NOT NULL,
    METADATA JSONB,
    CREATED_AT TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Conversations table
CREATE TABLE CONVERSATIONS (
    ID UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
    TITLE TEXT NOT NULL,
    USER_ID UUID NOT NULL REFERENCES AUTH.USERS(ID),
    CREATED_AT TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UPDATED_AT TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Messages table
CREATE TABLE MESSAGES (
    ID UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
    CONVERSATION_ID UUID NOT NULL REFERENCES CONVERSATIONS(ID) ON DELETE CASCADE,
    ROLE TEXT NOT NULL CHECK (ROLE IN ('user', 'assistant', 'system')),
    CONTENT TEXT NOT NULL,
    CITATIONS JSONB,
    CREATED_AT TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Function for similarity search
CREATE OR REPLACE FUNCTION MATCH_CHUNKS(
    QUERY_EMBEDDING VECTOR(1536),
    FILTER JSONB DEFAULT NULL,
    MATCH_COUNT INT DEFAULT 5
) RETURNS TABLE ( ID UUID, DOCUMENT_ID UUID, CONTENT TEXT, METADATA JSONB, SIMILARITY FLOAT ) LANGUAGE PLPGSQL AS
    $$     BEGIN RETURN QUERY
    SELECT
        CHUNKS.ID,
        CHUNKS.DOCUMENT_ID,
        CHUNKS.CONTENT,
        CHUNKS.METADATA,
        1 - (CHUNKS.EMBEDDING <=> QUERY_EMBEDDING) AS SIMILARITY
    FROM
        CHUNKS
    WHERE
        (FILTER IS NULL
        OR (FILTER->>'document_id' IS NULL
        OR CHUNKS.DOCUMENT_ID = (FILTER->>'document_id')::UUID))
    ORDER BY
        CHUNKS.EMBEDDING <=> QUERY_EMBEDDING LIMIT MATCH_COUNT;
END;
$$    ;
 
-- Settings table for storing application configuration
CREATE TABLE SETTINGS ( ID TEXT PRIMARY KEY, VALUE JSONB NOT NULL, UPDATED_AT TIMESTAMPTZ NOT NULL DEFAULT NOW(), UPDATED_BY UUID REFERENCES AUTH.USERS(ID) );
 
-- Add admin flag to user profiles
CREATE TABLE USER_PROFILES ( ID UUID PRIMARY KEY REFERENCES AUTH.USERS(ID), IS_ADMIN BOOLEAN NOT NULL DEFAULT FALSE, CREATED_AT TIMESTAMPTZ NOT NULL DEFAULT NOW(), UPDATED_AT TIMESTAMPTZ NOT NULL DEFAULT NOW() );
 
-- Create default settings
INSERT INTO SETTINGS (ID, VALUE) VALUES ('rag_settings', '{
  "openai_model": "gpt-4o",
  "embedding_model": "text-embedding-3-small",
  "match_threshold": 0.7,
  "match_count": 5,
  "chunk_size": 1000,
  "chunk_overlap": 200,
  "system_prompt": "You are a helpful assistant that answers questions based on the user''s documents. Format your responses using Markdown for better readability. Use headings, lists, code blocks with syntax highlighting, and other markdown features when appropriate. Always cite your sources when you use information from the documents."
}');
 
-- Create storage bucket for documents
DO     $$ BEGIN INSERT INTO STORAGE.BUCKETS (
    ID,
    NAME,
    PUBLIC
) VALUES (
    'documents',
    'documents',
    FALSE
) ON CONFLICT DO NOTHING;
END $$;
 
-- Storage bucket policies
CREATE POLICY "Allow authenticated users to read documents" ON STORAGE.OBJECTS FOR
SELECT
    USING (AUTH.ROLE() = 'authenticated'
    AND BUCKET_ID = 'documents');
CREATE POLICY "Allow authenticated users to upload documents" ON STORAGE.OBJECTS FOR INSERT WITH CHECK (
    AUTH.ROLE() = 'authenticated' AND BUCKET_ID = 'documents'
);
CREATE POLICY "Allow authenticated users to update their documents" ON STORAGE.OBJECTS FOR UPDATE USING (AUTH.ROLE() = 'authenticated'
AND BUCKET_ID = 'documents') WITH CHECK (AUTH.ROLE() = 'authenticated'
AND BUCKET_ID = 'documents');
CREATE POLICY "Allow authenticated users to delete their documents" ON STORAGE.OBJECTS FOR DELETE USING (AUTH.ROLE() = 'authenticated'
AND BUCKET_ID = 'documents');
 
-- RLS policies for documents
ALTER  TABLE DOCUMENTS ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to select their own documents" ON DOCUMENTS FOR
SELECT
    USING (AUTH.UID() = USER_ID
    OR USER_ID IS NULL);
CREATE POLICY "Allow users to insert their own documents" ON DOCUMENTS FOR INSERT WITH CHECK (
    AUTH.UID() = USER_ID OR USER_ID IS NULL
);
CREATE POLICY "Allow users to update their own documents" ON DOCUMENTS FOR UPDATE USING (AUTH.UID() = USER_ID
OR USER_ID IS NULL);
CREATE POLICY "Allow users to delete their own documents" ON DOCUMENTS FOR DELETE USING (AUTH.UID() = USER_ID
OR USER_ID IS NULL);
 
-- RLS policies for chunks
ALTER  TABLE CHUNKS ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to select chunks from their documents" ON CHUNKS FOR
SELECT
    USING (EXISTS (
        SELECT
            1
        FROM
            DOCUMENTS
        WHERE
            DOCUMENTS.ID = CHUNKS.DOCUMENT_ID
            AND (DOCUMENTS.USER_ID = AUTH.UID()
            OR DOCUMENTS.USER_ID IS NULL)
    ));
 
-- RLS policies for conversations
ALTER  TABLE CONVERSATIONS ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to select their own conversations" ON CONVERSATIONS FOR
SELECT
    USING (AUTH.UID() = USER_ID);
CREATE POLICY "Allow users to insert their own conversations" ON CONVERSATIONS FOR INSERT WITH CHECK (
    AUTH.UID() = USER_ID
);
CREATE POLICY "Allow users to update their own conversations" ON CONVERSATIONS FOR UPDATE USING (AUTH.UID() = USER_ID);
CREATE POLICY "Allow users to delete their own conversations" ON CONVERSATIONS FOR DELETE USING (AUTH.UID() = USER_ID);
 
-- RLS policies for messages
ALTER  TABLE MESSAGES ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to select messages from their conversations" ON MESSAGES FOR
SELECT
    USING ( EXISTS (
        SELECT
            1
        FROM
            CONVERSATIONS
        WHERE
            CONVERSATIONS.ID = MESSAGES.CONVERSATION_ID
            AND CONVERSATIONS.USER_ID = AUTH.UID()
    ) );
CREATE POLICY "Allow users to insert messages to their conversations" ON MESSAGES FOR INSERT WITH CHECK (
    EXISTS ( SELECT 1 FROM CONVERSATIONS WHERE CONVERSATIONS.ID = MESSAGES.CONVERSATION_ID AND CONVERSATIONS.USER_ID = AUTH.UID() )
);
CREATE POLICY "Allow users to update messages in their conversations" ON MESSAGES FOR UPDATE USING ( EXISTS (
    SELECT
        1
    FROM
        CONVERSATIONS
    WHERE
        CONVERSATIONS.ID = MESSAGES.CONVERSATION_ID
        AND CONVERSATIONS.USER_ID = AUTH.UID()
) );
CREATE POLICY "Allow users to delete messages from their conversations" ON MESSAGES FOR DELETE USING ( EXISTS (
    SELECT
        1
    FROM
        CONVERSATIONS
    WHERE
        CONVERSATIONS.ID = MESSAGES.CONVERSATION_ID
        AND CONVERSATIONS.USER_ID = AUTH.UID()
) );