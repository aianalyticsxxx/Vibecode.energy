import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'OneShotCoding - Daily Coding Challenges with Rewards';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0D0D0D',
          fontFamily: 'monospace',
        }}
      >
        {/* Background gradient */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              'radial-gradient(circle at 30% 20%, rgba(217, 119, 6, 0.15) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(217, 119, 6, 0.1) 0%, transparent 50%)',
          }}
        />

        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '32px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              border: '3px solid #D97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: '#D97706',
              }}
            />
          </div>
          <span
            style={{
              fontSize: '48px',
              fontWeight: 'bold',
              color: '#EDEDED',
            }}
          >
            OneShotCoding
          </span>
        </div>

        {/* Tagline */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <span
            style={{
              fontSize: '32px',
              color: '#D97706',
            }}
          >
            One prompt. One response. Ship it.
          </span>
          <span
            style={{
              fontSize: '24px',
              color: '#A3A3A3',
              maxWidth: '800px',
              textAlign: 'center',
            }}
          >
            Daily coding challenges with rewards for the coding community
          </span>
        </div>

        {/* Features */}
        <div
          style={{
            display: 'flex',
            gap: '48px',
            marginTop: '48px',
          }}
        >
          {['Daily Challenges', 'Leaderboards', 'Community Voting'].map(
            (feature) => (
              <div
                key={feature}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#EDEDED',
                  fontSize: '20px',
                }}
              >
                <span style={{ color: '#D97706' }}>→</span>
                <span>{feature}</span>
              </div>
            )
          )}
        </div>

        {/* URL */}
        <div
          style={{
            position: 'absolute',
            bottom: '32px',
            color: '#6B6B6B',
            fontSize: '18px',
          }}
        >
          oneshotcoding.io
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
