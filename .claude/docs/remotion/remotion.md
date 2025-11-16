---
image: /generated/articles-docs-ai-index.png
crumb: 'Artificial Intelligence'
title: Building with Remotion and AI
---

import {TableOfContents} from './TableOfContents';

We are interested in how AI can help with realizing Remotion projects.

Here are a few ways you can use AI in your Remotion workflow today:

<TableOfContents />

## AI-Ready Documentation

Remotion docs are optimized for AI agents:

- **Copy as Markdown**: Click the copy button on any doc page to copy raw markdown
- **Markdown URLs**: Add `.md` to any doc URL (e.g., `remotion.dev/docs/player.md`) to view/fetch raw markdown
- **Content negotiation**: Remotion docs respect the `Accept` header - request `text/markdown` to get markdown instead of HTML. Paste any Remotion doc link into Claude Code, opencode, or other AI coding agents and they'll automatically fetch the markdown version

---
image: /generated/articles-docs-ai-system-prompt.png
crumb: 'AI'
title: Remotion System Prompt for LLMs
sidebar_label: System Prompt
---

This is a prompt that you can give to Large Language Models to teach them the mechanics and rules of Remotion.  
You can then prompt the LLMs to generate Remotion Code for you.

## System Prompt

import {SystemPrompt} from '../../components/SystemPrompt';

<SystemPrompt />

## llms.txt

This file is also hosted under https://www.remotion.dev/llms.txt, as per [convention](https://llmstxt.org).
