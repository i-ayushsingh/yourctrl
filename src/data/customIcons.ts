// Hand-picked icon overrides (app_name -> filename in src/assets/custom).
// Highest priority — beats all other icon sources.
export const customIcons: Record<string, string> = {
  Helium: "helium.svg",
  "Sublime Text": "sublime-text.svg",
  Neovim: "neovim.svg",
  Anytype: "anytype.svg",
  "Things 3": "things.webp",
  "Flow Browser": "flow-browser.png",
  Void: "void.png",
  Emdash: "emdash.png",
  Paseo: "paseo.svg",
  ZCode: "zcode.svg",
  "Affinity Designer": "affinity.svg",
  Canva: "canva.svg",
  Filmora: "filmora.svg",
  "Flow Launcher": "flow-launcher.svg",
  Shotcut: "shotcut.png",
  "MPC-HC": "mpc-hc.png",
  "Super Productivity": "super-productivity.svg",
  PowerToys: "powertoys.svg",
  PeaZip: "peazip.svg",
  WinRAR: "winrar.svg",
  // PDF Readers
  "Sumatra PDF": "sumatra-pdf.png",
  "Adobe Acrobat Reader": "adobe-acrobat.svg",
  // Terminals
  "Windows Terminal": "windows-terminal.svg",
  "Wave Terminal": "wave-terminal.png",
  Kitty: "kitty.png",
  Tabby: "tabby.svg",
  // Git Clients
  "GitHub Desktop": "github-desktop.svg",
  Fork: "fork.png",
  // Database Tools
  TablePlus: "tableplus.png",
  GlazeWM: "glazewm.webp",
  Komorebi: "komorebi.png",
  // DAW / Audio Production
  "Ableton Live": "ableton.svg",
  "FL Studio": "fl-studio.png",
  Reaper: "reaper.png",
  Cubase: "cubase.jpg",
  Soundly: "soundly.jpg",
  // CAD / 3D
  FreeCAD: "freecad.svg",
  // Screen Recording
  "OBS Studio": "obs-studio.svg",
  // AI / LLM Tools
  Jan: "jan.svg",
  Msty: "msty.jpg",
  GPT4All: "gpt4all.png",
  // Screenshot Tools
  CleanShot: "cleanshotx.png",
  "CleanShot X": "cleanshotx.png",
  Snagit: "snagit.png",
  // Diagram / Design
  Whimsical: "whimsical.png",
  // Game Development
  CryEngine: "cryengine.png",
  "RPG Maker": "rpg-maker.png",
  GDevelop: "gdevelop.png",
  // Adobe Suite
  "Lightroom Classic": "lightroom-classic.svg",
  Audition: "adobe-audition.png",
  Animate: "adobe-animate.webp",
  Bridge: "adobe-bridge.png",
  // Windows Built-in Apps
  "File Explorer": "file-explorer.svg",
  "Task Manager": "task-manager.png",
  Notepad: "notepad.svg",
  Paint: "paint.png",
  "Snipping Tool": "snipping-tool.png",
  Calculator: "calculator.png",
  "Control Panel": "control-panel.png",
  // Microsoft Office
  "Microsoft Visio": "visio.svg",
  "Microsoft Publisher": "publisher.svg",
  "Power Automate Desktop": "power-automate.svg",
  "Microsoft Project": "project.png",
  "Microsoft Planner": "planner.png",
};

// Monochrome (single-color) custom icons — inverted in dark mode to stay visible.
export const customMono = new Set<string>(["ZCode", "Filmora", "GitHub Desktop", "OBS Studio", "Tabby"]);
