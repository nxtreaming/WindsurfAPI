# v3.0.0 — A New Chapter

2026-07-09 (UTC+9)

Today isn't just another release.

It marks the beginning of a new chapter for this project.

When I first started **WindsurfAPI**, the goal was surprisingly simple: I just wanted a stable solution for my own daily use. I never expected it to become an open-source project that so many people would actually use.

At that time, there were very few open-source projects exploring this direction publicly. Even while the project was still incomplete, it received far more stars, issues, discussions, and pull requests than I had imagined. That support became the motivation to continue improving it release after release.

Over the past months, the project has grown far beyond its original scope.

Today it is capable of:

* Reverse proxying the latest Devin cloud models
* Native Tool Call support
* Vision / image understanding
* Fable 5 coding and code reading
* OpenAI / Anthropic / Gemini compatible APIs
* Running entirely on Node.js with **zero npm runtime dependencies**

Keeping the project dependency-free has always been intentional. I wanted every line of code to be understandable, auditable, and easy to deploy without bringing in an entire ecosystem of packages.

---

## Community

Thank you to everyone who opened issues, submitted pull requests, tested edge cases, and patiently reported bugs.

Some issues took me much longer to solve than they should have. Some answers were delayed. Some problems remained unresolved for longer than anyone wanted.

For that, I sincerely apologize.

Every report helped make the project better, even if I wasn't able to respond as quickly or as perfectly as I hoped.

Thank you for staying with this project.

---

## What's New in v3.0.0

This release represents the largest architectural update since the project began.

Highlights include:

* Major Devin Connect improvements
* OAuth workflow refinements
* Dashboard redesign and new management features
* Stronger internationalization (i18n) system and validation
* Improved model catalog synchronization
* Better compatibility with OpenAI / Anthropic / Gemini clients
* Expanded automated testing and release validation
* Numerous internal optimizations and stability improvements

This version also introduces a much stronger localization audit, helping prevent untranslated UI text from slipping into future releases.

---

## Demo

A real-world demonstration is available on Bilibili:

https://www.bilibili.com/video/BV1AfM56BE5t

The video isn't professionally produced, but it shows the project running in real-world scenarios, which I believe is more valuable than polished marketing.

---

## About the Name

One funny problem remains.

The backend now talks to Devin.

The frontend still carries the history of Windsurf.

Both ecosystems coexist.

So... is this project called **DevinAPI**?

Or is it still **WindsurfAPI**?

Maybe one day I'll end up calling it **WinDeSurfingAPI**.

Whatever the name becomes in the future, the goal stays the same:

Build a simple, transparent, dependency-free AI gateway that anyone can understand, deploy, and improve.

Thank you for being part of this journey.

See you in the next release.
