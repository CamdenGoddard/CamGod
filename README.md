# Portfolio

My personal site: projects, about, resume and contact.

The background is a canvas of drifting dots that move away from the pointer and link up around it (`js/dots.js`). The "Currently working on" panel shows my most recent commit across my public repos, fetched from the GitHub REST API in the browser and cached for 10 minutes (`js/activity.js`).

Plain HTML, CSS and JavaScript with no build step, deployed to Cloudflare Workers as static assets.

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```
