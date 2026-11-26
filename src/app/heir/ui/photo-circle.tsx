import type { Photo } from '@/heir/photos';

// A round photograph (a sunrise, or the night sky) for "When you rise" and "When you lie down", in a stone ring with a
// soft halo. It drifts very slowly and its light breathes; still for people who ask for less motion (see heir.css).
export function PhotoCircle({ photo, mood, size = 180 }: { photo: Photo; mood: 'dawn' | 'night'; size?: number }) {
  return (
    <div className="hr-pc" data-mood={mood} style={{ width: size, height: size }} role="img" aria-label={photo.alt}>
      <span className="hr-pc-bg" style={{ backgroundImage: `url(${photo.file})` }} />
      <span className="hr-pc-glow" aria-hidden="true" />
    </div>
  );
}
