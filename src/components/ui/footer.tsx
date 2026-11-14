"use client";

import * as React from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface SocialLink {
  name: string;
  href: string;
}

interface FooterLink {
  name: string;
  Icon: LucideIcon | React.FC<React.SVGProps<SVGSVGElement>>;
  href?: string;
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

function FooterHref({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  if (href.startsWith("/") && !href.startsWith("//")) {
    return <Link to={href} className={className}>{children}</Link>;
  }
  return <a href={href} className={className} target={href.startsWith("mailto:") ? undefined : "_blank"} rel="noopener noreferrer">{children}</a>;
}

export const Footer = React.forwardRef<HTMLElement, FooterProps>(
  ({ className, brand, socialLinks, columns, copyright, ...props }, ref) => (
    <footer ref={ref} className={cn("w-full", className)} {...props}>
      <div className="mx-auto w-full max-w-none px-5 sm:px-8 lg:px-12 2xl:px-16">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-4 lg:col-span-3">
            <Link to="/" className="text-xl font-semibold tracking-tight text-foreground">
              {brand.name}
            </Link>
            <p className="mt-2 max-w-md text-sm leading-6 text-foreground/60">
              {brand.description}
            </p>
            <p className="mt-3 text-sm font-light text-foreground/55">
              {socialLinks.map((link, index) => (
                <React.Fragment key={link.name}>
                  <FooterHref href={link.href} className="transition-colors hover:text-foreground/90">
                    {link.name}
                  </FooterHref>
                  {index < socialLinks.length - 1 && " • "}
                </React.Fragment>
              ))}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:col-span-8 lg:col-span-9 lg:gap-10">
            {columns.map(({ title, links }) => (
              <div key={title} className="min-w-0">
                <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                <ul className="mt-3 space-y-2.5">
                  {links.map(({ name, Icon, href }) => (
                    <li key={name}>
                      <FooterHref
                        href={href || "#"}
                        className="group inline-flex items-center text-sm text-foreground/60 transition-colors hover:text-foreground/90"
                      >
                        <Icon aria-hidden="true" className="mr-2 h-4 w-4 shrink-0 stroke-current" />
                        {name}
                      </FooterHref>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {copyright && (
          <div className="mt-8 border-t border-border/70 pt-4">
            <p className="text-xs text-foreground/55">{copyright}</p>
          </div>
        )}
      </div>
    </footer>
  ),
);

Footer.displayName = "Footer";
