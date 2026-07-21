// Simulated phone bezel so the portrait game looks good on desktop.
export default function PhoneFrame({ children }) {
  return (
    <div className="w-full h-full flex items-center justify-center p-2 sm:p-4 bg-gradient-to-br from-slate-300 via-purple-200 to-pink-200">
      <div
        className="relative bg-slate-800 rounded-[2.2rem] p-2 shadow-2xl"
        style={{
          height: 'min(96vh, 900px)',
          aspectRatio: '9 / 19',
          maxWidth: '96vw',
        }}
      >
        {/* speaker notch */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-5 bg-slate-800 rounded-full z-30 flex items-center justify-center gap-2">
          <div className="w-10 h-1.5 bg-slate-700 rounded-full" />
          <div className="w-1.5 h-1.5 bg-slate-600 rounded-full" />
        </div>
        {/* screen */}
        <div className="relative w-full h-full rounded-[1.7rem] overflow-hidden bg-black">
          {children}
        </div>
      </div>
    </div>
  )
}
