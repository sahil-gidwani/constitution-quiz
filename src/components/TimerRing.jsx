/** Circular countdown. `fraction` is 0..1 of time left. */
export default function TimerRing({ seconds, fraction, label, urgent, size = 92 }) {
  const stroke = 7, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const f = Math.max(0, Math.min(1, fraction));
  return (
    <div className={`ring ${urgent ? 'ring--urgent' : ''}`} style={{ width: size, height: size }} role="timer" aria-label={`${seconds} seconds left`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle className="ring__track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" />
        <circle className="ring__bar" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none"
          strokeDasharray={c} strokeDashoffset={c * (1 - f)} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <div className="ring__text"><b>{seconds}</b>{label && <small>{label}</small>}</div>
    </div>
  );
}
