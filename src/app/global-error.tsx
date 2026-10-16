'use client'
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ padding: 20, fontFamily: 'sans-serif' }}>
        <h2>حصل خطأ</h2>
        <pre style={{ whiteSpace: 'pre-wrap', direction: 'ltr', background: '#fee', padding: 12, fontSize: 12 }}>
          {error.message}{'\n'}{error.stack}
        </pre>
        <button onClick={reset}>إعادة المحاولة</button>
      </body>
    </html>
  )
}
