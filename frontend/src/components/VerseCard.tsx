export interface VerseData {
  type: string; // "Bible Verse" | "Quote of the Day"
  text: string;
  reference: string;
  postedBy: string;
  createdAt?: string;
}

interface VerseCardProps {
  verse: VerseData | null;
  greetingName?: string;
  fontSize?: number;
  animate?: boolean;
}

export default function VerseCard({ verse, greetingName, fontSize = 20, animate = false }: VerseCardProps) {
  if (!verse) return null;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const isBible = verse.type === 'Bible Verse';

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        overflow: 'hidden',
        borderRadius: 16,
        background: 'linear-gradient(135deg, #1a237e 0%, #283593 100%)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 20px 40px -12px rgba(26,35,126,0.45), 0 8px 20px rgba(0,0,0,0.18)',
        padding: '30px 32px 22px',
        animation: animate ? 'verseCardFadeIn 0.7s ease-out' : undefined,
      }}
    >
      {animate && (
        <style>{`@keyframes verseCardFadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      )}

      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: -34,
          left: 12,
          fontSize: 120,
          lineHeight: 1,
          fontFamily: 'Georgia, "Times New Roman", serif',
          color: '#90caf9',
          opacity: 0.3,
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        "
      </span>

      <div style={{ position: 'relative' }}>
        <span
          style={{
            display: 'inline-block',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.6,
            color: 'white',
            background: 'rgba(255,255,255,0.15)',
            padding: '6px 14px',
            borderRadius: 20,
            marginBottom: greetingName ? 14 : 20,
          }}
        >
          {isBible ? '📖 BIBLE VERSE' : '💬 QUOTE OF THE DAY'}
        </span>

        {greetingName && (
          <p style={{ margin: '0 0 12px', color: '#e8eaf6', fontSize: 15, fontWeight: 600 }}>
            {greeting}, {greetingName}
          </p>
        )}

        <p
          style={{
            margin: '0 0 20px',
            color: 'white',
            fontStyle: 'italic',
            fontWeight: 400,
            fontSize,
            lineHeight: 1.8,
          }}
        >
          {verse.text}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <p style={{ margin: 0, color: '#90caf9', fontSize: 14, fontWeight: 600, textAlign: 'right' }}>
            — {verse.reference}
          </p>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: 11, textAlign: 'right' }}>
            Posted by {verse.postedBy}
          </p>
        </div>
      </div>
    </div>
  );
}
