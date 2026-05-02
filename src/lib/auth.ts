import type { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "./prisma"

const useSecureCookies =
    process.env.NEXTAUTH_URL?.startsWith("https://") ?? false
const cookiePrefix = useSecureCookies ? "__Secure-" : ""

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    session: { strategy: "jwt" },
    pages: { signIn: "/login" },
    useSecureCookies,
    // เมื่อ frontend/backend อยู่ต่าง origin (Vercel split deployment) ต้อง SameSite=None
    // เพื่อให้ browser ส่ง cookie ใน cross-origin request ได้
    cookies: {
        sessionToken: {
            name: `${cookiePrefix}next-auth.session-token`,
            options: {
                httpOnly: true,
                sameSite: useSecureCookies ? "none" : "lax",
                path: "/",
                secure: useSecureCookies,
            },
        },
        callbackUrl: {
            name: `${cookiePrefix}next-auth.callback-url`,
            options: {
                httpOnly: true,
                sameSite: useSecureCookies ? "none" : "lax",
                path: "/",
                secure: useSecureCookies,
            },
        },
        csrfToken: {
            name: `${cookiePrefix}next-auth.csrf-token`,
            options: {
                httpOnly: true,
                sameSite: useSecureCookies ? "none" : "lax",
                path: "/",
                secure: useSecureCookies,
            },
        },
    },
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email.toLowerCase() },
                })
                if (!user?.hashedPassword) return null

                const valid = await bcrypt.compare(
                    credentials.password,
                    user.hashedPassword,
                )
                if (!valid) return null

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    image: user.image,
                    role: user.role,
                    accessKey: user.accessKey,
                }
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id
                const u = user as {
                    role?: "admin" | "user"
                    accessKey?: string
                }
                token.role = u.role
                token.accessKey = u.accessKey
            }
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                const u = session.user as {
                    id?: string
                    role?: "admin" | "user"
                    accessKey?: string
                }
                if (token.id) u.id = token.id
                if (token.role) u.role = token.role
                if (token.accessKey) u.accessKey = token.accessKey
            }
            return session
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
}
