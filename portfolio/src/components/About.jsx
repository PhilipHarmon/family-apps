import Reveal from './Reveal';

export default function About() {
  return (
    <section id="about" className="section">
      <div className="container">
        <Reveal>
          <p className="section-eyebrow">About</p>
          <h2 className="section-title">
            English lit degree. Bar programs. A dispatch headset. <span className="accent-text">Then code.</span>
          </h2>
        </Reveal>
        <div className="about-grid">
          <Reveal delay={100}>
            <p className="lead">
              I&apos;m a software developer in Raleigh, North Carolina — though I arrived by way of an
              English literature degree, a decade running bar programs, and a dispatch headset at
              FedEx. Somewhere along the way I fell in love with building things.
            </p>
          </Reveal>
          <Reveal delay={180}>
            <p>
              At SAS Institute I built full-stack custom controls with JavaScript, Angular, and
              PostgreSQL — and taught other developers how to do it. Since then I&apos;ve shipped a
              personal blog with real readers, a full social network, and a constellation of small
              apps built for the people I love most. I care about software that&apos;s useful, warm,
              and maybe a little fun — and I finish what I start.
            </p>
            <p>
              These days I dispatch across four FedEx stations by day and build at night. I&apos;m
              currently studying for the Microsoft PL-300 (Power BI Data Analyst) certification.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
