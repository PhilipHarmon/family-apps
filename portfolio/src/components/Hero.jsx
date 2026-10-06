import { profile } from '../data';

export default function Hero() {
  return (
    <section className="hero" id="top">
      <div className="hero-glow" aria-hidden="true" />
      <div className="hero-inner">
        <p className="hero-eyebrow reveal revealed">Raleigh, North Carolina</p>
        <h1 className="hero-title reveal revealed" style={{ transitionDelay: '80ms' }}>
          Philip Harmon
        </h1>
        <p className="hero-tagline reveal revealed" style={{ transitionDelay: '160ms' }}>
          Software developer <span className="amp">&amp;</span> builder.
        </p>
        <p className="hero-sub reveal revealed" style={{ transitionDelay: '240ms' }}>
          I blend hands-on operations leadership with full-stack development — and I ship.
          Blogs, social networks, and small apps people actually use.
        </p>
        <div className="hero-ctas reveal revealed" style={{ transitionDelay: '320ms' }}>
          <a className="btn btn-accent" href="#projects">
            View Work
          </a>
          <a className="btn btn-ghost" href={profile.resumePath} download>
            Download Resume
          </a>
          <a className="btn btn-ghost" href="#contact">
            Get in Touch
          </a>
        </div>
        <div className="hero-tech reveal revealed" style={{ transitionDelay: '400ms' }}>
          {['JavaScript', 'React', 'Python', 'PostgreSQL', 'Angular'].map((t) => (
            <span key={t} className="hero-tech-item">
              {t}
            </span>
          ))}
        </div>
      </div>
      <a className="hero-scroll" href="#about" aria-label="Scroll to about">
        <span />
      </a>
    </section>
  );
}
