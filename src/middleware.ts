import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware() {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token
    },
    pages: { signIn: "/admin/login" }
  }
);

export const config = {
  matcher: [
    "/admin/dashboard/:path*",
    "/admin/bookings/:path*",
    "/admin/notifications/:path*",
    "/admin/customers/:path*",
    "/admin/services/:path*",
    "/admin/offers/:path*",
    "/admin/coupons/:path*",
    "/admin/gallery/:path*",
    "/admin/reviews/:path*",
    "/admin/reports/:path*",
    "/admin/settings/:path*"
  ]
};
