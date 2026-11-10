import { useEffect, useState } from 'react';
import { Download, Share2 } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import { renderResultImage } from '../lib/shareImage';
import { useToast } from './Toast';

/** Previews the result card and lets the player share it (native share sheet where available) or save it as a PNG. */
export default function ShareModal({ open, onClose, data }) {
  const toast = useToast();
  const [img, setImg] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    let live = true;
    setImg(null); setFailed(false);
    renderResultImage(data).then((r) => { if (live) setImg(r); }).catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const file = () => new File([img.blob], 'constitution-quiz-result.png', { type: 'image/png' });
  const canShare = !!img && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file()] });
  const download = () => {
    const url = URL.createObjectURL(img.blob);
    Object.assign(document.createElement('a'), { href: url, download: 'constitution-quiz-result.png' }).click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Image saved', 'success');
  };
  const share = async () => {
    try { await navigator.share({ files: [file()], title: 'Constitution Quiz Showdown', text: data.title }); }
    catch (e) { if (e?.name !== 'AbortError') download(); }
  };

  return (
    <Modal open={open} title="Share your result" onClose={onClose} wide
      actions={<>
        <Button variant="secondary" onClick={onClose}>Close</Button>
        <Button variant="secondary" icon={<Download size={18} />} onClick={download} disabled={!img}>Save image</Button>
        {canShare && <Button icon={<Share2 size={18} />} onClick={share}>Share</Button>}
      </>}>
      <div className="sharepreview">
        {img ? <img src={img.url} alt={`Result card: ${data.title}`} width={img.width} height={img.height} />
          : failed ? <p className="error">The image could not be created in this browser.</p> : <p className="muted">Drawing your card…</p>}
      </div>
    </Modal>
  );
}
