import Modal from './Modal';
import Button from './Button';
import OptionsPanel from './OptionsPanel';
import { useGame } from '../store';

/** Change the optional rules in the middle of a game. Takes effect from the next question. */
export default function RulesModal({ open, onClose }) {
  const g = useGame();
  return (
    <Modal open={open} title="Game rules" onClose={onClose} wide actions={<Button onClick={onClose}>Done</Button>}>
      <p className="muted rules__lead">Changes apply from the next question. Power-ups already used stay used.</p>
      <OptionsPanel options={g.options} onChange={g.setOptions} quick={g.format === 'quick'} />
    </Modal>
  );
}
