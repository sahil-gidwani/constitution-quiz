import { ScrollText, Flag, Landmark, Crown, BookOpen, Trophy, ShieldCheck, Award, Trees, Coins, Gavel, Scale, Upload, LayoutGrid, Sparkles } from 'lucide-react';

const MAP = { ScrollText, Flag, Landmark, Crown, BookOpen, Trophy, ShieldCheck, Award, Trees, Coins, Gavel, Scale, Upload, LayoutGrid, Sparkles };
export default function RoundIcon({ name, ...props }) {
  const C = MAP[name] || Scale;
  return <C aria-hidden="true" {...props} />;
}
