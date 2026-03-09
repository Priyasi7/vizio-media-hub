import { CATEGORIES, type Category } from "@/types/content";
import type { ReactNode } from "react";

interface NavbarProps {
  active: Category;
  onSelect: (cat: Category) => void;
  children?: ReactNode;
}

const Navbar = ({ active, onSelect, children }: NavbarProps) => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center gap-6 px-8 py-4 bg-gradient-to-b from-background/95 to-transparent backdrop-blur-sm">
      <div className="flex items-center gap-2 mr-8">
        <h1 className="text-2xl font-display tracking-wider text-primary">
          ADDICTA TV
        </h1>
        <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground hidden sm:block">
          Latino Cinema Lives
        </span>
      </div>
      <div className="flex items-center gap-1 flex-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => onSelect(cat.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              active === cat.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>
      {children}
    </nav>
  );
};

export default Navbar;
