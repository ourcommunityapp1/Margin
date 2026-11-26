import type { Photo } from '@/heir/photos';

// A round photograph (a sunrise, or the night sky) for "When you rise" and "When you lie down". It drifts very slowly;
// a still picture for people who ask for less motion (see heir.css).
export function PhotoCircle({ photo, size = 200 }: { photo: Photo; size?: number }) {
  return (
    <div className="hr-pc" style={{ width: size, height: size }} role="img" aria-label={photo.alt}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo.file} alt="" width={520} height={520} draggable={false} />
      <span className="hr-pc-glow" aria-hidden="true" />
    </div>
  );
}
