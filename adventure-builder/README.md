# Adventure Builder

Family missions, made to order. Pick who's coming and what kind of
adventure; the app builds a mission with a role for every participant,
an age-mixed scavenger hunt, and a storybook briefing — then switches
to a big-button live mode for running the mission in the park.

One of the family's suite of apps (family-apps repo), sharing the
family-api backend. Build the mission at home on the laptop; it syncs
through family-api so the same mission is waiting on a phone out on
the adventure. An on-device cache means the mission still opens with
no signal; anything checked off offline syncs when the connection
returns.

Run it with `npm install && npm run dev`, build with `npm run build`.
Open `?demo=1` for a self-contained demo that never touches the real
family API. Generator tests: `npm test`.
