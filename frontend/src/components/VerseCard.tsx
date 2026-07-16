export interface VerseData {
  type: string; // "Bible Verse" | "Quote of the Day" | "Word"
  text: string;
  reference: string;
  postedBy: string;
  createdAt?: string;
  definition?: string | null;
  usageExample?: string | null;
  partOfSpeech?: string | null;
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
  const isWord = verse.type === 'Word';

  const fadeInStyle = animate && (
    <style>{`@keyframes verseCardFadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
  );

  if (isWord) {
    return (
      <div
        style={{
          position: 'relative',
          width: '100%',
          overflow: 'hidden',
          borderRadius: 16,
          background: 'linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 20px 40px -12px rgba(27,94,32,0.45), 0 8px 20px rgba(0,0,0,0.18)',
          padding: '30px 32px 22px',
          animation: animate ? 'verseCardFadeIn 0.7s ease-out' : undefined,
        }}
      >
        {fadeInStyle}

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
          📚 WORD OF THE DAY
        </span>

        {greetingName && (
          <p style={{ margin: '0 0 12px', color: '#e8f5e9', fontSize: 15, fontWeight: 600 }}>
            {greeting}, {greetingName}
          </p>
        )}

        <p style={{ margin: '0 0 4px', color: 'white', fontWeight: 800, fontSize: fontSize + 12, lineHeight: 1.2 }}>
          {verse.text}
        </p>

        {verse.partOfSpeech && (
          <p style={{ margin: '0 0 14px', color: '#a5d6a7', fontStyle: 'italic', fontSize: 13 }}>
            {verse.partOfSpeech}
          </p>
        )}

        {verse.definition && (
          <p style={{ margin: '0 0 14px', color: 'white', fontSize, lineHeight: 1.7 }}>
            {verse.definition}
          </p>
        )}

        {verse.usageExample && (
          <p style={{ margin: '0 0 20px', color: '#c8e6c9', fontStyle: 'italic', fontSize: fontSize - 3, lineHeight: 1.6 }}>
            "{verse.usageExample}"
          </p>
        )}

        <p style={{ margin: 0, color: 'rgba(255,255,255,0.55)', fontSize: 11, textAlign: 'right' }}>
          Posted by {verse.postedBy}
        </p>
      </div>
    );
  }

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
      {fadeInStyle}

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
