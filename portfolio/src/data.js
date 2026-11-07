// All copy on this site uses verified facts only.

export const profile = {
  name: 'Philip Harmon',
  location: 'Raleigh, North Carolina',
  tagline: 'Software developer & builder.',
  email: 'phharmon@outlook.com',
  emails: ['phharmon@outlook.com', 'philip.harmon@stolenhourssoftware.com'],
  phone: '919-986-9553',
  phoneHref: 'tel:+19199869553',
  linkedin: 'https://www.linkedin.com/in/philip-harmon',
  github: 'https://github.com/PhilipHarmon',
  blog: 'https://www.mindless-musings.com',
  resumePath: '/Philip-Harmon-Resume.pdf',
};

export const experience = [
  {
    role: 'Founder and CEO',
    company: 'Stolen Hours Software',
    place: 'Raleigh, NC',
    dates: '2026 – Present',
    points: [
      'Founded a family software studio; every product is designed, built, and shipped in the hours after the day job and bedtime stories — "Built after bedtime"',
      'Shipped products include The Fridge Door (the family\u2019s private home base), Bubble Tracks, Brewery Compass, and Wyatt\u2019s War Room',
      'Full-stack JavaScript development — MongoDB, Express, React, and Node.js — with every product deployed and live on Render',
      'Owns the full cycle: product design, development, deployment, and ongoing iteration',
    ],
  },
  {
    role: 'CXPC Dispatch',
    company: 'FedEx',
    place: 'Knightdale, NC',
    dates: '2025 – Present',
    points: [
      'Dispatch coverage across four stations, including a legacy Express station',
      'Create, modify, and move pickups to appropriate routes',
      'Monitor on-road routes for pickup reliability',
      'End-of-day reports; partner with management on route efficiency',
    ],
  },
  {
    role: 'Courier',
    company: 'FedEx',
    place: 'Raleigh, NC',
    dates: '2022 – 2025',
    points: [
      'Package delivery and pickup across assigned routes',
      'Shipment conformance checks',
      'Route coverage and customer service',
    ],
  },
  {
    role: 'Senior Associate Solutions Advisor',
    company: 'SAS Institute',
    place: 'Cary, NC',
    dates: '2020 – 2022',
    points: [
      'Built custom controls for SAS Visual Investigator with JavaScript, Angular, and PostgreSQL',
      'Collaborated with the R&D team in Scotland; worked in GitLab, VS Code, and Jira',
      'Created and published five Virtual Learning Environment courses on custom-control development — REST APIs, web components, and JavaScript',
    ],
  },
  {
    role: 'Bar Manager / Beverage Director',
    company: 'Midtown Grille',
    place: 'Raleigh, NC',
    dates: '2013 – 2020',
    points: [
      'Managed the wine program, purchasing from 12–15 distributors',
      'Staff education and specialty cocktail development',
      'Nightly close, cash reconciliation, and monthly inventory — met alcohol-cost goals',
    ],
  },
];

export const featuredProjects = [
  {
    name: 'The Fridge Door',
    kind: 'The family\u2019s private home base — MERN, evolved from Porch',
    description:
      'A private home base for one family: wall posts, a shared calendar, and dinner planning that flows from weekly suggestions to menus to grocery lists — plus a storybooks shelf, kid-safe accounts with PIN sign-in, and circle-based permissions so everyone sees only what\u2019s theirs.',
    tags: ['MongoDB', 'Express', 'React', 'Node.js'],
    links: [
      { label: 'Live site', href: 'https://fridge-door.net' },
      { label: 'GitHub', href: 'https://github.com/PhilipHarmon/porch' },
    ],
    motif: 'F',
  },
  {
    name: 'Brewery Compass',
    kind: 'NC craft brewery guide — MERN rebuild',
    description:
      'A MERN guide cataloguing 259 North Carolina breweries and 5,697 beers: an A–Z browser with tap lists (styles, ABV, IBU), a keyless map with rich hover tooltips, and a plan-a-day itinerary builder with drive times.',
    tags: ['MongoDB', 'Express', 'React', 'Node.js', 'Leaflet'],
    links: [
      { label: 'Live site', href: 'https://brewery-compass.onrender.com' },
      { label: 'GitHub', href: 'https://github.com/PhilipHarmon/brewery-compass' },
    ],
    motif: 'B',
  },
  {
    name: 'Bubble Tracks',
    kind: 'Pop-Up Video-style music trivia — MERN',
    description:
      'A VH1 Pop-Up Video-style trivia site with a library of 635 songs: music videos play while researched trivia bubbles pop up, timed to the music. Tap bubbles to pop them, build a queue, shuffle, and get a new pick every day. New songs researched weekly.',
    tags: ['MongoDB', 'Express', 'React', 'Node.js', 'YouTube API'],
    links: [
      { label: 'Live site', href: 'https://bubble-tracks.onrender.com' },
      { label: 'GitHub', href: 'https://github.com/PhilipHarmon/bubble-tracks' },
    ],
    motif: 'T',
  },
  {
    name: 'Wyatt\u2019s War Room',
    kind: 'Interactive WWII atlas for his son — offline PWA',
    description:
      'A WWII atlas built for a ten-year-old general: seven battle cards from D-Day to VE Day with Omaha Beach as the deep dive, a theater passport that stamps each stop, stop-motion story cards, and Lego accuracy notes. A fully offline PWA — service-worker cached, no accounts, no backend.',
    tags: ['React', 'Vite', 'PWA'],
    links: [
      { label: 'Live site', href: 'https://war-room-f7fi.onrender.com' },
      { label: 'GitHub', href: 'https://github.com/PhilipHarmon/war-room' },
    ],
    motif: 'W',
  },
  {
    name: 'Story Time',
    kind: 'Story-book app — part of the family apps',
    description:
      'A digital story book for reading together as a family: stories in a simple, kid-friendly reader, built and shipped as part of the family apps.',
    tags: ['React', 'Vite', 'Express', 'MongoDB'],
    links: [
      { label: 'Live demo', href: 'https://story-book-hbrh.onrender.com?demo=1' },
    ],
    motif: 'S',
  },
  {
    name: 'Song Book',
    kind: 'Family song book — part of the family apps',
    description:
      'A digital song book that keeps the family\u2019s songs in one easy-to-open place, built and shipped as part of the family apps.',
    tags: ['React', 'Vite', 'Express', 'MongoDB'],
    links: [
      { label: 'Live demo', href: 'https://song-book-sjz1.onrender.com?demo=1' },
    ],
    motif: '\u266A',
  },
];

export const sprintApps = [
  { name: 'What\u2019s for Dinner?', blurb: 'Weekly meal planner with auto-generated grocery lists.', href: 'https://dinner-menu-k07g.onrender.com?demo=1' },
  { name: 'Mixtape', blurb: 'Digital mixtape builder — Side A / Side B, with a sacred closer.', href: 'https://mixtape-hti1.onrender.com?demo=1' },
  { name: 'Family Trivia Night', blurb: '36-question family gameshow with tiered difficulty.', href: 'https://trivia-night-f6zi.onrender.com?demo=1' },
  { name: 'One Day, One Photo', blurb: 'Photo-a-day journal with streaks and a timeline.', href: 'https://photo-journal-t8z4.onrender.com?demo=1' },
  { name: 'Movie Night', blurb: 'The debate-ender: a picker for family movie night.', href: 'https://movie-night-juay.onrender.com?demo=1' },
];

export const earlierProjects = [
  { name: 'Mindless Musings', blurb: 'A full-featured personal MERN blog: markdown editor, likes, comments, subscriber welcome emails and new-post alerts, and social sharing. Live on the web.', tags: ['MongoDB', 'Express', 'React', 'Node.js'], repo: 'https://github.com/PhilipHarmon/personal-blog' },
  { name: 'Hack-or-Snooze', blurb: 'A Hacker News-style clone.', tags: ['JavaScript'], repo: 'https://github.com/PhilipHarmon/Hack-or-Snooze' },
  { name: 'Meme Generator', blurb: 'A Giphy-style meme generator.', tags: ['JavaScript', 'APIs'], repo: 'https://github.com/PhilipHarmon/Springboard-Meme-Generator' },
  { name: 'Giphy Party', blurb: 'Search and play with Giphy GIFs.', tags: ['JavaScript', 'APIs'], repo: 'https://github.com/PhilipHarmon/AJAX-Giphy-Party' },
  { name: 'Color Match', blurb: 'A color-matching game.', tags: ['JavaScript'], repo: 'https://github.com/PhilipHarmon/colorMatchGame' },
  { name: 'Flask-Blogly', blurb: 'A blog engine built with Flask.', tags: ['Python', 'Flask'], repo: 'https://github.com/PhilipHarmon/flask-blogly' },
  { name: 'This-Is-Jeopardy', blurb: 'A playable Jeopardy game.', tags: ['JavaScript'], repo: 'https://github.com/PhilipHarmon/This-Is-Jeopardy' },
  { name: 'NC-Beer-Map', blurb: 'An interactive map of North Carolina breweries.', tags: ['JavaScript', 'Maps'], repo: 'https://github.com/PhilipHarmon/flask-beer' },
  { name: 'Mars Dashboard', blurb: 'NASA imagery explorer: daily astronomy picture plus a searchable photo gallery.', tags: ['JavaScript', 'APIs', 'MongoDB'], repo: 'https://github.com/PhilipHarmon/daily-martian' },
];

export const skills = [
  'JavaScript',
  'Python',
  'React',
  'Angular',
  'CSS',
  'PostgreSQL',
  'Data Analysis',
];

export const education = [
  {
    school: 'North Carolina State University',
    detail: 'B.A., English Literature',
  },
  {
    school: 'UNC-Chapel Hill',
    detail: 'Certificate in Data Analytics',
  },
];
