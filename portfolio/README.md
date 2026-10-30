# Deep Narayan Prasad — Portfolio

A responsive static portfolio website built with HTML, CSS, and vanilla JavaScript. It has no build step or runtime dependencies and can be hosted on GitHub Pages.

## Preview locally

Open `index.html` in a browser, or serve this folder with any static file server. For example, if Python is installed:

```sh
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Customize

- Edit the portfolio content in `index.html`.
- **Years of experience are calculated automatically** from each job's `data-start` / `data-end` attributes in the Experience timeline (omit `data-end` for your current role; mark software roles with `data-dev`). The hero, stats, code card, and per-role durations update on their own, so the numbers stay accurate over time.
- Adjust colors, typography, and layouts in `css/style.css`.
- Theme toggle behavior is in `js/main.js`; dark mode is the default and the visitor's choice is remembered.
- Animations live in `css/style.css` and `js/main.js`: preloader, interactive particle network, letter/word reveals, text scramble, typing effect, typed code card, floating chips, rotating badge, scroll-reactive marquee tapes, scroll-scrubbed text, count-up stats, self-drawing timeline, 3D tilt + spotlight cards, animated gradient borders, magnetic/ripple buttons, custom cursor, circular theme transition, scrollspy nav, scroll progress, and confetti when the form is sent. Everything is disabled for visitors who prefer reduced motion.
- The contact form uses [FormSubmit](https://formsubmit.co) to email `nideep77@gmail.com`. **After deploying, submit the form once and click the activation link FormSubmit emails you**; messages only arrive after that. If it fails, the form shows a direct email link.
- Add GitHub and LinkedIn links if you want to share those profiles.
- The phone number is intentionally not published. Add a resume file/link only if you want to make it public.

## Publish with GitHub Pages

1. Create a GitHub repository. For a user site, name it `<your-github-username>.github.io`; otherwise, any repository name works.
2. Add these files to the repository's root and push them to the `main` branch.
3. In the repository, open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**, select `main` and `/(root)`, then save.
5. After GitHub Pages finishes deploying, open the URL shown in the Pages settings.

The site's local asset paths are relative, so they also work when deployed under a project repository path.
