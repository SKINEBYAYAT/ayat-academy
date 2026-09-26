import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requested = Number(url.searchParams.get('size') || 512);
  const size = requested === 192 ? 192 : 512;
  const maskable = url.searchParams.get('maskable') === '1';

  return new ImageResponse(
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#294c3e',
      color: '#f7f5ef',
      fontFamily: 'serif',
      position: 'relative',
    }}>
      <div style={{
        width: maskable ? '68%' : '78%',
        height: maskable ? '68%' : '78%',
        border: '2px solid #b39666',
        borderRadius: size * 0.17,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ fontSize: size * 0.26, letterSpacing: -size * 0.018, lineHeight: 0.9 }}>ayat</div>
        <div style={{ fontFamily: 'sans-serif', fontSize: size * 0.045, letterSpacing: size * 0.018, marginTop: size * 0.045 }}>ACADEMY</div>
      </div>
    </div>,
    {
      width: size,
      height: size,
      headers: { 'Cache-Control': 'public, max-age=31536000, immutable' },
    },
  );
}
