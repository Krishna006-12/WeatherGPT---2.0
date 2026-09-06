import { Cloud, Grid, Globe, AlertTriangle, History, Settings } from "lucide-react";
import Link from "next/link";

export function Sidebar() {
  return (
    <div className="w-16 flex flex-col items-center py-6 bg-neutral-950 border-r border-neutral-800 shrink-0">
      <div className="mb-8 text-cyan-400">
        <Cloud size={28} />
      </div>
      <div className="flex flex-col gap-6 w-full items-center">
        <NavItem icon={<Grid size={22} />} active />
        <NavItem icon={<Globe size={22} />} />
        <NavItem icon={<AlertTriangle size={22} />} />
        <NavItem icon={<History size={22} />} />
      </div>
      <div className="mt-auto">
        <NavItem icon={<Settings size={22} />} />
      </div>
    </div>
  );
}

function NavItem({ icon, active }: { icon: React.ReactNode; active?: boolean }) {
  return (
    <Link href="/" className={`p-3 rounded-xl transition-colors ${active ? "bg-cyan-900/40 text-cyan-400" : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"}`}>
      {icon}
    </Link>
  );
}

