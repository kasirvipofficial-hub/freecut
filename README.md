# FreeCut

**Modern browser-based video editor built with React 19 and Remotion**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

<!-- TODO: Add screenshot or demo GIF here -->
<!-- ![FreeCut Editor](./docs/images/screenshot.png) -->

FreeCut is a professional-grade video editor that runs entirely in your browser. Create stunning videos with multi-track editing, real-time preview, and high-quality exports - no software installation required.

## Features

- **Multi-Track Timeline** - Edit video, audio, text, and shapes on separate tracks
- **Real-Time Preview** - See your changes instantly with smooth playback
- **Professional Effects** - Transitions, fade in/out, opacity, and keyframe animations
- **Text Overlays** - Add customizable text with fonts, colors, and positioning
- **Shape Tools** - Create rectangles, circles, polygons, and stars
- **Audio Editing** - Waveform visualization, volume control, and audio fades
- **Video Thumbnails** - Filmstrip preview for easy navigation
- **Undo/Redo** - Full history support for confident editing
- **High-Performance Storage** - Lightning-fast local storage using OPFS
- **Server-Side Export** - High-quality video rendering with Remotion

## Quick Start

### Prerequisites

- Node.js 18 or higher
- npm 9 or higher

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/freecut.git
cd freecut

# Install dependencies
npm install
```

### Running FreeCut

```bash
# Start the development server
npm run dev

# In a separate terminal, start the backend server (required for video export)
npm run server

# Or run both together
npm run dev:all
```

Open your browser to [http://localhost:5173](http://localhost:5173)

### Basic Workflow

1. **Create a Project** - Click "New Project" from the projects page
2. **Import Media** - Drag and drop video, audio, or image files into the media library
3. **Edit** - Drag clips to the timeline, trim, arrange, and add effects
4. **Preview** - Use the player to review your edits in real-time
5. **Export** - Render your final video in high quality

## Browser Support

| Browser | Minimum Version |
|---------|-----------------|
| Chrome  | 102+ |
| Edge    | 102+ |
| Safari  | macOS 12.2+ / iOS 15.2+ |
| Firefox | Latest |

> **Note:** FreeCut uses modern browser APIs like OPFS (Origin Private File System) for optimal performance. Some features may not work in older browsers.

## Tech Stack

- [React 19](https://react.dev/) - UI framework
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- [Remotion](https://www.remotion.dev/) - Video rendering engine
- [Tailwind CSS](https://tailwindcss.com/) - Styling

## Development

### Available Scripts

```bash
npm run dev        # Start development server (port 5173)
npm run server     # Start backend server (port 3001)
npm run dev:all    # Run both dev and server concurrently
npm run build      # Build for production
npm run lint       # Run ESLint
```

### Project Structure

```
freecut/
├── src/
│   ├── features/       # Core feature modules
│   │   ├── editor/     # Main editing workspace
│   │   ├── timeline/   # Multi-track timeline
│   │   ├── preview/    # Video preview player
│   │   ├── export/     # Video export functionality
│   │   └── ...
│   ├── components/     # Reusable UI components
│   ├── lib/            # Shared libraries
│   └── stores/         # State management
├── server/             # Backend for video rendering
└── .claude/docs/       # Developer documentation
```

## Documentation

For developers looking to contribute or extend FreeCut, detailed documentation is available in `.claude/docs/video-editor/`:

- Architecture and component structure
- State management patterns
- Storage architecture (OPFS + IndexedDB)
- Timeline component API
- Video rendering integration

## Contributing

Contributions are welcome! Here's how you can help:

1. **Report Bugs** - Open an issue describing the problem
2. **Suggest Features** - Share your ideas in the discussions
3. **Submit PRs** - Fork the repo, make your changes, and submit a pull request

Please read our contributing guidelines before submitting a PR.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

Built with these amazing open source projects:

- [Remotion](https://www.remotion.dev/) - Programmatic video creation
- [TanStack Router](https://tanstack.com/router) - Type-safe routing
- [Zustand](https://github.com/pmndrs/zustand) - State management
- [Shadcn/ui](https://ui.shadcn.com/) - UI components
- [Vite](https://vitejs.dev/) - Build tooling

---

Made with care for creators everywhere.
