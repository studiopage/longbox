export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, #0a0f0a 0%, #0d1410 50%, #0a120e 100%)',
      }}
    >
      {/* Subtle radial glow behind the card */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(160,180,145,0.06) 0%, transparent 70%)',
        }}
      />

      {/* Faint diagonal comic-panel lines */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(135deg, rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(225deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      <div className="w-full max-w-sm relative z-10">
        {children}
      </div>
    </div>
  );
}
