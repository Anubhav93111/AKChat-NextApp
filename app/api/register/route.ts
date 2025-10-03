import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest){
    try{
         const {email, password, name} = await req.json();
         if(!email || !password || !name){
            return NextResponse.json({message:"User details are required", status:500})
         }

         const createdUser = await prisma.user.create({
            data:
             {email, password, name,}})

         return NextResponse.json({ msg: "New user created", user: createdUser }, { status: 201 });    
    } catch(err){
        return NextResponse.json({error: err, status:500})
    }
 

} 