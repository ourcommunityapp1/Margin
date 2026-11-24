import type { Metadata } from 'next';
import Link from 'next/link';
import { Crumbs, JsonLd, SITE, SiteFooter, SiteHeader, breadcrumbLd } from '../shell';

const TITLE = 'Privacy: What Katekize Keeps and Who Can See It';
const DESCRIPTION = 'What Katekize stores about you, what friends and other people can see, how to delete your profile, and which services run the app.';
const UPDATED = 'November 24, 2026';
export const metadata: Metadata = {
  title: { absolute: TITLE }, description: DESCRIPTION, alternates: { canonical: `${SITE}/privacy` },
  openGraph: { type: 'website', url: `${SITE}/privacy`, siteName: 'Katekize', title: TITLE, description: DESCRIPTION },
};

export default function Privacy() {
  const trail = [{ name: 'Katekize', href: '/' }, { name: 'Privacy', href: '/privacy' }];
  return (
    <>
      <JsonLd data={breadcrumbLd(trail)} />
      <div className="kz-wrap">
        <SiteHeader />
        <main className="kz-page">
          <Crumbs trail={trail} />
          <h1>Privacy</h1>
          <p className="kz-muted">Updated {UPDATED}</p>
          <p className="kz-answer">Katekize keeps what it needs to teach you and to let friends see how you’re doing. It does not sell your information or show ads. Children in a family are never shown to anyone outside it.</p>

          <section aria-labelledby="keep-h">
            <h2 id="keep-h">What Katekize stores</h2>
            <ul className="kz-list">
              <li><b>Your sign-in.</b> Your email address, used to send you a sign-in code.</li>
              <li><b>Your family and progress.</b> The names you give people in your family, what each has learned, their answers and schedule, days kept and stones. This is private to your account. A linked account (a spouse) can see it, view only.</li>
              <li><b>Your profile, if you make one.</b> Your first and last name, a username, optionally a city and state, and your friends. A profile is optional and you choose whether people can find you.</li>
              <li><b>The numbers friends see.</b> Words in memory, streak, stone counts and course progress, worked out from your lessons.</li>
            </ul>
          </section>

          <section aria-labelledby="see-h">
            <h2 id="see-h">Who can see what</h2>
            <ul className="kz-list">
              <li><b>Anyone signed in, if you let people find you:</b> your first name and last initial, username, city and state, and how many friends you have.</li>
              <li><b>Your friends:</b> your full name, and your streak, words in memory, stones, courses and friends.</li>
              <li><b>Nobody but you:</b> your answers, your mistakes, your family members and your email address.</li>
              <li><b>Children:</b> a profile is for an adult. Children in your family are never searchable and never shown to anyone outside it.</li>
            </ul>
            <p>You can turn off “Let people find me” at any time, remove a friend, or block someone. Blocking hides you from each other everywhere. You must be 13 or older to make a profile.</p>
          </section>

          <section aria-labelledby="del-h">
            <h2 id="del-h">Deleting your profile</h2>
            <p>In the app, open You, then Your profile, then Delete my profile. That removes your profile, your friends’ numbers, your friendships and requests, and the blocks you made. Your lessons and progress stay with your account and are not touched.</p>
            <p>Removing a person from your family keeps their progress for 30 days so you can bring them back, then deletes it.</p>
          </section>

          <section aria-labelledby="who-h">
            <h2 id="who-h">Services that run Katekize</h2>
            <p>Katekize stores its data with Supabase, is hosted on Netlify, and sends sign-in codes by email through Resend. These services handle your data only to run Katekize for you.</p>
          </section>

          <section aria-labelledby="chg-h">
            <h2 id="chg-h">Changes</h2>
            <p>If this changes in a way that matters, the date at the top changes and the app tells people who use it. Back to <Link href="/about">About Katekize</Link>.</p>
          </section>
        </main>
        <SiteFooter />
      </div>
    </>
  );
}
