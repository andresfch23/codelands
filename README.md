# Codelands

**Turn any codebase into a world you can explore.**

Point Codelands at a repo and get a single HTML file: your code as a coral reef, a city, a solar system, or a lab. Fly through it, hover, click, and ask it questions. A person who has never seen the code understands its shape in five minutes.

<!-- demo.gif: 20 seconds flying through the Hono reef, switching to City, asking "where do requests come in?" -->

![Codelands demo](docs/demo.gif)

```bash
npx codelands ./my-repo
# → codelands.html  (open it, no server needed)
```

Or inside Claude Code:

```
/codelands
```

---

## What you see

Every shape encodes a real measurement. If something looks different, it _is_ different.

| In your code                       | In the Reef theme                       | In the City theme                  |
| ---------------------------------- | --------------------------------------- | ---------------------------------- |
| Module / file                      | A coral, sized by lines of code         | A building, height = lines of code |
| Complexity                         | Smooth brain coral → branching staghorn | Simple box → spires and annexes    |
| Import between modules             | A current; width = how many references  | A road; width = traffic            |
| Entry points (routes, `main`, CLI) | Light shafts from the surface           | Highway on-ramps                   |
| Recently changed code              | Fish swimming around it                 | Traffic                            |
| Failing or missing tests           | Bleached white coral                    | Scaffolding                        |
| Dead code (never imported)         | A sunken ruin at the edge               | An abandoned lot                   |
| Circular imports                   | Corals grown into each other            | Buildings sharing a wall           |
| What you searched for              | Electric violet. Everything else dims.  | Same                               |

Themes at launch: **Reef** (default), **City**, **Solar System**, **Laboratory**, **Trading-Card Binder**, **Circuit Board**. Switch themes inside the file; nothing is regenerated. Codelands can also suggest a theme from what your repo does: a pharmacy system reads like a lab, a card-game shop like a binder.

## Ask the world

Type a question in the box at the bottom:

> where does a refund get processed?

The camera flies to the module, and the path from the entry point to it lights up in violet. Click any element for a plain-language explanation: what it does, who calls it, and what breaks if you delete it.

The answers come from the map, not from guessing: the question is sent to Claude together with the slice of the analysis that matters, so it can only talk about code that exists.

## Why I built it

Every time I open a codebase I didn't write, I lose two days to the same question: _what is the shape of this thing?_ Diagrams help, but someone has to draw them, and they're stale by the time they're finished.

I wanted the map to come from the code itself, to be beautiful enough that I'd actually keep it open, and to be something I could hand to a manager or a client and say "this is what we built." Codelands is that: no drawing, no server, one file, and you can talk to it.

## How it compares

|                                     | Codelands | Mermaid / PlantUML | draw.io / Excalidraw | Dependency graph tools |
| ----------------------------------- | --------- | ------------------ | -------------------- | ---------------------- |
| Generated from the real code        | Yes       | No, you write it   | No, you draw it      | Yes                    |
| Shows size, churn, tests, dead code | Yes       | No                 | No                   | Usually imports only   |
| Explorable in 3D, ask questions     | Yes       | No                 | No                   | No                     |
| Explains a module in plain language | Yes       | No                 | No                   | No                     |
| Needs a server or account           | No        | No                 | No                   | Often                  |
| Editable by hand                    | No        | Yes                | Yes                  | No                     |

## Install

**One-off:**

```bash
npx codelands ./path/to/repo
```

**As a Claude Code skill** (lets Claude run it, explain the result, and suggest a theme):

```bash
npx skills add codelands
```

**Options:**

```bash
npx codelands ./repo --theme city        # pick a theme
npx codelands ./repo --out map.html      # output file
npx codelands ./repo --no-ai             # map only, no explanations, no API key needed
```

Explanations and the question box use your own Anthropic API key (`ANTHROPIC_API_KEY`). Without it you still get the full map.

## How it works

1. **Analyze.** A static analyzer reads the repo and writes `codelands.json`: folders, files, sizes, imports, entry points, churn from git, test status, dead code, cycles. No AI here; it's fast and deterministic. TypeScript and JavaScript today; Python and Go next.
2. **Understand.** A coordinator agent spawns one subagent per folder cluster. Each reads only its files and writes a short explanation and "what breaks if deleted" to a scratchpad. The coordinator merges them into the JSON. Large repos never blow the context window because no single agent sees the whole thing.
3. **Render.** A fixed Three.js template loads the JSON and draws the world. The agent never writes drawing code, only data, so every run looks consistent and a new theme is a config file.
4. **Ask.** The question box sends your question plus the relevant slice of the JSON to Claude and gets back an answer and the modules to highlight.

## When not to use it

- You want a diagram you can edit by hand. Use Excalidraw.
- Your repo is under 20 files. You'll understand it faster by reading it.
- You need exact dependency resolution for a build. Use your bundler's analyzer.
- Your code is not TypeScript, JavaScript, Python or Go (yet).

## Roadmap

- [ ] Milestone 1: Reef and City themes, analyzer for TS/JS, hover and click, demo on Hono
- [ ] Milestone 2: AI explanations, theme suggestion, the question box
- [ ] Milestone 3: Claude Code skill, `npx` CLI, four more themes
- [ ] Later: time travel over the last 100 commits; compare a branch against main; Python and Go

## License

MIT
