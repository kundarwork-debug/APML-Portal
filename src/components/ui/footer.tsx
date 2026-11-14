"use client";

import * as React from "react";
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

export const Footer = React.forwardRef<HTMLElement, FooterProps>(
  ({ className, brand, socialLinks, columns, copyright, ...props }, ref) => (
    <footer ref={ref} className={cn("pt-16 sm:pt-20", className)} {...props}>
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 xl:px-10">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <a href="/" className="text-xl font-semibold tracking-tight text-foreground">
              {brand.name}
            </a>
            <p className="mt-3 max-w-sm text-sm leading-6 text-foreground/60">
              {brand.description}
            </p>
            <p className="mt-4 text-sm font-light text-foreground/55">
              {socialLinks.map((link, index) => (
                <React.Fragment key={link.name}>
                  <a
                    className="transition-colors hover:text-foreground/90"
                    target="_blank"
                    href={link.href}
                    rel="noopener noreferrer"
                  >
                    {link.name}
                  </a>
                  {index < socialLinks.length - 1 && " • "}
                </React.Fragment>
              ))}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-8 lg:justify-items-end">
            {columns.map(({ title, links }) => (
              <div key={title} className="min-w-0">
                <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                <ul className="mt-4 space-y-3">
                  {links.map(({ name, Icon, href }) => (
                    <li key={name}>
                      <a
                        href={href || "#"}
                        className="group inline-flex items-center text-sm text-foreground/60 transition-colors hover:text-foreground/90"
                      >
                        <Icon
                          aria-hidden="true"
                          className="mr-2 h-4 w-4 shrink-0 stroke-foreground/60 transition-colors group-hover:stroke-foreground/90"
                        />
                        {name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {copyright && (
          <div className="mt-16 border-t border-border/70 py-6">
            <p className="text-xs text-foreground/55">{copyright}</p>
          </div>
        )}
      </div>
    </footer>
  ),
);

Footer.displayName = "Footer";
