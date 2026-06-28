# 🔒 Security Documentation — Cipher Chat

## Authentication
- **JWT** stored in `HttpOnly`, `SameSite: strict`, `Secure` cookies — inaccessible to JavaScript, prevents XSS token theft
- **bcrypt** password hashing with cost factor 12 — ~250ms hash time, brute-force resistant
- **protectRoute middleware** — verifies JWT on every protected endpoint

## Rate Limiting
- Auth endpoints: 20 requests / 15 min (prevents brute-force)
- All endpoints: 200 requests / min (prevents DoS)
- Implemented with `express-rate-limit`

## Input Sanitization
- `express-mongo-sanitize` — strips `$` and `.` operators from all request bodies/params/query strings, preventing NoSQL injection
- React JSX auto-escapes all rendered strings — prevents XSS in output
- File upload MIME type whitelist in Multer fileFilter

## Security Headers (Helmet.js)
- `X-Frame-Options: SAMEORIGIN` — prevents clickjacking
- `X-Content-Type-Options: nosniff` — prevents MIME sniffing
- `Strict-Transport-Security` — forces HTTPS
- `Content-Security-Policy` — restricts resource origins
- `X-XSS-Protection` — legacy XSS filter

## CORS Protection
- `origin: CLIENT_URL` — only allows requests from configured frontend
- `credentials: true` — allows cookies while restricting origin
- Prevents CSRF by rejecting cross-origin requests

## E2E Encryption
- RSA-2048 (OAEP + SHA-256) for key exchange
- AES-256-GCM for message encryption (authenticated encryption)
- Private key never leaves the browser (localStorage)
- Server stores only ciphertext — cannot read messages

## File Security
- Max file size: 50MB
- Allowed MIME types whitelist (Multer fileFilter)
- Files served via Cloudinary CDN (not from our server)

## Password Security
- Minimum 6 characters enforced
- bcrypt hash stored, never plaintext
- No password hints or recovery questions
