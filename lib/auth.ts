import { NextAuthOptions } from "next-auth";
import  CredentialsProvider  from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import { loginSchema} from "./validations/login";

export const authOptions: NextAuthOptions = {
    providers : [
        CredentialsProvider({
            name:"credentials",
            credentials:{
                email:{label:"Email",type:"text"},
                password:{label:"Password", type:"password"},
                


            },
           async authorize(credentials) {
  const result = loginSchema.safeParse(credentials);
  if (!result.success) {
    throw new Error("Invalid login input");
  }

  const { email, password } = result.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error("User not found");
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    throw new Error("Password is incorrect");
  }

  return {
    id: user.id.toString(),
    email: user.email,
    name: user.name,
  };
}
        })
    ],
    callbacks: {
        async jwt({token, user}){
            if(user){
                token.id = user.id;
                token.name = user.name; // store name in token
            }
            return token
        },
        async session({ session, token }) {
            
            if(session.user){
               session.user.id = token.id as string;
               session.user.name = token.name as string
            }

            return session
        }
    },
    pages:{
        signIn: "/login",
        error: "/login"
    },
    session:{
        strategy:"jwt",
        maxAge: 30 * 24 * 60 * 60
    },
    secret: process.env.NEXTAUTH_SECRET
}