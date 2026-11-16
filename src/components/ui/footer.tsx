"use client";

import * as React from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Github, Mail, MessageCircle } from "lucide-react";

interface SocialLink {
  name: string;
  href: string;
}

interface FooterLink {
  name: string;
  href?: string;
  className?: string;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

interface FooterProps extends React.HTMLAttributes<HTMLElement> {
  brand: {
    name: string;
    description: string;
  };
  socialLinks: SocialLink[];
  columns: FooterColumn[];
  copyright?: string;
}

function FooterHref({ href, children, className, ariaLabel }: { href: string; children: React.ReactNode; className?: string; ariaLabel?: string }) {
  if (href.startsWith("/") && !href.startsWith("//")) {
    return <Link to={href} className={className} aria-label={ariaLabel}>{children}</Link>;
  }
  return <a href={href} className={className} aria-label={ariaLabel} target="_blank" rel="noopener noreferrer">{children}</a>;
}

export const Footer = React.forwardRef<HTMLElement, FooterProps>(
  ({ className, brand, socialLinks, columns, copyright, ...props }, ref) => (
    <footer ref={ref} className={cn("w-full", className)} {...props}>
      <div className="mx-auto w-full max-w-none px-5 sm:px-8 lg:px-12 2xl:px-16">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-4 lg:col-span-3">
            <Link to="/" className="inline-flex items-center gap-3 text-xl font-semibold tracking-tight text-foreground transition-colors duration-200 hover:text-[#b4232c]">
              <span className="portal-footer-brand-name">APML <i>Portal</i></span>
            </Link>
            <p className="mt-2 max-w-md text-sm leading-6 text-foreground/60">
              {brand.description}
            </p>
            <div className="apml-footer-socials" aria-label="Social links">
              {socialLinks.map((link) => {
                const key = link.name.toLowerCase();
                const Icon = key.includes("whatsapp") ? MessageCircle : key.includes("github") ? Github : key.includes("gmail") || key.includes("email") ? Mail : null;
                return (
                  <FooterHref key={link.name} href={link.href} className="apml-footer-social" ariaLabel={link.name}>
                    {Icon ? <Icon aria-hidden="true" /> : <span aria-hidden="true">{link.name === "X" ? "𝕏" : "GH"}</span>}
                  </FooterHref>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 sm:grid-cols-2 md:col-span-8 lg:col-span-9 lg:grid-cols-4 lg:gap-6">
            {columns.map(({ title, links }) => (
              <div key={title} className="min-w-0">
                <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                <ul className="mt-3 space-y-2.5">
                  {links.map(({ name, href, className }) => (
                    <li key={name}>
                      <FooterHref
                        href={href || "#"}
                        className={cn("group inline-flex items-center text-sm text-foreground/60 transition-colors duration-200 hover:text-[#b4232c]", className)}
                      >
                        {name}
                      </FooterHref>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 border-t border-border/70 pt-4">
          {copyright && <p className="text-xs text-foreground/55">{copyright}</p>}
          <p className="mt-2 text-[10px] font-medium tracking-[0.01em] text-foreground/45">
            Developed &amp; maintained by{" "} 
            <Link to="/about" className="font-semibold text-[#b91c1c] transition-colors hover:text-[#991b1b] hover:underline">
              PRASAD <span className="text-[#b91c1c]">KUNDAR</span>
            </Link>
          </p>
        </div>
      </div>
    </footer>
  ),
);

Footer.displayName = "Footer";
