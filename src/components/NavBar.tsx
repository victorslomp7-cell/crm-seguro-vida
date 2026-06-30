"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/clientes", label: "Clientes" },
  { href: "/clientes/novo", label: "Novo cliente" },
  { href: "/importar", label: "Importar planilha" },
];

export default function NavBar() {
  const pathname = usePathname();
  return (
    <header className="navbar">
      <div className="navbar-inner">
        <span className="brand">CRM Seguro de Vida</span>
        <nav className="nav-links">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link${pathname === link.href ? " active" : ""}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
