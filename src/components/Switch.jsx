import { useId } from 'react';

/** Accessible on/off switch. `label` names it for screen readers; visible text is up to the caller. */
export function Switch({ checked, onChange, label, disabled }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled}
      className={`switch ${checked ? 'is-on' : ''}`} onClick={() => onChange(!checked)}>
      <span className="switch__knob" />
    </button>
  );
}

/** A small group of mutually exclusive pills. options: [{value, label}] */
export function Choice({ label, value, options, onChange, disabled }) {
  const id = useId();
  return (
    <div className="choice" role="radiogroup" aria-labelledby={id}>
      <span id={id} className="choice__label">{label}</span>
      <div className="choice__pills">
        {options.map((o) => (
          <button key={o.value} type="button" role="radio" aria-checked={value === o.value} disabled={disabled}
            className={value === o.value ? 'is-on' : ''} onClick={() => onChange(o.value)}>{o.label}</button>
        ))}
      </div>
    </div>
  );
}
