/**
 * Graceful degradation for devices with no WebGL (or where the user has
 * blocked it). A pure-CSS deep-space gradient with a faint static star dusting —
 * no rAF, no GPU. It sits behind the shared <Overlay />, which still supplies
 * all the real text, so the page reads correctly without the 3D.
 */
export default function StaticFallback() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(1200px 800px at 70% 20%, #1a1140 0%, rgba(26,17,64,0) 60%),' +
            'radial-gradient(900px 700px at 20% 80%, #2a0f4a 0%, rgba(42,15,74,0) 55%),' +
            '#05060A',
        }}
      />
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            'radial-gradient(1px 1px at 20% 30%, #fff, transparent),' +
            'radial-gradient(1px 1px at 80% 40%, #cdd6ff, transparent),' +
            'radial-gradient(1px 1px at 50% 70%, #fff, transparent),' +
            'radial-gradient(1.5px 1.5px at 35% 85%, #ffd9a0, transparent),' +
            'radial-gradient(1px 1px at 65% 15%, #fff, transparent)',
          backgroundRepeat: 'repeat',
          backgroundSize: '420px 420px',
        }}
      />
      {/* Subtle marker so an unexpected fallback (no-WebGL viewer) is identifiable. */}
      <p className="label absolute bottom-4 right-5 text-[0.55rem] text-white/25">
        static sky · webgl unavailable
      </p>
    </div>
  )
}
