export { default } from 'next-auth/middleware';

export const config = {
  matcher: [
    '/((?!auth|legal|api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};
