import { NextAuthOptions } from "next-auth";
import  CredentialsProvider  from "next-auth/providers/credentials";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
    providers : [
        CredentialsProvider({
            name:"credentials",
            credentials:{
                email:{label:"Email",type:"text"},
                password:{label:"Password", type:"password"},
                


            },
            async authorize(credentials){
                
                if(!credentials?.email || !credentials?.password ){
                    throw new Error("Missing email or password");
                }

                try {
                    

                    const user = await prisma.user.findFirst({where:{email: credentials.email}})

                    if(!user){
                        throw new Error("User not Found")
                    }

                    // const isValid = await bcrypt.compare(credentials.password, user.password)
                    
                    // if(!isValid){
                    //     throw new Error("Password is not Correct")
                    // }

                    if( user.password !== credentials.password){
                        throw new Error("Password is incorrect")
                    }

                    return {
                        id: user.id.toString(),
                        email: user.email,
                        name: user.name
                    }

                } catch (error) {
                    throw error
                }
   
                
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