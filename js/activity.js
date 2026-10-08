// "Currently working on": shows the most recent commit across my public
// GitHub repos, using GitHub's public REST API straight from the browser.
// Results are cached for 10 minutes so repeat visits don't use up the
// unauthenticated rate limit (60 requests per hour per visitor).

const USER = "CamdenGoddard";
const SKIP = new Set(["CamGod", "portfolio"]); // this site itself
const CACHE_KEY = "gh-activity-v1";
const CACHE_MS = 10 * 60 * 1000;

// Friendlier names for repos that have them.
const NAMES = {
  Paint: "Paint, a Java image editor",
  WaveVisualizer: "Wave, a 3D audio visualizer",
  firstwords: "Firstwords, an AI interview practice tool"
};

const el = {
  box: document.getElementById("activity"),
  repo: document.getElementById("activityRepo"),
  message: document.getElementById("activityMessage"),
  meta: document.getElementById("activityMeta")
};

function timeAgo(date) {
  const s = Math.round((Date.now() - date.getTime()) / 1000);
  const units = [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60]];
  for (const [unit, secs] of units) {
    const n = Math.floor(s / secs);
    if (n >= 1) return `${n} ${unit}${n > 1 ? "s" : ""} ago`;
  }
  return "just now";
}

async function getJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
  if (!res.ok) throw new Error(`GitHub ${res.status}`);
  return res.json();
}

async function latestCommit() {
  try {
    const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || "null");
    if (cached && Date.now() - cached.at < CACHE_MS) return cached.data;
  } catch (e) { /* storage unavailable */ }

  const repos = await getJson(`https://api.github.com/users/${USER}/repos?sort=pushed&per_page=10`);
  const repo = repos.find((r) => !r.fork && !SKIP.has(r.name));
  if (!repo) throw new Error("No public repos");
  const [commit] = await getJson(`https://api.github.com/repos/${USER}/${repo.name}/commits?per_page=1`);

  const data = {
    repo: repo.name,
    repoUrl: repo.html_url,
    message: commit.commit.message.split("\n")[0],
    sha: commit.sha.slice(0, 7),
    commitUrl: commit.html_url,
    date: commit.commit.author.date
  };
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data })); } catch (e) { /* ignore */ }
  return data;
}

latestCommit()
  .then((c) => {
    el.repo.textContent = NAMES[c.repo] || c.repo;
    el.repo.href = c.repoUrl;
    el.message.textContent = c.message;
    el.message.href = c.commitUrl;
    const when = new Date(c.date);
    el.meta.innerHTML = "";
    const sha = document.createElement("code");
    sha.textContent = c.sha;
    const time = document.createElement("time");
    time.dateTime = c.date;
    time.title = when.toLocaleString();
    time.textContent = `Last commit ${timeAgo(when)}`;
    el.meta.append(time, sha);
    el.box.dataset.state = "live";
  })
  .catch((e) => {
    // Keep the static fallback that's already in the HTML.
    console.warn("Couldn't load GitHub activity:", e.message);
    el.meta.textContent = "See everything I'm working on at github.com/CamdenGoddard";
    el.box.dataset.state = "fallback";
  });
