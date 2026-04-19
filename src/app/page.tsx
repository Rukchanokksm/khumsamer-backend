export default function Home() {
  return (
    <main style={{ fontFamily: "system-ui", padding: 32 }}>
      <h1>Family Webapp Backend</h1>
      <p>API server is running. See README for available endpoints.</p>
      <ul>
        <li>
          <code>POST /api/auth/register</code> — create a user
        </li>
        <li>
          <code>POST /api/auth/callback/credentials</code> — login (NextAuth)
        </li>
        <li>
          <code>GET /api/auth/session</code> — current session
        </li>
        <li>
          <code>POST /api/images/upload</code> — upload image (authenticated)
        </li>
        <li>
          <code>GET /api/images</code> — list images (authenticated)
        </li>
      </ul>
    </main>
  );
}
