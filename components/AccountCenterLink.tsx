"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

const ACCOUNT_CENTER_HREF = "/account";
const ACCOUNT_SETUP_HREF = "/account/settings?returnTo=%2Faccount";

export default function AccountCenterLink({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const [href, setHref] = useState(ACCOUNT_SETUP_HREF);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedUserId = localStorage.getItem("poolr_user_id");

    setHref(savedUserId ? ACCOUNT_CENTER_HREF : ACCOUNT_SETUP_HREF);
  }, []);

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
