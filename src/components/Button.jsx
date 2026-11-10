import { motion } from 'framer-motion';
import { sfx } from '../lib/sound';

export default function Button({ variant = 'primary', size = 'md', block, icon, children, onClick, silent, ...rest }) {
  return (
    <motion.button
      type="button" className={`btn btn--${variant} btn--${size} ${block ? 'btn--block' : ''}`}
      whileHover={rest.disabled ? undefined : { y: -2 }} whileTap={rest.disabled ? undefined : { scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 500, damping: 28 }}
      onClick={(e) => { if (!silent) sfx.click(); onClick?.(e); }} {...rest}>
      {icon}{children}
    </motion.button>
  );
}
