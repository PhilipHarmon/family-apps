import Reveal from './Reveal';
import { featuredProjects, sprintApps, earlierProjects, profile } from '../data';

function ProjectLinks({ links }) {
  return (
    <div className="project-links">
      {links.map((l) => (
        <a key={l.label} href={l.href} target="_blank" rel="noreferrer noopener" className="text-link">
          {l.label} <span aria-hidden="true">↗</span>
        </a>
      ))}
    </div>
  );
}

export default function Projects() {
  return (
    <section id="projects" className="section">
      <div className="container">
        <Reveal>
          <p className="section-eyebrow">Projects</p>
          <h2 className="section-title">
            Things I&apos;ve <span className="accent-text">built &amp; shipped</span>
          </h2>
          <p className="section-sub">
            Real apps, live on the web — not tutorials. The big ones first.
          </p>
        </Reveal>

        <div className="featured-grid">
          {featuredProjects.map((p, i) => (
            <Reveal key={p.name} delay={i * 100} className="featured-card">
              <div className="featured-art" aria-hidden="true">
                <span className="featured-motif">{p.motif}</span>
                <span className="featured-shine" />
              </div>
              <div className="featured-body">
                <p className="project-kind">{p.kind}</p>
                <h3>{p.name}</h3>
                <p className="project-desc">{p.description}</p>
                <div className="tag-row">
                  {p.tags.map((t) => (
                    <span key={t} className="tag">
                      {t}
                    </span>
                  ))}
                </div>
                <ProjectLinks links={p.links} />
              </div>
            </Reveal>
          ))}

          <Reveal delay={200} className="featured-card featured-card-wide">
            <div className="featured-body">
              <p className="project-kind">October 2026 · one-week build sprint</p>
              <h3>Five apps in five days</h3>
              <p className="project-desc">
                One week, five builds — small tools for real life, each one designed, built, and
                shipped: a weekly meal planner, a mixtape builder, a family trivia gameshow, a
                photo-a-day journal, and the movie-night debate-ender.
              </p>
              <ul className="sprint-list">
                {sprintApps.map((a) => (
                  <li key={a.name}>
                    <strong>{a.name}</strong>
                    <span>{a.blurb}</span>
                  </li>
                ))}
              </ul>
              <div className="tag-row">
                {['React', 'Vite', 'Express', 'MongoDB'].map((t) => (
                  <span key={t} className="tag">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        </div>

        <Reveal>
          <h3 className="earlier-title">Earlier builds</h3>
        </Reveal>
        <div className="earlier-grid">
          {earlierProjects.map((p, i) => (
            <Reveal key={p.name} delay={(i % 3) * 80} className="earlier-card">
              <h4>{p.name}</h4>
              <p>{p.blurb}</p>
              <div className="tag-row">
                {p.tags.map((t) => (
                  <span key={t} className="tag tag-sm">
                    {t}
                  </span>
                ))}
              </div>
              <a href={profile.github} target="_blank" rel="noreferrer noopener" className="text-link">
                GitHub <span aria-hidden="true">↗</span>
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
