import Reveal from './Reveal';
import { profile } from '../data';

function Icon({ d }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const channels = [
  {
    label: 'Email',
    value: profile.email,
    href: `mailto:${profile.email}`,
    d: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm18 3-10 6L2 7',
  },
  {
    label: 'Phone',
    value: profile.phone,
    href: profile.phoneHref,
    d: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2z',
  },
  {
    label: 'LinkedIn',
    value: 'linkedin.com/in/philip-harmon',
    href: profile.linkedin,
    d: 'M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4V8h4v1.5A6 6 0 0 1 16 8zM2 9h4v12H2zM4 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4z',
  },
  {
    label: 'GitHub',
    value: 'github.com/PhilipHarmon',
    href: profile.github,
    d: 'M9 19c-5 1.5-5-2.5-7-3m14 6v-3.9a3.4 3.4 0 0 0-1-2.6c3.2-.4 6.6-1.6 6.6-7A5.4 5.4 0 0 0 20 8.7a5 5 0 0 0-.1-3.1s-1.2-.4-4 1.5a12.6 12.6 0 0 0-6.4 0C6.7 5.2 5.5 5.6 5.5 5.6a5 5 0 0 0-.1 3.1A5.4 5.4 0 0 0 4 12.6c0 5.4 3.4 6.6 6.6 7a3.4 3.4 0 0 0-1 2.6V23',
  },
  {
    label: 'Blog',
    value: 'mindless-musings.com',
    href: profile.blog,
    d: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z',
  },
];

export default function Contact() {
  return (
    <section id="contact" className="section section-alt">
      <div className="container container-narrow contact-center">
        <Reveal>
          <p className="section-eyebrow">Contact</p>
          <h2 className="section-title">Let&apos;s build something.</h2>
          <p className="section-sub">
            I&apos;m always happy to talk about software, operations, data — or the last great book
            you read. The inbox is open.
          </p>
        </Reveal>
        <Reveal delay={120}>
          <a className="btn btn-accent btn-lg" href={`mailto:${profile.email}`}>
            Say hello
          </a>
        </Reveal>
        <Reveal delay={200}>
          <div className="contact-list">
            {channels.map((c) => (
              <a
                key={c.label}
                className="contact-row"
                href={c.href}
                target={c.href.startsWith('http') ? '_blank' : undefined}
                rel="noreferrer noopener"
              >
                <span className="contact-icon">
                  <Icon d={c.d} />
                </span>
                <span className="contact-text">
                  <span className="contact-label">{c.label}</span>
                  <span className="contact-value">{c.value}</span>
                </span>
                <span className="contact-arrow" aria-hidden="true">↗</span>
              </a>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
