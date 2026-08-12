"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const VIDA_LINKS = [
  { href: "/", label: "Dashboard", exact: true },
  { href: "/clientes", label: "Clientes", exact: false },
  { href: "/clientes/novo", label: "Novo", exact: true },
  { href: "/importar", label: "Importar", exact: true },
];

const OUTROS_LINKS = [
  { href: "/residencial", label: "Dashboard", exact: true },
  { href: "/residencial/clientes", label: "Clientes", exact: false },
  { href: "/residencial/clientes/novo", label: "Novo", exact: true },
  { href: "/residencial/importar", label: "Importar", exact: true },
];

export default function NavBar() {
  const pathname = usePathname();

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href;
    return pathname === href || (pathname.startsWith(href + "/") && !pathname.startsWith(href + "/novo"));
  }

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--text-muted)",
    padding: "0 6px",
    opacity: 0.7,
  };

  const dividerStyle: React.CSSProperties = {
    width: 1,
    height: 20,
    background: "currentColor",
    opacity: 0.15,
    margin: "0 4px",
    alignSelf: "center",
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <span className="brand">CRM Seguros</span>
        <nav className="nav-links">
          <span style={sectionLabelStyle}>Vida</span>
          {VIDA_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link${isActive(link.href, link.exact) ? " active" : ""}`}
            >
              {link.label}
            </Link>
          ))}
          <span style={dividerStyle} />
          <span style={sectionLabelStyle}>Res./Empresarial</span>
          {OUTROS_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link${isActive(link.href, link.exact) ? " active" : ""}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
