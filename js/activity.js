// latest commit from my public repos (cached 10 min for the rate limit)

const USER = "CamdenGoddard";
const SKIP = new Set(["CamGod", "portfolio"]);
const CACHE_KEY = "gh-activity-v2";
const CHORE = /readme|release[ _-]?notes|\.(md|txt)\b|typo|\bgif\b|add files via upload|^merge\b|^(update|create|delete|rename) \S+$/i;
const CACHE_MS = 10 * 60 * 1000;

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
  const candidates = repos.filter((r) => !r.fork && !SKIP.has(r.name)).slice(0, 3);
  if (!candidates.length) throw new Error("No public repos");

  // skip README/upload commits
  let repo = candidates[0];
  let commit = null;
  for (const r of candidates) {
    const commits = await getJson(`https://api.github.com/repos/${USER}/${r.name}/commits?per_page=15`);
    const real = commits.find((c) => !CHORE.test(c.commit.message.split("\n")[0]));
    if (real) { repo = r; commit = real; break; }
    if (!commit && commits.length) commit = commits[0];
  }
  if (!commit) throw new Error("No commits");

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
    console.warn("Couldn't load GitHub activity:", e.message);
    el.meta.textContent = "See everything I'm working on at github.com/CamdenGoddard";
    el.box.dataset.state = "fallback";
  });
