# API Documentation

Aion uses Supabase for its backend, featuring a custom Edge Function for AI chat and PostgREST for direct database access.

## Chat Edge Function

The `chat` Edge Function handles conversational Bible Q&A. It performs rate limiting, keyword extraction, OpenAI embeddings generation, hybrid search, and streams responses from Gemini.

### Endpoint

```http
POST https://<your-project>.supabase.co/functions/v1/chat
```

### Headers

| Header | Value | Required | Description |
|--------|-------|----------|-------------|
| `Authorization` | `Bearer <anon-jwt>` | Yes | The user's anonymous JWT |
| `Content-Type` | `application/json` | Yes | Must be JSON |
| `x-dev-bypass` | `<secret>` | No | Optional bypass for rate limits during dev |

### Request Body

```json
{
  "message": "What does John 3:16 say?",
  "conversation_id": "uuid-string-or-null"
}
```
- `message` (string): The user's question (max 500 characters).
- `conversation_id` (string | null): The UUID of an existing conversation, or `null` to start a new one.

### Response

The response is an SSE (Server-Sent Events) stream.

**Events:**
- `text`: Emitted for each chunk of the LLM's response. Payload: `{"content": "chunk..."}`
- `verses`: Emitted once, containing the verses retrieved from the hybrid search. Payload: `{"verses": [{"book": "...", "chapter": 1, "verse": 1, "content": "..."}]}`
- `conversation`: Emitted once, containing the conversation ID. Payload: `{"id": "uuid"}`
- `done`: Emitted at the end of the stream. Payload: `{}`
- `error`: Emitted on failure. Payload: `{"message": "error description"}`

---

## PostgREST API

The mobile and web clients query the database directly using the Supabase PostgREST API. 
All access is restricted via Row Level Security (RLS).

### Key Endpoints

- `GET /rest/v1/bible_verses` - Fetch verses for the reader. (Public read)
- `GET /rest/v1/conversations` - Fetch a user's chat history. (Auth restricted)
- `GET /rest/v1/messages` - Fetch messages in a conversation. (Auth restricted)
- `GET /rest/v1/user_verse_data` - Fetch bookmarks/highlights. (Auth restricted)

Example using `supabase-js`:
```typescript
const { data, error } = await supabase
  .from('bible_verses')
  .select('verse, content, book_name')
  .eq('book_id', 'JHN')
  .eq('chapter', 3)
  .order('verse', { ascending: true });
```
