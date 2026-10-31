// All copy on this site uses verified facts only.

export const profile = {
  name: 'Philip Harmon',
  location: 'Raleigh, North Carolina',
  tagline: 'Software developer & builder.',
  email: 'phharmon@outlook.com',
  phone: '919-986-9553',
  phoneHref: 'tel:+19199869553',
  linkedin: 'https://www.linkedin.com/in/philip-harmon',
  github: 'https://github.com/PhilipHarmon',
  blog: 'https://www.mindless-musings.com',
  resumePath: '/Philip-Harmon-Resume.pdf',
};

export const experience = [
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
      'A VH1 Pop-Up Video-style trivia site: music videos play while researched trivia bubbles pop up, timed to the music. Tap bubbles to pop them, build a queue, shuffle, and get a new pick every day. New songs researched weekly.',
    tags: ['MongoDB', 'Express', 'React', 'Node.js', 'YouTube API'],
    links: [
      { label: 'Live site', href: 'https://bubble-tracks.onrender.com' },
      { label: 'GitHub', href: 'https://github.com/PhilipHarmon/bubble-tracks' },
    ],
    motif: 'T',
  },
  {
    name: 'Story Time',
    kind: 'Story-book app — part of the family apps',
    description:
      'A digital story book for reading together as a family: stories in a simple, kid-friendly reader, built and shipped as part of the family apps.',
    tags: ['React', 'Vite', 'Express', 'MongoDB'],
    links: [
      // PLACEHOLDER: live Story Time URL not yet verified (the bare
      // story-book.onrender.com name returns 404). Once the live URL is
      // known, replace '#' below with '<live URL>?demo=1'.
      { label: 'Demo — coming soon', href: '#' },
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
      // PLACEHOLDER: live Song Book URL not yet verified. Once the live
      // URL is known, replace '#' below with '<live URL>?demo=1'.
      { label: 'Demo — coming soon', href: '#' },
    ],
    motif: '\u266A',
  },
];

export const sprintApps = [
  { name: 'What\u2019s for Dinner?', blurb: 'Weekly meal planner with auto-generated grocery lists.', href: 'https://dinner-menu.onrender.com' },
  { name: 'Mixtape', blurb: 'Digital mixtape builder — Side A / Side B, with a sacred closer.', href: 'https://mixtape.onrender.com' },
  { name: 'Family Trivia Night', blurb: '36-question family gameshow with tiered difficulty.', href: 'https://trivia-night.onrender.com' },
  { name: 'One Day, One Photo', blurb: 'Photo-a-day journal with streaks and a timeline.', href: 'https://photo-journal.onrender.com' },
  { name: 'Movie Night', blurb: 'The debate-ender: a picker for family movie night.', href: 'https://movie-night.onrender.com' },
];

export const earlierProjects = [
  { name: 'Mindless Musings', blurb: 'A full-featured personal MERN blog: markdown editor, likes, comments, subscriber welcome emails and new-post alerts, and social sharing. Live on the web.', tags: ['MongoDB', 'Express', 'React', 'Node.js'], repo: 'https://github.com/PhilipHarmon/personal-blog' },
  { name: 'Porch', blurb: 'A Facebook-style MERN social app built from scratch: profiles, friend requests, a news feed, wall posts, photo galleries, notifications, and a full admin panel. Live at porch-client.onrender.com.', tags: ['MongoDB', 'Express', 'React', 'Node.js'], repo: 'https://github.com/PhilipHarmon/porch' },
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
