import {
  Binary,
  Book,
  BookOpen,
  Brain,
  ChartNoAxesColumn,
  ClipboardList,
  Cpu,
  Database,
  FileClock,
  FileText,
  Globe,
  Link as LinkIcon,
  Network,
  NotebookPen,
  Presentation,
  Rocket,
  Settings2,
  Shield,
  Sigma,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";

const registry = {
  book: Book,
  "book-open": BookOpen,
  brain: Brain,
  chart: ChartNoAxesColumn,
  "clipboard-list": ClipboardList,
  cpu: Cpu,
  database: Database,
  file: FileText,
  "file-clock": FileClock,
  globe: Globe,
  link: LinkIcon,
  network: Network,
  notebook: NotebookPen,
  presentation: Presentation,
  rocket: Rocket,
  settings: Settings2,
  shield: Shield,
  sigma: Sigma,
  binary: Binary,
  video: Video,
} as const;

export type IconName = keyof typeof registry;
export const iconNames = Object.keys(registry) as IconName[];

export function SubjectIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = registry[(name as IconName) ?? "book"] ?? Book;
  return <Icon className={cn("h-[1.15rem] w-[1.15rem]", className)} aria-hidden />;
}
