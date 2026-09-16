'use client'

/**
 * Самый крайний случай: упал общий каркас сайта, поэтому ни шапки,
 * ни нижнего меню тут нет — страницу приходится рисовать целиком.
 * Стили вписаны прямо сюда: файл globals.css в этот момент может быть
 * ещё не загружен.
 */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="ru">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f7f4ef',
          color: '#241f1a',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          textAlign: 'center',
          padding: '24px',
        }}
      >
        <div>
          <div style={{ fontSize: '24px', fontWeight: 700, marginBottom: '12px' }}>
            Mebel<span style={{ color: '#9c5a22' }}>.</span>
          </div>
          <p style={{ color: '#7b7268', lineHeight: 1.6, maxWidth: '380px', margin: '0 auto 24px' }}>
            Сайт не смог загрузиться. Попробуйте обновить страницу — обычно
            это помогает.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              background: '#9c5a22',
              color: '#fff',
              border: 0,
              borderRadius: '999px',
              padding: '12px 28px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Обновить
          </button>
        </div>
      </body>
    </html>
  )
}
