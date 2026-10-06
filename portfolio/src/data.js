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
    name: 'Mindless Musings',
    kind: 'Personal MERN blog — live on the web',
    description:
      'A full-featured personal blog: markdown editor with formatting toolbar, likes, comments, subscriber welcome emails and new-post alerts, and social sharing. Deployed and live.',
    tags: ['MongoDB', 'Express', 'React', 'Node.js'],
    links: [
      { label: 'Live site', href: 'https://www.mindless-musings.com' },
      { label: 'GitHub', href: 'https://github.com/PhilipHarmon/personal-blog' },
    ],
    motif: 'M',
  },
  {
    name: 'Porch',
    kind: 'Facebook-style MERN social app',
    description:
      'A social network built from scratch: profiles with cover photos, friend requests, a news feed, wall posts, photo galleries, notifications with an unread badge, and a full admin panel.',
    tags: ['MongoDB', 'Express', 'React', 'Node.js'],
    links: [{ label: 'GitHub', href: 'https://github.com/PhilipHarmon/porch' }],
    motif: 'P',
  },
];

export const sprintApps = [
  { name: 'What\u2019s for Dinner?', blurb: 'Weekly meal planner with auto-generated grocery lists.' },
  { name: 'Mixtape', blurb: 'Digital mixtape builder — Side A / Side B, with a sacred closer.' },
  { name: 'Family Trivia Night', blurb: '36-question family gameshow with tiered difficulty.' },
  { name: 'One Day, One Photo', blurb: 'Photo-a-day journal with streaks and a timeline.' },
  { name: 'Movie Night', blurb: 'The debate-ender: a picker for family movie night.' },
];

export const earlierProjects = [
  { name: 'Hack-or-Snooze', blurb: 'A Hacker News-style clone.', tags: ['JavaScript'] },
  { name: 'Meme Generator', blurb: 'A Giphy-style meme generator.', tags: ['JavaScript', 'APIs'] },
  { name: 'Flask-Blogly', blurb: 'A blog engine built with Flask.', tags: ['Python', 'Flask'] },
  { name: 'This-Is-Jeopardy', blurb: 'A playable Jeopardy game.', tags: ['JavaScript'] },
  { name: 'NC-Beer-Map', blurb: 'An interactive map of North Carolina breweries.', tags: ['JavaScript', 'Maps'] },
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
