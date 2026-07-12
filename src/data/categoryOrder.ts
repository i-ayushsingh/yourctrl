export const CATEGORY_ORDER = [
  "Browsers",
  "Windows OS",
  "Microsoft 365",
  "Communication",
  "Productivity",
  "Email",
  "Utilities",
  "Media Players",
  "Terminal",
  "IDEs",
  "AI Assistants",
  "AI Coding Agents",
  "Version Control",
  "API & Database",
  "Window Management",
  "Security",
  "Graphic Design",
  "Adobe Suite",
  "Video Editing",
  "Audio Production",
  "Gaming/Streaming",
  "Local AI Tools",
  "Screen Recording",
  "Diagramming",
  "3D/CAD",
  "Game Development"
];

export function sortCategories(categories: string[]): string[] {
  return [...categories].sort((a, b) => {
    const idxA = CATEGORY_ORDER.indexOf(a);
    const idxB = CATEGORY_ORDER.indexOf(b);
    
    // If both exist in our order list, sort by their index
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    // If only one exists, put the one that exists first
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    // Otherwise sort alphabetically
    return a.localeCompare(b);
  });
}
